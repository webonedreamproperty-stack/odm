-- Fix: avoid per-row auth.uid() re-evaluation in transactions RLS policies.
-- Run this in Supabase SQL Editor on the active project.

drop policy if exists "Owners can manage transactions for own cards" on public.transactions;
create policy "Owners can manage transactions for own cards"
  on public.transactions for all
  using (
    card_id in (select id from public.issued_cards where owner_id = (select auth.uid()))
  );

drop policy if exists "Staff can read owner transactions" on public.transactions;
create policy "Staff can read owner transactions"
  on public.transactions for select
  using (
    card_id in (
      select ic.id
      from public.issued_cards ic
      where ic.owner_id = (
        select owner_id
        from public.profiles
        where id = (select auth.uid())
      )
    )
  );

drop policy if exists "Staff can insert transactions for owner cards" on public.transactions;
create policy "Staff can insert transactions for owner cards"
  on public.transactions for insert
  with check (
    card_id in (
      select ic.id
      from public.issued_cards ic
      where ic.owner_id = (
        select owner_id
        from public.profiles
        where id = (select auth.uid())
      )
    )
  );
