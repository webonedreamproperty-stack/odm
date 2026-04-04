-- OD membership renewal checkout sessions (Bayarcash). Apply via Supabase SQL editor if not merged into migration.sql yet.
-- Server uses SUPABASE_SERVICE_ROLE_KEY to insert rows and call service_complete_od_checkout.

create table if not exists public.od_checkout_sessions (
  order_number text primary key,
  member_id uuid not null references auth.users (id) on delete cascade,
  plan text not null,
  amount_rm numeric(12, 2) not null,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  constraint od_checkout_sessions_plan_chk check (plan in ('month', 'year'))
);

create index if not exists idx_od_checkout_sessions_member
  on public.od_checkout_sessions (member_id, created_at desc);

alter table public.od_checkout_sessions enable row level security;

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
  else
    v_until := v_from + interval '1 year';
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

revoke all on function public.service_complete_od_checkout(text) from public;
grant execute on function public.service_complete_od_checkout(text) to service_role;
