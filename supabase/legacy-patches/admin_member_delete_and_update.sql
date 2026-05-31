-- Fix admin member delete (renewed_by FK) and extend admin member update (email, phone).
-- Run in Supabase SQL editor.

create or replace function public.admin_list_od_members()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not public.is_od_admin(auth.uid()) then
    raise exception 'not authorized';
  end if;

  return coalesce((
    select jsonb_agg(row_to_json(t) order by t.created_at desc)
    from (
      select
        mp.id,
        mp.email,
        mp.display_name,
        mp.member_code,
        mp.public_username,
        mp.country,
        mp.phone_no,
        mp.created_at,
        om.status as membership_status,
        om.plan as membership_plan,
        om.valid_from,
        om.valid_until
      from public.member_profiles mp
      left join public.od_memberships om on om.member_id = mp.id
    ) t
  ), '[]'::jsonb);
end;
$$;

grant execute on function public.admin_list_od_members() to authenticated;

drop function if exists public.admin_update_member_account(uuid, text, text, text);

create or replace function public.admin_update_member_account(
  p_member_id uuid,
  p_display_name text,
  p_country text,
  p_public_username text default null,
  p_email text default null,
  p_phone_no text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text;
  v_phone_digits text;
  v_phone_numeric numeric;
begin
  if auth.uid() is null or not public.is_od_admin(auth.uid()) then
    raise exception 'not authorized';
  end if;

  if not exists (select 1 from public.member_profiles where id = p_member_id) then
    raise exception 'member not found';
  end if;

  if p_email is not null then
    v_email := nullif(lower(trim(p_email)), '');
    if v_email is null or v_email !~ '^[^@]+@[^@]+\.[^@]+$' then
      raise exception 'invalid email';
    end if;
    if exists (select 1 from auth.users where email = v_email and id <> p_member_id) then
      raise exception 'email already in use';
    end if;

    update auth.users
    set
      email = v_email,
      raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object('email', v_email),
      updated_at = now()
    where id = p_member_id;

    update auth.identities
    set
      identity_data = coalesce(identity_data, '{}'::jsonb) || jsonb_build_object('email', v_email),
      updated_at = now()
    where user_id = p_member_id and provider = 'email';
  end if;

  if p_phone_no is not null then
    v_phone_digits := regexp_replace(trim(p_phone_no), '\D', '', 'g');
    if v_phone_digits = '' then
      v_phone_numeric := null;
    else
      begin
        v_phone_numeric := v_phone_digits::numeric;
      exception when others then
        raise exception 'invalid phone number';
      end;
      if exists (
        select 1 from public.member_profiles
        where phone_no = v_phone_numeric and id <> p_member_id
      ) then
        raise exception 'phone number already in use';
      end if;
    end if;
  end if;

  update public.member_profiles
  set
    display_name = trim(coalesce(p_display_name, display_name)),
    country = upper(trim(coalesce(p_country, country))),
    public_username = case
      when p_public_username is null or trim(p_public_username) = '' then null
      else lower(trim(p_public_username))
    end,
    email = case when p_email is not null then v_email else email end,
    phone_no = case when p_phone_no is not null then v_phone_numeric else phone_no end,
    phone_pending_msisdn = case when p_phone_no is not null then null else phone_pending_msisdn end,
    phone_tac_hash = case when p_phone_no is not null then null else phone_tac_hash end,
    phone_tac_expires_at = case when p_phone_no is not null then null else phone_tac_expires_at end
  where id = p_member_id;

  return jsonb_build_object('success', true);
end;
$$;

grant execute on function public.admin_update_member_account(uuid, text, text, text, text, text) to authenticated;

create or replace function public.admin_delete_member_account(p_member_id uuid)
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

  delete from public.od_membership_renewals
  where member_id = p_member_id or renewed_by = p_member_id;

  delete from public.od_memberships where member_id = p_member_id;
  delete from public.od_checkout_sessions where member_id = p_member_id;

  delete from auth.users where id = p_member_id;

  return jsonb_build_object('success', true);
end;
$$;

grant execute on function public.admin_delete_member_account(uuid) to authenticated;
