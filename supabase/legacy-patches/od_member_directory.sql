-- Run if your project predates the OD member directory migration.

alter table public.profiles add column if not exists od_directory_visible boolean not null default true;
alter table public.profiles add column if not exists od_discount_summary text not null default '';
alter table public.profiles add column if not exists od_listing_area text;

create table if not exists public.od_shop_services (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  description text not null default '',
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_od_shop_services_owner on public.od_shop_services(owner_id);

alter table public.od_shop_services enable row level security;

drop policy if exists "Owners manage own od shop services" on public.od_shop_services;
create policy "Owners manage own od shop services"
  on public.od_shop_services for all
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

drop policy if exists "OD admins read all od shop services" on public.od_shop_services;
create policy "OD admins read all od shop services"
  on public.od_shop_services for select
  using (public.is_od_admin((select auth.uid())));

create or replace function public.get_od_member_directory()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    return jsonb_build_object('error', 'not_authenticated');
  end if;

  if not exists (
    select 1
    from public.member_profiles mp
    inner join public.od_memberships om on om.member_id = mp.id
    where mp.id = uid
      and om.status = 'active'
      and om.valid_until is not null
      and om.valid_until >= now()
      and (om.valid_from is null or om.valid_from <= now())
  ) then
    return jsonb_build_object('error', 'membership_not_active');
  end if;

  return coalesce((
    select jsonb_agg(row_to_json(t) order by t.business_name)
    from (
      select
        p.id as owner_id,
        p.business_name,
        p.slug,
        nullif(trim(p.od_discount_summary), '') as discount_summary,
        nullif(trim(p.od_listing_area), '') as area,
        (
          select coalesce(
            jsonb_agg(
              jsonb_build_object(
                'id', s.id,
                'name', s.name,
                'description', s.description
              )
              order by s.sort_order, s.name
            ),
            '[]'::jsonb
          )
          from public.od_shop_services s
          where s.owner_id = p.id
            and s.is_active = true
        ) as services
      from public.profiles p
      where p.role = 'owner'
        and p.slug is not null
        and trim(p.slug) <> ''
        and p.od_directory_visible = true
        and p.access = 'active'
    ) t
  ), '[]'::jsonb);
end;
$$;

grant execute on function public.get_od_member_directory() to authenticated;
