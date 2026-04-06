-- Google Place Details cache for public vendor profile (/slug) cards.
-- Run after profiles + get_public_handle_page exist.

alter table public.profiles add column if not exists od_google_place_id text;

create table if not exists public.od_place_details_cache (
  place_id text primary key,
  payload jsonb not null,
  expires_at timestamptz not null,
  updated_at timestamptz not null default now()
);

create index if not exists od_place_details_cache_expires_idx
  on public.od_place_details_cache (expires_at);

alter table public.od_place_details_cache enable row level security;

create or replace function public.upsert_od_place_details_cache(
  p_place_id text,
  p_payload jsonb,
  p_ttl_days int default 30
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  pid text;
  ttl_days int;
begin
  if auth.uid() is null then
    return jsonb_build_object('success', false, 'error', 'not_authenticated');
  end if;
  pid := trim(coalesce(p_place_id, ''));
  if pid = '' then
    return jsonb_build_object('success', false, 'error', 'invalid_place_id');
  end if;
  if p_payload is null or jsonb_typeof(p_payload) <> 'object' then
    return jsonb_build_object('success', false, 'error', 'invalid_payload');
  end if;
  ttl_days := greatest(1, least(coalesce(p_ttl_days, 30), 90));

  insert into public.od_place_details_cache as c (place_id, payload, expires_at, updated_at)
  values (pid, p_payload, now() + make_interval(days => ttl_days), now())
  on conflict (place_id) do update
    set payload = excluded.payload,
        expires_at = excluded.expires_at,
        updated_at = now();

  return jsonb_build_object('success', true);
end;
$$;

grant execute on function public.upsert_od_place_details_cache(text, jsonb, int) to authenticated;

create or replace function public.get_public_handle_page(p_handle text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  h text := lower(trim(p_handle));
  prof record;
  m_display text;
  m_user text;
  m_status text;
  m_from timestamptz;
  m_until timestamptz;
  m_active boolean;
  place_payload jsonb;
begin
  if p_handle is null or length(trim(p_handle)) < 2 or length(trim(p_handle)) > 63 then
    return jsonb_build_object('error', 'invalid_handle');
  end if;

  select
    p.slug,
    p.business_name,
    p.od_listing_area,
    p.od_discount_summary,
    p.od_maps_url,
    p.od_logo_url,
    p.od_shop_photo_url,
    p.od_business_category,
    p.od_directory_visible,
    p.od_google_place_id
  into prof
  from public.profiles p
  where p.role = 'owner'
    and p.slug is not null
    and trim(p.slug) <> ''
    and lower(trim(p.slug)) = h
  limit 1;

  if found then
    place_payload := null;
    if prof.od_google_place_id is not null and trim(prof.od_google_place_id) <> '' then
      select c.payload into place_payload
      from public.od_place_details_cache c
      where c.place_id = trim(prof.od_google_place_id)
        and c.expires_at > now();
    end if;

    return jsonb_build_object(
      'kind', 'vendor',
      'slug', prof.slug,
      'business_name', prof.business_name,
      'listing_area', nullif(trim(prof.od_listing_area), ''),
      'discount_summary', nullif(trim(prof.od_discount_summary), ''),
      'maps_url', nullif(trim(prof.od_maps_url), ''),
      'logo_url', nullif(trim(prof.od_logo_url), ''),
      'shop_photo_url', nullif(trim(prof.od_shop_photo_url), ''),
      'business_category', nullif(trim(prof.od_business_category), ''),
      'directory_visible', prof.od_directory_visible,
      'google_place_id', nullif(trim(prof.od_google_place_id), ''),
      'place_details', place_payload
    );
  end if;

  select mp.display_name, mp.public_username, om.status, om.valid_from, om.valid_until
  into m_display, m_user, m_status, m_from, m_until
  from public.member_profiles mp
  left join public.od_memberships om on om.member_id = mp.id
  where mp.public_username is not null
    and trim(mp.public_username) <> ''
    and lower(trim(mp.public_username)) = h
  limit 1;

  if found then
    m_active :=
      m_status = 'active'
      and m_until is not null
      and m_until >= now()
      and (m_from is null or m_from <= now());

    return jsonb_build_object(
      'kind', 'member',
      'username', m_user,
      'display_name', coalesce(nullif(trim(m_display), ''), 'OD Member'),
      'membership_active', m_active
    );
  end if;

  return jsonb_build_object('error', 'not_found');
end;
$$;

grant execute on function public.get_public_handle_page(text) to anon;
grant execute on function public.get_public_handle_page(text) to authenticated;
