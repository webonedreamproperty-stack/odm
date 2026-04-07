-- Public aggregate stats for the marketing landing page (no auth required).
-- Apply in Supabase SQL editor or via migration pipeline.

create or replace function public.get_od_public_landing_stats()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_shops int;
  v_members int;
begin
  select count(*)::int into v_shops
  from public.profiles p
  where p.role = 'owner'
    and p.slug is not null
    and trim(p.slug) <> ''
    and p.od_directory_visible = true
    and p.access = 'active';

  select count(*)::int into v_members
  from public.member_profiles mp
  inner join public.od_memberships om on om.member_id = mp.id
  where om.status = 'active'
    and om.valid_until is not null
    and om.valid_until >= now()
    and (om.valid_from is null or om.valid_from <= now());

  return jsonb_build_object(
    'shop_count', coalesce(v_shops, 0),
    'member_count', coalesce(v_members, 0)
  );
end;
$$;

grant execute on function public.get_od_public_landing_stats() to anon, authenticated;
