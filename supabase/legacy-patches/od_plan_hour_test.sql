-- Add `hour` plan: 1-hour test membership (align with app OD_RENEWAL_PACKAGES · RM5).
-- Run in Supabase SQL editor after prior OD migrations.

alter table public.od_memberships drop constraint if exists od_memberships_plan_check;
alter table public.od_memberships add constraint od_memberships_plan_check
  check (plan is null or plan in ('month', 'year', 'hour'));

alter table public.od_membership_renewals drop constraint if exists od_membership_renewals_plan_check;
alter table public.od_membership_renewals add constraint od_membership_renewals_plan_check
  check (plan in ('month', 'year', 'hour'));

alter table public.od_checkout_sessions drop constraint if exists od_checkout_sessions_plan_chk;
alter table public.od_checkout_sessions add constraint od_checkout_sessions_plan_chk
  check (plan in ('month', 'year', 'hour'));

create or replace function public.admin_renew_od_membership(p_member_id uuid, p_plan text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_from timestamptz;
  v_until timestamptz;
  cur_until timestamptz;
begin
  if auth.uid() is null or not public.is_od_admin(auth.uid()) then
    raise exception 'not authorized';
  end if;

  if p_plan is null or p_plan not in ('month', 'year', 'hour') then
    raise exception 'invalid plan';
  end if;

  if not exists (select 1 from public.member_profiles where id = p_member_id) then
    raise exception 'member not found';
  end if;

  select valid_until into cur_until
  from public.od_memberships
  where member_id = p_member_id;

  if cur_until is not null and cur_until > now() then
    v_from := cur_until;
  else
    v_from := now();
  end if;

  if p_plan = 'month' then
    v_until := v_from + interval '1 month';
  elsif p_plan = 'year' then
    v_until := v_from + interval '1 year';
  else
    v_until := v_from + interval '1 hour';
  end if;

  insert into public.od_membership_renewals (member_id, plan, valid_from, valid_until, renewed_by)
  values (p_member_id, p_plan, v_from, v_until, auth.uid());

  insert into public.od_memberships (member_id, status, plan, valid_from, valid_until, updated_at)
  values (p_member_id, 'active', p_plan, v_from, v_until, now())
  on conflict (member_id) do update
  set status = 'active',
      plan = excluded.plan,
      valid_from = excluded.valid_from,
      valid_until = excluded.valid_until,
      updated_at = now();

  return jsonb_build_object('success', true, 'valid_from', v_from, 'valid_until', v_until);
end;
$$;

create or replace function public.member_self_renew_od_membership(p_plan text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  v_from timestamptz;
  v_until timestamptz;
  cur_until timestamptz;
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;

  if not exists (select 1 from public.member_profiles where id = uid) then
    raise exception 'not a member';
  end if;

  if p_plan is null or p_plan not in ('month', 'year', 'hour') then
    raise exception 'invalid plan';
  end if;

  select valid_until into cur_until
  from public.od_memberships
  where member_id = uid;

  if cur_until is not null and cur_until > now() then
    v_from := cur_until;
  else
    v_from := now();
  end if;

  if p_plan = 'month' then
    v_until := v_from + interval '1 month';
  elsif p_plan = 'year' then
    v_until := v_from + interval '1 year';
  else
    v_until := v_from + interval '1 hour';
  end if;

  insert into public.od_membership_renewals (member_id, plan, valid_from, valid_until, renewed_by)
  values (uid, p_plan, v_from, v_until, uid);

  insert into public.od_memberships (member_id, status, plan, valid_from, valid_until, updated_at)
  values (uid, 'active', p_plan, v_from, v_until, now())
  on conflict (member_id) do update
  set status = 'active',
      plan = excluded.plan,
      valid_from = excluded.valid_from,
      valid_until = excluded.valid_until,
      updated_at = now();

  return jsonb_build_object('success', true, 'valid_from', v_from, 'valid_until', v_until);
end;
$$;

create or replace function public.service_complete_od_checkout(p_order_number text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  sess public.od_checkout_sessions%rowtype;
  v_from timestamptz;
  v_until timestamptz;
  cur_until timestamptz;
begin
  if p_order_number is null or length(trim(p_order_number)) = 0 then
    return jsonb_build_object('success', false, 'error', 'invalid_order');
  end if;

  select * into sess
  from public.od_checkout_sessions
  where order_number = p_order_number
  for update;

  if not found then
    return jsonb_build_object('success', false, 'error', 'session_not_found');
  end if;

  if sess.completed_at is not null then
    return jsonb_build_object('success', true, 'idempotent', true);
  end if;

  if not exists (select 1 from public.member_profiles where id = sess.member_id) then
    return jsonb_build_object('success', false, 'error', 'not_a_member');
  end if;

  select valid_until into cur_until
  from public.od_memberships
  where member_id = sess.member_id;

  if cur_until is not null and cur_until > now() then
    v_from := cur_until;
  else
    v_from := now();
  end if;

  if sess.plan = 'month' then
    v_until := v_from + interval '1 month';
  elsif sess.plan = 'year' then
    v_until := v_from + interval '1 year';
  else
    v_until := v_from + interval '1 hour';
  end if;

  insert into public.od_membership_renewals (member_id, plan, valid_from, valid_until, renewed_by)
  values (sess.member_id, sess.plan, v_from, v_until, sess.member_id);

  insert into public.od_memberships (member_id, status, plan, valid_from, valid_until, updated_at)
  values (sess.member_id, 'active', sess.plan, v_from, v_until, now())
  on conflict (member_id) do update
  set status = 'active',
      plan = excluded.plan,
      valid_from = excluded.valid_from,
      valid_until = excluded.valid_until,
      updated_at = now();

  update public.od_checkout_sessions
  set completed_at = now()
  where order_number = p_order_number;

  return jsonb_build_object(
    'success', true,
    'valid_from', v_from,
    'valid_until', v_until
  );
end;
$$;
