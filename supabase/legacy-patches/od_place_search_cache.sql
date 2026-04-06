-- Google Places Text Search cache for OD listing area lookup.
-- Cache is keyed by region + normalized query and expires after a configurable TTL.

create table if not exists public.od_place_search_cache (
  query_key text primary key,
  query text not null,
  region text not null default 'my',
  payload jsonb not null,
  expires_at timestamptz not null,
  updated_at timestamptz not null default now()
);

create index if not exists od_place_search_cache_expires_idx
  on public.od_place_search_cache (expires_at);

alter table public.od_place_search_cache enable row level security;

create or replace function public.get_od_place_search_cache(
  p_query text,
  p_region text default 'my'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  norm_query text;
  norm_region text;
  k text;
  cached jsonb;
begin
  if auth.uid() is null then
    return jsonb_build_object('success', false, 'error', 'not_authenticated');
  end if;
  norm_query := lower(trim(coalesce(p_query, '')));
  norm_region := lower(trim(coalesce(p_region, 'my')));
  if norm_query = '' then
    return jsonb_build_object('success', false, 'error', 'invalid_query');
  end if;
  k := norm_region || '|' || norm_query;

  select c.payload
    into cached
  from public.od_place_search_cache c
  where c.query_key = k
    and c.expires_at > now();

  return jsonb_build_object('success', true, 'payload', coalesce(cached, '[]'::jsonb));
end;
$$;

create or replace function public.upsert_od_place_search_cache(
  p_query text,
  p_region text,
  p_payload jsonb,
  p_ttl_days int default 30
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  norm_query text;
  norm_region text;
  ttl_days int;
  k text;
begin
  if auth.uid() is null then
    return jsonb_build_object('success', false, 'error', 'not_authenticated');
  end if;
  norm_query := lower(trim(coalesce(p_query, '')));
  norm_region := lower(trim(coalesce(p_region, 'my')));
  if norm_query = '' then
    return jsonb_build_object('success', false, 'error', 'invalid_query');
  end if;
  if p_payload is null or jsonb_typeof(p_payload) <> 'array' then
    return jsonb_build_object('success', false, 'error', 'invalid_payload');
  end if;

  ttl_days := greatest(1, least(coalesce(p_ttl_days, 30), 90));
  k := norm_region || '|' || norm_query;

  insert into public.od_place_search_cache as c (
    query_key,
    query,
    region,
    payload,
    expires_at,
    updated_at
  )
  values (
    k,
    norm_query,
    norm_region,
    p_payload,
    now() + make_interval(days => ttl_days),
    now()
  )
  on conflict (query_key) do update
    set payload = excluded.payload,
        expires_at = excluded.expires_at,
        updated_at = now();

  return jsonb_build_object('success', true);
end;
$$;

grant execute on function public.get_od_place_search_cache(text, text) to authenticated;
grant execute on function public.upsert_od_place_search_cache(text, text, jsonb, int) to authenticated;
