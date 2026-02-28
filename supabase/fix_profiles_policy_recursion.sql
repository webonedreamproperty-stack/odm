-- Fix: infinite recursion in profiles RLS policy (42P17)
-- Run this in Supabase SQL Editor on the active project.

drop policy if exists "Staff can read owner profile" on public.profiles;

create policy "Staff can read owner profile"
  on public.profiles for select
  using (
    coalesce(auth.jwt()->'user_metadata'->>'role', '') = 'staff'
    and (auth.jwt()->'user_metadata'->>'owner_id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    and id = (auth.jwt()->'user_metadata'->>'owner_id')::uuid
  );
