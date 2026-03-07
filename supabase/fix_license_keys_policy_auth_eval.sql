-- Fix: avoid per-row auth.uid() re-evaluation in license_keys RLS.
-- Run this in Supabase SQL Editor on the active project.

drop policy if exists "Users can read own license keys" on public.license_keys;

create policy "Users can read own license keys"
  on public.license_keys for select
  using (profile_id = (select auth.uid()));
