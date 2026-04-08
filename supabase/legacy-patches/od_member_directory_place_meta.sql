-- Adds Google place category + opening hints to member directory RPCs (from od_place_details_cache).
-- Run in Supabase SQL Editor after od_place_details_cache exists.

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
        nullif(trim(p.od_shop_photo_url), '') as shop_photo_url,
        nullif(trim(p.od_google_place_id), '') as google_place_id,
        p.od_listing_lat as listing_lat,
        p.od_listing_lng as listing_lng,
        (
          select nullif(trim(c.payload->>'rating'), '')::numeric
          from public.od_place_details_cache c
          where p.od_google_place_id is not null
            and trim(p.od_google_place_id) <> ''
            and c.place_id = trim(p.od_google_place_id)
            and c.expires_at > now()
          limit 1
        ) as rating,
        (
          select nullif(trim(c.payload->>'userRatingCount'), '')::int
          from public.od_place_details_cache c
          where p.od_google_place_id is not null
            and trim(p.od_google_place_id) <> ''
            and c.place_id = trim(p.od_google_place_id)
            and c.expires_at > now()
          limit 1
        ) as rating_count,
        (
          select nullif(trim((c.payload->'photos'->0)->>'name'), '')
          from public.od_place_details_cache c
          where p.od_google_place_id is not null
            and trim(p.od_google_place_id) <> ''
            and c.place_id = trim(p.od_google_place_id)
            and c.expires_at > now()
          limit 1
        ) as google_place_photo_name,
        (
          select
            case
              when c.payload->'primaryTypeDisplayName'->>'text' is not null
                then nullif(trim(c.payload->'primaryTypeDisplayName'->>'text'), '')
              when c.payload->>'primaryType' is not null
                then initcap(replace(trim(c.payload->>'primaryType'), '_', ' '))
              else null
            end
          from public.od_place_details_cache c
          where p.od_google_place_id is not null
            and trim(p.od_google_place_id) <> ''
            and c.place_id = trim(p.od_google_place_id)
            and c.expires_at > now()
          limit 1
        ) as place_google_category,
        (
          select
            case
              when c.payload->'currentOpeningHours' is null then null
              when c.payload->'currentOpeningHours'->>'openNow' is null then null
              else (c.payload->'currentOpeningHours'->>'openNow')::boolean
            end
          from public.od_place_details_cache c
          where p.od_google_place_id is not null
            and trim(p.od_google_place_id) <> ''
            and c.place_id = trim(p.od_google_place_id)
            and c.expires_at > now()
          limit 1
        ) as place_open_now,
        (
          select coalesce(
            nullif(trim(c.payload #>> '{currentOpeningHours,weekdayDescriptions,0}'), ''),
            nullif(trim(c.payload #>> '{regularOpeningHours,weekdayDescriptions,0}'), '')
          )
          from public.od_place_details_cache c
          where p.od_google_place_id is not null
            and trim(p.od_google_place_id) <> ''
            and c.place_id = trim(p.od_google_place_id)
            and c.expires_at > now()
          limit 1
        ) as place_opening_line,
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

create or replace function public.get_od_member_directory_preview(p_limit int default 2)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  lim int := greatest(1, least(coalesce(p_limit, 2), 6));
begin
  if auth.uid() is null then
    return jsonb_build_object('error', 'not_authenticated');
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
        nullif(trim(p.od_shop_photo_url), '') as shop_photo_url,
        nullif(trim(p.od_google_place_id), '') as google_place_id,
        p.od_listing_lat as listing_lat,
        p.od_listing_lng as listing_lng,
        (
          select nullif(trim(c.payload->>'rating'), '')::numeric
          from public.od_place_details_cache c
          where p.od_google_place_id is not null
            and trim(p.od_google_place_id) <> ''
            and c.place_id = trim(p.od_google_place_id)
            and c.expires_at > now()
          limit 1
        ) as rating,
        (
          select nullif(trim(c.payload->>'userRatingCount'), '')::int
          from public.od_place_details_cache c
          where p.od_google_place_id is not null
            and trim(p.od_google_place_id) <> ''
            and c.place_id = trim(p.od_google_place_id)
            and c.expires_at > now()
          limit 1
        ) as rating_count,
        (
          select nullif(trim((c.payload->'photos'->0)->>'name'), '')
          from public.od_place_details_cache c
          where p.od_google_place_id is not null
            and trim(p.od_google_place_id) <> ''
            and c.place_id = trim(p.od_google_place_id)
            and c.expires_at > now()
          limit 1
        ) as google_place_photo_name,
        (
          select
            case
              when c.payload->'primaryTypeDisplayName'->>'text' is not null
                then nullif(trim(c.payload->'primaryTypeDisplayName'->>'text'), '')
              when c.payload->>'primaryType' is not null
                then initcap(replace(trim(c.payload->>'primaryType'), '_', ' '))
              else null
            end
          from public.od_place_details_cache c
          where p.od_google_place_id is not null
            and trim(p.od_google_place_id) <> ''
            and c.place_id = trim(p.od_google_place_id)
            and c.expires_at > now()
          limit 1
        ) as place_google_category,
        (
          select
            case
              when c.payload->'currentOpeningHours' is null then null
              when c.payload->'currentOpeningHours'->>'openNow' is null then null
              else (c.payload->'currentOpeningHours'->>'openNow')::boolean
            end
          from public.od_place_details_cache c
          where p.od_google_place_id is not null
            and trim(p.od_google_place_id) <> ''
            and c.place_id = trim(p.od_google_place_id)
            and c.expires_at > now()
          limit 1
        ) as place_open_now,
        (
          select coalesce(
            nullif(trim(c.payload #>> '{currentOpeningHours,weekdayDescriptions,0}'), ''),
            nullif(trim(c.payload #>> '{regularOpeningHours,weekdayDescriptions,0}'), '')
          )
          from public.od_place_details_cache c
          where p.od_google_place_id is not null
            and trim(p.od_google_place_id) <> ''
            and c.place_id = trim(p.od_google_place_id)
            and c.expires_at > now()
          limit 1
        ) as place_opening_line,
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
      order by p.business_name
      limit lim
    ) t
  ), '[]'::jsonb);
end;
$$;
