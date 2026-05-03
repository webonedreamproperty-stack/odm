-- Ensure a verified mobile number cannot belong to more than one member.
-- Apply in Supabase SQL editor. Safe to run multiple times.

create unique index if not exists idx_member_profiles_phone_no_unique
  on public.member_profiles (phone_no)
  where phone_no is not null;

comment on index public.idx_member_profiles_phone_no_unique is
  'At most one member row may hold a given verified phone_no (MSISDN numeric).';
