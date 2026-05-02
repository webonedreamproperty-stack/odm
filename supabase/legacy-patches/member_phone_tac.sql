-- Pending WhatsApp TAC for verifying `member_profiles.phone_no` (server + WAHA only).
-- Apply in Supabase SQL editor if these columns are missing.

alter table public.member_profiles
  add column if not exists phone_pending_msisdn numeric null;

alter table public.member_profiles
  add column if not exists phone_tac_hash text null;

alter table public.member_profiles
  add column if not exists phone_tac_expires_at timestamptz null;

comment on column public.member_profiles.phone_pending_msisdn is 'MSISDN digits (numeric) awaiting TAC verification; cleared after success.';
comment on column public.member_profiles.phone_tac_hash is 'SHA-256 of TAC challenge; server-only.';
comment on column public.member_profiles.phone_tac_expires_at is 'TAC expiry; server-only.';
