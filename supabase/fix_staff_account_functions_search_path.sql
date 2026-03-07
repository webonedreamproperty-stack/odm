-- Fix: set a stable search_path on staff-account RPC functions.
-- Run this in Supabase SQL Editor on the active project.

alter function public.create_staff_account(text, text, text)
set search_path = public;

alter function public.update_staff_pin(uuid, text)
set search_path = public;

alter function public.delete_own_account()
set search_path = public;

alter function public.delete_staff_account(uuid)
set search_path = public;
