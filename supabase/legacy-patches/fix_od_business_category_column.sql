-- Run in Supabase SQL Editor if you see:
--   column p.od_business_category does not exist
-- when loading the OD member directory (RPC references this column).

alter table public.profiles add column if not exists od_business_category text;
alter table public.profiles add column if not exists od_discount_kind text;
alter table public.profiles add column if not exists od_discount_value numeric;
