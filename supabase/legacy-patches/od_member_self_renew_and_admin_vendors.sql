-- Apply on existing projects that already ran migration before these features.
-- Safe to re-run.

drop policy if exists "OD admins read all profiles" on public.profiles;
create policy "OD admins read all profiles"
  on public.profiles for select
  using (public.is_od_admin((select auth.uid())));

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

create or replace function public.admin_list_vendor_accounts()
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
        p.id,
        p.business_name,
        p.email,
        p.slug,
        p.role,
        p.status as account_status,
        p.access as access_status,
        p.tier,
        p.tier_expires_at,
        p.created_at,
        (
          select count(*)::int
          from public.profiles s
          where s.owner_id = p.id and s.role = 'staff'
        ) as staff_count
      from public.profiles p
      where p.role = 'owner'
    ) t
  ), '[]'::jsonb);
end;
$$;

grant execute on function public.member_self_renew_od_membership(text) to authenticated;
grant execute on function public.admin_list_vendor_accounts() to authenticated;
