-- DB-backed OD renewal packages + admin CRUD.
-- Run in Supabase SQL editor after prior OD migrations.

create table if not exists public.od_renewal_packages (
  plan text primary key,
  title text not null,
  price_rm numeric(10, 2) not null default 0 check (price_rm >= 0),
  blurb text not null default '',
  duration_interval interval not null default interval '1 month',
  is_active boolean not null default true,
  sort_order int not null default 0,
  one_time_per_member boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint od_renewal_packages_plan_format_chk check (plan ~ '^[a-z][a-z0-9_]*$')
);

alter table public.od_renewal_packages enable row level security;

insert into public.od_renewal_packages (plan, title, price_rm, blurb, duration_interval, sort_order, one_time_per_member)
values
  ('trial_year', '1 year free trial', 0, 'Complimentary first year for new members', interval '1 year', 0, true),
  ('month', '1 month', 9.90, 'Flexible monthly access', interval '1 month', 10, false),
  ('year', '1 year', 59.00, 'Best value for regular members', interval '1 year', 20, false)
on conflict (plan) do nothing;

-- Relax plan enum checks so admins can add new package keys.
alter table public.od_memberships drop constraint if exists od_memberships_plan_check;
alter table public.od_memberships add constraint od_memberships_plan_check
  check (plan is null or char_length(trim(plan)) > 0);

alter table public.od_membership_renewals drop constraint if exists od_membership_renewals_plan_check;
alter table public.od_membership_renewals add constraint od_membership_renewals_plan_check
  check (char_length(trim(plan)) > 0);

alter table public.od_checkout_sessions drop constraint if exists od_checkout_sessions_plan_chk;
alter table public.od_checkout_sessions add constraint od_checkout_sessions_plan_chk
  check (char_length(trim(plan)) > 0);

create or replace function public.od_renewal_valid_until(p_plan text, p_from timestamptz)
returns timestamptz
language plpgsql
stable
set search_path = public
as $$
declare
  dur interval;
begin
  select duration_interval into dur
  from public.od_renewal_packages
  where plan = p_plan and is_active;

  if dur is null then
    raise exception 'invalid plan';
  end if;

  return p_from + dur;
end;
$$;

create or replace function public.list_od_renewal_packages()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  return coalesce((
    select jsonb_agg(
      jsonb_build_object(
        'plan', p.plan,
        'title', p.title,
        'price_rm', p.price_rm,
        'blurb', p.blurb,
        'duration_label', trim(both from p.duration_interval::text),
        'sort_order', p.sort_order,
        'one_time_per_member', p.one_time_per_member
      )
      order by p.sort_order, p.title
    )
    from public.od_renewal_packages p
    where p.is_active
  ), '[]'::jsonb);
end;
$$;

grant execute on function public.list_od_renewal_packages() to authenticated;
grant execute on function public.list_od_renewal_packages() to anon;

create or replace function public.admin_list_od_renewal_packages()
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
    select jsonb_agg(
      jsonb_build_object(
        'plan', p.plan,
        'title', p.title,
        'price_rm', p.price_rm,
        'blurb', p.blurb,
        'duration_label', trim(both from p.duration_interval::text),
        'is_active', p.is_active,
        'sort_order', p.sort_order,
        'one_time_per_member', p.one_time_per_member,
        'created_at', p.created_at,
        'updated_at', p.updated_at
      )
      order by p.sort_order, p.title
    )
    from public.od_renewal_packages p
  ), '[]'::jsonb);
end;
$$;

grant execute on function public.admin_list_od_renewal_packages() to authenticated;

create or replace function public.admin_create_od_renewal_package(
  p_plan text,
  p_title text,
  p_price_rm numeric,
  p_blurb text,
  p_duration_label text,
  p_is_active boolean,
  p_sort_order int,
  p_one_time_per_member boolean
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_plan text := lower(trim(coalesce(p_plan, '')));
  v_title text := trim(coalesce(p_title, ''));
  v_blurb text := trim(coalesce(p_blurb, ''));
  v_duration_label text := lower(trim(coalesce(p_duration_label, '')));
  v_duration interval;
begin
  if auth.uid() is null or not public.is_od_admin(auth.uid()) then
    raise exception 'not authorized';
  end if;

  if v_plan = '' or v_plan !~ '^[a-z][a-z0-9_]*$' then
    raise exception 'invalid plan key';
  end if;

  if v_title = '' then
    raise exception 'title required';
  end if;

  if v_duration_label not in ('1 hour', '1 month', '1 year') then
    raise exception 'invalid duration';
  end if;

  v_duration := v_duration_label::interval;

  insert into public.od_renewal_packages (
    plan, title, price_rm, blurb, duration_interval, is_active, sort_order, one_time_per_member, updated_at
  ) values (
    v_plan,
    v_title,
    coalesce(p_price_rm, 0),
    v_blurb,
    v_duration,
    coalesce(p_is_active, true),
    coalesce(p_sort_order, 0),
    coalesce(p_one_time_per_member, false),
    now()
  );

  return jsonb_build_object('success', true, 'plan', v_plan);
end;
$$;

grant execute on function public.admin_create_od_renewal_package(text, text, numeric, text, text, boolean, int, boolean) to authenticated;

create or replace function public.admin_update_od_renewal_package(
  p_plan text,
  p_title text,
  p_price_rm numeric,
  p_blurb text,
  p_duration_label text,
  p_is_active boolean,
  p_sort_order int,
  p_one_time_per_member boolean
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_plan text := lower(trim(coalesce(p_plan, '')));
  v_title text := trim(coalesce(p_title, ''));
  v_blurb text := trim(coalesce(p_blurb, ''));
  v_duration_label text := lower(trim(coalesce(p_duration_label, '')));
  v_duration interval;
begin
  if auth.uid() is null or not public.is_od_admin(auth.uid()) then
    raise exception 'not authorized';
  end if;

  if v_plan = '' then
    raise exception 'plan required';
  end if;

  if v_title = '' then
    raise exception 'title required';
  end if;

  if v_duration_label not in ('1 hour', '1 month', '1 year') then
    raise exception 'invalid duration';
  end if;

  if not exists (select 1 from public.od_renewal_packages where plan = v_plan) then
    raise exception 'package not found';
  end if;

  v_duration := v_duration_label::interval;

  update public.od_renewal_packages
  set
    title = v_title,
    price_rm = coalesce(p_price_rm, 0),
    blurb = v_blurb,
    duration_interval = v_duration,
    is_active = coalesce(p_is_active, true),
    sort_order = coalesce(p_sort_order, 0),
    one_time_per_member = coalesce(p_one_time_per_member, false),
    updated_at = now()
  where plan = v_plan;

  return jsonb_build_object('success', true, 'plan', v_plan);
end;
$$;

grant execute on function public.admin_update_od_renewal_package(text, text, numeric, text, text, boolean, int, boolean) to authenticated;

create or replace function public.admin_delete_od_renewal_package(p_plan text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_plan text := lower(trim(coalesce(p_plan, '')));
begin
  if auth.uid() is null or not public.is_od_admin(auth.uid()) then
    raise exception 'not authorized';
  end if;

  if v_plan = '' then
    raise exception 'plan required';
  end if;

  if exists (select 1 from public.od_membership_renewals where plan = v_plan) then
    raise exception 'cannot delete package that has renewal history; deactivate it instead';
  end if;

  delete from public.od_renewal_packages where plan = v_plan;

  if not found then
    raise exception 'package not found';
  end if;

  return jsonb_build_object('success', true);
end;
$$;

grant execute on function public.admin_delete_od_renewal_package(text) to authenticated;

create or replace function public.member_self_renew_od_membership(p_plan text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  v_plan text := lower(trim(coalesce(p_plan, '')));
  v_from timestamptz;
  v_until timestamptz;
  cur_until timestamptz;
  pkg public.od_renewal_packages%rowtype;
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;

  if not exists (select 1 from public.member_profiles where id = uid) then
    raise exception 'not a member';
  end if;

  select * into pkg
  from public.od_renewal_packages
  where plan = v_plan and is_active;

  if not found then
    raise exception 'invalid plan';
  end if;

  if pkg.one_time_per_member then
    if exists (
      select 1
      from public.od_membership_renewals
      where member_id = uid and plan = v_plan
    ) then
      raise exception 'package already used';
    end if;
  end if;

  select valid_until into cur_until
  from public.od_memberships
  where member_id = uid;

  if cur_until is not null and cur_until > now() then
    v_from := cur_until;
  else
    v_from := now();
  end if;

  v_until := public.od_renewal_valid_until(v_plan, v_from);

  insert into public.od_membership_renewals (member_id, plan, valid_from, valid_until, renewed_by)
  values (uid, v_plan, v_from, v_until, uid);

  insert into public.od_memberships (member_id, status, plan, valid_from, valid_until, updated_at)
  values (uid, 'active', v_plan, v_from, v_until, now())
  on conflict (member_id) do update
  set status = 'active',
      plan = excluded.plan,
      valid_from = excluded.valid_from,
      valid_until = excluded.valid_until,
      updated_at = now();

  return jsonb_build_object('success', true, 'valid_from', v_from, 'valid_until', v_until);
end;
$$;

create or replace function public.admin_renew_od_membership(p_member_id uuid, p_plan text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_plan text := lower(trim(coalesce(p_plan, '')));
  v_from timestamptz;
  v_until timestamptz;
  cur_until timestamptz;
begin
  if auth.uid() is null or not public.is_od_admin(auth.uid()) then
    raise exception 'not authorized';
  end if;

  if not exists (
    select 1 from public.od_renewal_packages where plan = v_plan and is_active
  ) then
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

  v_until := public.od_renewal_valid_until(v_plan, v_from);

  insert into public.od_membership_renewals (member_id, plan, valid_from, valid_until, renewed_by)
  values (p_member_id, v_plan, v_from, v_until, auth.uid());

  insert into public.od_memberships (member_id, status, plan, valid_from, valid_until, updated_at)
  values (p_member_id, 'active', v_plan, v_from, v_until, now())
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
  select * into sess
  from public.od_checkout_sessions
  where order_number = p_order_number
  for update;

  if not found then
    return jsonb_build_object('success', false, 'error', 'session_not_found');
  end if;

  if sess.completed_at is not null then
    return jsonb_build_object('success', true, 'already_completed', true);
  end if;

  if not exists (select 1 from public.member_profiles where id = sess.member_id) then
    return jsonb_build_object('success', false, 'error', 'not_a_member');
  end if;

  if not exists (
    select 1 from public.od_renewal_packages where plan = sess.plan and is_active
  ) then
    return jsonb_build_object('success', false, 'error', 'invalid_plan');
  end if;

  select valid_until into cur_until
  from public.od_memberships
  where member_id = sess.member_id;

  if cur_until is not null and cur_until > now() then
    v_from := cur_until;
  else
    v_from := now();
  end if;

  v_until := public.od_renewal_valid_until(sess.plan, v_from);

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

revoke all on function public.service_complete_od_checkout(text) from public;
grant execute on function public.service_complete_od_checkout(text) to service_role;
