-- Preview subset of OD vendors for inactive members.
-- Lets members browse a limited list before renewing.

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

grant execute on function public.get_od_member_directory_preview(int) to authenticated;
