-- One-time TAC for `/od/verify/:slug` phone login (WAHA); cleared after success or expiry.

alter table public.member_profiles
  add column if not exists verify_shop_tac_msisdn numeric null;

alter table public.member_profiles
  add column if not exists verify_shop_tac_hash text null;

alter table public.member_profiles
  add column if not exists verify_shop_tac_expires_at timestamptz null;
