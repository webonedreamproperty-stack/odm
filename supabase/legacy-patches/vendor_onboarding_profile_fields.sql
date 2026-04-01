-- Vendor dashboard onboarding: contact, media, maps, hours, completion flag.
-- Also extends get_od_member_directory with maps_url for member "Directions".

-- Required by get_od_member_directory (same as main migration OD block); safe if already applied.
alter table public.profiles add column if not exists od_business_category text;
alter table public.profiles add column if not exists od_discount_kind text;
alter table public.profiles add column if not exists od_discount_value numeric;

alter table public.profiles add column if not exists phone text;
alter table public.profiles add column if not exists od_shop_photo_url text;
alter table public.profiles add column if not exists od_logo_url text;
alter table public.profiles add column if not exists od_maps_url text;
alter table public.profiles add column if not exists od_operating_hours jsonb;
alter table public.profiles add column if not exists vendor_onboarding_completed boolean not null default false;

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
        nullif(trim(p.od_business_category), '') as business_category,
        nullif(trim(p.od_discount_summary), '') as discount_summary,
        nullif(trim(p.od_listing_area), '') as area,
        nullif(trim(p.od_maps_url), '') as maps_url,
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

-- Existing business accounts: skip the dashboard wizard (new owners still default to false).
update public.profiles set vendor_onboarding_completed = true where role = 'owner';
