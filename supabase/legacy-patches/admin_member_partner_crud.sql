-- Admin CRUD helpers for OD members and partner accounts.
-- Run in Supabase SQL Editor.

create or replace function public.admin_create_member_account(
  p_email text,
  p_password text,
  p_display_name text,
  p_country text default 'MY'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  new_uid uuid := gen_random_uuid();
  v_email text := lower(trim(coalesce(p_email, '')));
  v_password text := coalesce(p_password, '');
begin
  if auth.uid() is null or not public.is_od_admin(auth.uid()) then
    raise exception 'not authorized';
  end if;

  if v_email = '' then
    raise exception 'email required';
  end if;

  if length(v_password) < 6 then
    raise exception 'password must be at least 6 characters';
  end if;

  if exists (select 1 from auth.users where email = v_email) then
    raise exception 'email already in use';
  end if;

  insert into auth.users (
    id, instance_id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_user_meta_data, raw_app_meta_data,
    created_at, updated_at, is_sso_user
  ) values (
    new_uid,
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    v_email,
    crypt(v_password, gen_salt('bf')),
    now(),
    jsonb_build_object(
      'role', 'member',
      'display_name', trim(coalesce(p_display_name, '')),
      'country', upper(trim(coalesce(p_country, 'MY')))
    ),
    jsonb_build_object('provider', 'email', 'providers', array_to_json(array['email'])),
    now(),
    now(),
    false
  );

  insert into auth.identities (
    id, user_id, identity_data, provider, provider_id,
    last_sign_in_at, created_at, updated_at
  ) values (
    new_uid,
    new_uid,
    jsonb_build_object('sub', new_uid::text, 'email', v_email),
    'email',
    new_uid::text,
    now(),
    now(),
    now()
  );

  return jsonb_build_object('success', true, 'user_id', new_uid);
end;
$$;

create or replace function public.admin_update_member_account(
  p_member_id uuid,
  p_display_name text,
  p_country text,
  p_public_username text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not public.is_od_admin(auth.uid()) then
    raise exception 'not authorized';
  end if;

  update public.member_profiles
  set
    display_name = trim(coalesce(p_display_name, display_name)),
    country = upper(trim(coalesce(p_country, country))),
    public_username = case
      when p_public_username is null or trim(p_public_username) = '' then null
      else lower(trim(p_public_username))
    end
  where id = p_member_id;

  if not found then
    raise exception 'member not found';
  end if;

  return jsonb_build_object('success', true);
end;
$$;

create or replace function public.admin_delete_member_account(
  p_member_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not public.is_od_admin(auth.uid()) then
    raise exception 'not authorized';
  end if;

  if not exists (select 1 from public.member_profiles where id = p_member_id) then
    raise exception 'member not found';
  end if;

  delete from auth.users where id = p_member_id;
  return jsonb_build_object('success', true);
end;
$$;

create or replace function public.admin_create_partner_account(
  p_email text,
  p_password text,
  p_business_name text,
  p_slug text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  new_uid uuid := gen_random_uuid();
  v_email text := lower(trim(coalesce(p_email, '')));
  v_password text := coalesce(p_password, '');
  v_slug text := nullif(lower(trim(coalesce(p_slug, ''))), '');
begin
  if auth.uid() is null or not public.is_od_admin(auth.uid()) then
    raise exception 'not authorized';
  end if;

  if v_email = '' then
    raise exception 'email required';
  end if;

  if length(v_password) < 6 then
    raise exception 'password must be at least 6 characters';
  end if;

  if trim(coalesce(p_business_name, '')) = '' then
    raise exception 'business name required';
  end if;

  if exists (select 1 from auth.users where email = v_email) then
    raise exception 'email already in use';
  end if;

  if v_slug is not null and exists (
    select 1 from public.profiles where slug = v_slug and role = 'owner'
  ) then
    raise exception 'slug already in use';
  end if;

  insert into auth.users (
    id, instance_id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_user_meta_data, raw_app_meta_data,
    created_at, updated_at, is_sso_user
  ) values (
    new_uid,
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    v_email,
    crypt(v_password, gen_salt('bf')),
    now(),
    jsonb_build_object(
      'role', 'owner',
      'business_name', trim(coalesce(p_business_name, '')),
      'slug', v_slug
    ),
    jsonb_build_object('provider', 'email', 'providers', array_to_json(array['email'])),
    now(),
    now(),
    false
  );

  insert into auth.identities (
    id, user_id, identity_data, provider, provider_id,
    last_sign_in_at, created_at, updated_at
  ) values (
    new_uid,
    new_uid,
    jsonb_build_object('sub', new_uid::text, 'email', v_email),
    'email',
    new_uid::text,
    now(),
    now(),
    now()
  );

  return jsonb_build_object('success', true, 'user_id', new_uid);
end;
$$;

-- Replace legacy 6-arg overload when upgrading (Postgres keeps both signatures otherwise).
drop function if exists public.admin_update_partner_account(uuid, text, text, text, text, text);

create or replace function public.admin_update_partner_account(
  p_partner_id uuid,
  p_business_name text,
  p_slug text,
  p_account_status text,
  p_access_status text,
  p_tier text,
  p_od_listing_area text default null,
  p_od_listing_lat double precision default null,
  p_od_listing_lng double precision default null,
  p_od_maps_url text default null,
  p_od_google_place_id text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_slug text := nullif(lower(trim(coalesce(p_slug, ''))), '');
begin
  if auth.uid() is null or not public.is_od_admin(auth.uid()) then
    raise exception 'not authorized';
  end if;

  update public.profiles
  set
    business_name = trim(coalesce(p_business_name, business_name)),
    slug = v_slug,
    status = coalesce(p_account_status, status),
    access = coalesce(p_access_status, access),
    tier = coalesce(p_tier, tier),
    od_listing_area = nullif(trim(coalesce(p_od_listing_area, '')), ''),
    od_listing_lat = p_od_listing_lat,
    od_listing_lng = p_od_listing_lng,
    od_maps_url = nullif(trim(coalesce(p_od_maps_url, '')), ''),
    od_google_place_id = nullif(trim(coalesce(p_od_google_place_id, '')), '')
  where id = p_partner_id
    and role = 'owner';

  if not found then
    raise exception 'partner not found';
  end if;

  return jsonb_build_object('success', true);
end;
$$;

create or replace function public.admin_delete_partner_account(
  p_partner_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not public.is_od_admin(auth.uid()) then
    raise exception 'not authorized';
  end if;

  if not exists (select 1 from public.profiles where id = p_partner_id and role = 'owner') then
    raise exception 'partner not found';
  end if;

  delete from auth.users where id = p_partner_id;
  return jsonb_build_object('success', true);
end;
$$;

grant execute on function public.admin_create_member_account(text, text, text, text) to authenticated;
grant execute on function public.admin_update_member_account(uuid, text, text, text) to authenticated;
grant execute on function public.admin_delete_member_account(uuid) to authenticated;
grant execute on function public.admin_create_partner_account(text, text, text, text) to authenticated;
grant execute on function public.admin_update_partner_account(uuid, text, text, text, text, text, text, double precision, double precision, text, text) to authenticated;
grant execute on function public.admin_delete_partner_account(uuid) to authenticated;

create or replace function public.admin_list_od_memberships()
returns table (
  member_id uuid,
  member_code text,
  email text,
  display_name text,
  status text,
  plan text,
  valid_from timestamptz,
  valid_until timestamptz,
  created_at timestamptz,
  updated_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    mp.id as member_id,
    mp.member_code,
    coalesce(u.email, '') as email,
    mp.display_name,
    om.status,
    om.plan,
    om.valid_from,
    om.valid_until,
    mp.created_at,
    om.updated_at
  from public.od_memberships om
  inner join public.member_profiles mp on mp.id = om.member_id
  left join auth.users u on u.id = om.member_id
  where auth.uid() is not null
    and public.is_od_admin(auth.uid())
  order by om.updated_at desc nulls last, mp.created_at desc nulls last;
$$;

create or replace function public.admin_create_od_membership(
  p_member_id uuid,
  p_status text,
  p_plan text,
  p_valid_from timestamptz,
  p_valid_until timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status text := lower(trim(coalesce(p_status, 'active')));
  v_plan text := lower(trim(coalesce(p_plan, 'month')));
  v_from timestamptz := coalesce(p_valid_from, now());
  v_until timestamptz := p_valid_until;
begin
  if auth.uid() is null or not public.is_od_admin(auth.uid()) then
    raise exception 'not authorized';
  end if;

  if not exists (select 1 from public.member_profiles where id = p_member_id) then
    raise exception 'member not found';
  end if;

  if v_until is null or v_until <= v_from then
    raise exception 'valid_until must be later than valid_from';
  end if;

  insert into public.od_memberships (
    member_id, status, plan, valid_from, valid_until, updated_at
  ) values (
    p_member_id, v_status, v_plan, v_from, v_until, now()
  )
  on conflict (member_id)
  do update set
    status = excluded.status,
    plan = excluded.plan,
    valid_from = excluded.valid_from,
    valid_until = excluded.valid_until,
    updated_at = now();

  return jsonb_build_object('success', true);
end;
$$;

create or replace function public.admin_update_od_membership(
  p_member_id uuid,
  p_status text,
  p_plan text,
  p_valid_from timestamptz,
  p_valid_until timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status text := lower(trim(coalesce(p_status, 'active')));
  v_plan text := lower(trim(coalesce(p_plan, 'month')));
  v_from timestamptz := coalesce(p_valid_from, now());
  v_until timestamptz := p_valid_until;
begin
  if auth.uid() is null or not public.is_od_admin(auth.uid()) then
    raise exception 'not authorized';
  end if;

  if v_until is null or v_until <= v_from then
    raise exception 'valid_until must be later than valid_from';
  end if;

  update public.od_memberships
  set
    status = v_status,
    plan = v_plan,
    valid_from = v_from,
    valid_until = v_until,
    updated_at = now()
  where member_id = p_member_id;

  if not found then
    raise exception 'membership not found';
  end if;

  return jsonb_build_object('success', true);
end;
$$;

create or replace function public.admin_delete_od_membership(
  p_member_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not public.is_od_admin(auth.uid()) then
    raise exception 'not authorized';
  end if;

  delete from public.od_memberships
  where member_id = p_member_id;

  if not found then
    raise exception 'membership not found';
  end if;

  return jsonb_build_object('success', true);
end;
$$;

grant execute on function public.admin_list_od_memberships() to authenticated;
grant execute on function public.admin_create_od_membership(uuid, text, text, timestamptz, timestamptz) to authenticated;
grant execute on function public.admin_update_od_membership(uuid, text, text, timestamptz, timestamptz) to authenticated;
grant execute on function public.admin_delete_od_membership(uuid) to authenticated;

