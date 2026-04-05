-- Public profile URLs: /:handle for vendors (profiles.slug) and members (member_profiles.public_username).

alter table public.member_profiles add column if not exists public_username text;

create unique index if not exists idx_member_profiles_public_username_lower
  on public.member_profiles (lower(trim(public_username)))
  where public_username is not null and trim(public_username) <> '';

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
    p.od_directory_visible
  into prof
  from public.profiles p
  where p.role = 'owner'
    and p.slug is not null
    and trim(p.slug) <> ''
    and lower(trim(p.slug)) = h
  limit 1;

  if found then
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
      'directory_visible', prof.od_directory_visible
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

create or replace function public.set_member_public_username(p_username text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  norm text;
begin
  if uid is null then
    return jsonb_build_object('success', false, 'error', 'not_authenticated');
  end if;

  if not exists (select 1 from public.member_profiles where id = uid) then
    return jsonb_build_object('success', false, 'error', 'not_member');
  end if;

  if p_username is null or trim(p_username) = '' then
    update public.member_profiles set public_username = null where id = uid;
    return jsonb_build_object('success', true);
  end if;

  norm := lower(trim(p_username));

  if norm !~ '^[a-z0-9][a-z0-9_-]{1,61}$' then
    return jsonb_build_object('success', false, 'error', 'invalid_format');
  end if;

  if exists (
    select 1 from public.profiles
    where role = 'owner' and slug is not null and lower(trim(slug)) = norm
  ) then
    return jsonb_build_object('success', false, 'error', 'taken');
  end if;

  if exists (
    select 1 from public.member_profiles
    where id <> uid and public_username is not null and lower(trim(public_username)) = norm
  ) then
    return jsonb_build_object('success', false, 'error', 'taken');
  end if;

  update public.member_profiles set public_username = norm where id = uid;
  return jsonb_build_object('success', true);
end;
$$;

grant execute on function public.set_member_public_username(text) to authenticated;
