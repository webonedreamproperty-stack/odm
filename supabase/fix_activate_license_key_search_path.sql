-- Fix: set a stable search_path on public.activate_license_key.
-- Run this in Supabase SQL Editor on the active project.

alter function public.activate_license_key(text)
set search_path = public;
