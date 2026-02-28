-- ============================================================
-- Cookees: Full Database Schema (Idempotent)
-- Safe to re-run in Supabase SQL Editor.
-- ============================================================

create extension if not exists pgcrypto with schema extensions;

-- 1. PROFILES TABLE
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  business_name text not null,
  email text not null,
  slug text unique,
  role text not null default 'owner' check (role in ('owner', 'staff')),
  owner_id uuid references public.profiles(id) on delete cascade,
  status text not null default 'unverified' check (status in ('unverified', 'verified')),
  access text not null default 'active' check (access in ('active', 'disabled')),
  tier text not null default 'free' check (tier in ('free', 'pro')),
  tier_expires_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "Users can read own profile" on public.profiles;
create policy "Users can read own profile"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "Owners can read own staff profiles" on public.profiles;
create policy "Owners can read own staff profiles"
  on public.profiles for select
  using (
    role = 'staff' and owner_id = auth.uid()
  );

drop policy if exists "Staff can read owner profile" on public.profiles;
create policy "Staff can read owner profile"
  on public.profiles for select
  using (
    coalesce(auth.jwt()->'user_metadata'->>'role', '') = 'staff'
    and (auth.jwt()->'user_metadata'->>'owner_id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    and id = (auth.jwt()->'user_metadata'->>'owner_id')::uuid
  );

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

drop policy if exists "Owners can update own staff profiles" on public.profiles;
create policy "Owners can update own staff profiles"
  on public.profiles for update
  using (
    role = 'staff' and owner_id = auth.uid()
  );

drop policy if exists "Owners can insert staff profiles" on public.profiles;
create policy "Owners can insert staff profiles"
  on public.profiles for insert
  with check (
    role = 'staff' AND owner_id = auth.uid()
  );

drop policy if exists "Allow trigger insert for new signups" on public.profiles;
create policy "Allow trigger insert for new signups"
  on public.profiles for insert
  with check (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
declare
  v_role text;
  v_owner_id uuid;
begin
  v_role := coalesce(new.raw_user_meta_data->>'role', 'owner');

  if v_role = 'staff'
    and (new.raw_user_meta_data->>'owner_id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  then
    v_owner_id := (new.raw_user_meta_data->>'owner_id')::uuid;
  else
    v_owner_id := null;
  end if;

  insert into public.profiles (id, business_name, email, slug, role, owner_id, status, access, tier)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'business_name', ''),
    new.email,
    case when v_role = 'owner' then new.raw_user_meta_data->>'slug' else null end,
    v_role,
    v_owner_id,
    'unverified',
    'active',
    'free'
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- 2. CAMPAIGNS TABLE
create table if not exists public.campaigns (
  id text primary key default gen_random_uuid()::text,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  description text not null default '',
  reward_name text not null default '',
  tagline text,
  background_image text,
  background_opacity int default 100,
  logo_image text,
  show_logo boolean default true,
  title_size text,
  icon_key text not null default 'Coffee',
  colors jsonb not null,
  total_stamps int not null default 10,
  social jsonb,
  created_at timestamptz not null default now()
);

alter table public.campaigns enable row level security;

drop policy if exists "Owners can manage own campaigns" on public.campaigns;
create policy "Owners can manage own campaigns"
  on public.campaigns for all
  using (auth.uid() = owner_id);

drop policy if exists "Staff can read owner campaigns" on public.campaigns;
create policy "Staff can read owner campaigns"
  on public.campaigns for select
  using (
    owner_id = (select owner_id from public.profiles where id = auth.uid())
  );


-- 3. CUSTOMERS TABLE
create table if not exists public.customers (
  id text primary key default gen_random_uuid()::text,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  email text not null,
  mobile text,
  status text not null default 'Active' check (status in ('Active', 'Inactive')),
  created_at timestamptz not null default now()
);

alter table public.customers enable row level security;

drop policy if exists "Owners can manage own customers" on public.customers;
create policy "Owners can manage own customers"
  on public.customers for all
  using (auth.uid() = owner_id);

drop policy if exists "Staff can read owner customers" on public.customers;
create policy "Staff can read owner customers"
  on public.customers for select
  using (
    owner_id = (select owner_id from public.profiles where id = auth.uid())
  );

drop policy if exists "Staff can update owner customers" on public.customers;
create policy "Staff can update owner customers"
  on public.customers for update
  using (
    owner_id = (select owner_id from public.profiles where id = auth.uid())
  );


-- 4. ISSUED CARDS TABLE
create table if not exists public.issued_cards (
  id text primary key default gen_random_uuid()::text,
  unique_id uuid not null default gen_random_uuid() unique,
  customer_id text not null references public.customers(id) on delete cascade,
  campaign_id text not null references public.campaigns(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  campaign_name text not null,
  stamps int not null default 0,
  last_visit date not null default current_date,
  status text not null default 'Active' check (status in ('Active', 'Redeemed')),
  completed_date date,
  template_snapshot jsonb,
  created_at timestamptz not null default now()
);

alter table public.issued_cards enable row level security;

drop policy if exists "Owners can manage own issued cards" on public.issued_cards;
create policy "Owners can manage own issued cards"
  on public.issued_cards for all
  using (auth.uid() = owner_id);

drop policy if exists "Staff can read owner issued cards" on public.issued_cards;
create policy "Staff can read owner issued cards"
  on public.issued_cards for select
  using (
    owner_id = (select owner_id from public.profiles where id = auth.uid())
  );

drop policy if exists "Staff can update owner issued cards" on public.issued_cards;
create policy "Staff can update owner issued cards"
  on public.issued_cards for update
  using (
    owner_id = (select owner_id from public.profiles where id = auth.uid())
  );

-- Public card access is handled only via security definer RPCs.
drop policy if exists "Anyone can read issued cards by unique_id" on public.issued_cards;


-- 5. TRANSACTIONS TABLE
create table if not exists public.transactions (
  id text primary key default gen_random_uuid()::text,
  card_id text not null references public.issued_cards(id) on delete cascade,
  type text not null check (type in ('stamp_add', 'stamp_remove', 'redeem', 'issued')),
  amount int not null default 0,
  date text not null,
  "timestamp" bigint not null,
  title text not null,
  remarks text,
  actor_id uuid,
  actor_name text,
  actor_role text
);

alter table public.transactions enable row level security;

drop policy if exists "Owners can manage transactions for own cards" on public.transactions;
create policy "Owners can manage transactions for own cards"
  on public.transactions for all
  using (
    card_id in (select id from public.issued_cards where owner_id = auth.uid())
  );

drop policy if exists "Staff can read owner transactions" on public.transactions;
create policy "Staff can read owner transactions"
  on public.transactions for select
  using (
    card_id in (
      select ic.id from public.issued_cards ic
      where ic.owner_id = (select owner_id from public.profiles where id = auth.uid())
    )
  );

drop policy if exists "Staff can insert transactions for owner cards" on public.transactions;
create policy "Staff can insert transactions for owner cards"
  on public.transactions for insert
  with check (
    card_id in (
      select ic.id from public.issued_cards ic
      where ic.owner_id = (select owner_id from public.profiles where id = auth.uid())
    )
  );

-- Public card history is exposed only through get_public_card().
drop policy if exists "Anyone can read transactions for public cards" on public.transactions;


-- 6. LICENSE KEYS TABLE
create table if not exists public.license_keys (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles(id) on delete set null,
  license_key text not null unique,
  platform text not null default 'gumroad',
  status text not null default 'active' check (status in ('active', 'expired', 'revoked')),
  activated_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.license_keys enable row level security;

drop policy if exists "Users can read own license keys" on public.license_keys;
create policy "Users can read own license keys"
  on public.license_keys for select
  using (profile_id = auth.uid());

-- License activation is handled through activate_license_key().
drop policy if exists "Users can read unclaimed keys by key value" on public.license_keys;

drop policy if exists "Users can claim a license key" on public.license_keys;
create policy "Users can claim a license key"
  on public.license_keys for update
  using (profile_id is null OR profile_id = auth.uid());


-- 7. PUBLIC ACCESS HELPERS
-- Public access is handled through security definer RPCs instead of table-wide read policies.
drop policy if exists "Anyone can read profiles by slug" on public.profiles;

drop policy if exists "Anyone can read campaigns" on public.campaigns;

drop policy if exists "Anyone can read customers" on public.customers;


-- 8. ACTIVATE LICENSE KEY FUNCTION (RPC)
create or replace function public.activate_license_key(key_input text)
returns jsonb as $$
declare
  key_row public.license_keys%rowtype;
  one_year_later timestamptz;
begin
  select * into key_row
  from public.license_keys
  where license_key = key_input
    and status = 'active'
    and profile_id is null
  for update;

  if not found then
    return jsonb_build_object('success', false, 'error', 'Invalid or already used license key');
  end if;

  one_year_later := now() + interval '1 year';

  update public.license_keys
  set profile_id = auth.uid(),
      activated_at = now(),
      expires_at = one_year_later
  where id = key_row.id;

  update public.profiles
  set tier = 'pro',
      tier_expires_at = one_year_later
  where id = auth.uid();

  return jsonb_build_object('success', true, 'expires_at', one_year_later);
end;
$$ language plpgsql security definer;


-- 9. CREATE STAFF ACCOUNT (RPC)
create or replace function public.create_staff_account(
  staff_email text,
  staff_pin text,
  staff_name text
)
returns uuid as $$
declare
  new_uid uuid := gen_random_uuid();
  owner_uid uuid := auth.uid();
  owner_tier text;
  staff_count integer;
begin
  select tier into owner_tier
  from public.profiles
  where id = owner_uid and role = 'owner';

  if owner_tier is null then
    raise exception 'Only owners can create staff accounts';
  end if;

  select count(*)::integer into staff_count
  from public.profiles
  where owner_id = owner_uid and role = 'staff';

  if owner_tier = 'free' and staff_count >= 1 then
    raise exception 'Free plan allows only 1 staff account. Upgrade to Pro to add more.';
  end if;

  if exists (select 1 from auth.users where email = lower(trim(staff_email))) then
    raise exception 'Email already in use';
  end if;

  if length(staff_pin) < 4 or length(staff_pin) > 6 then
    raise exception 'PIN must be 4-6 digits';
  end if;

  insert into auth.users (
    id, instance_id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_user_meta_data, raw_app_meta_data,
    created_at, updated_at, is_sso_user
  ) values (
    new_uid,
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    lower(trim(staff_email)),
    crypt(staff_pin, gen_salt('bf')),
    now(),
    jsonb_build_object('role', 'staff', 'owner_id', owner_uid::text, 'business_name', staff_name),
    jsonb_build_object('provider', 'email', 'providers', array_to_json(array['email'])),
    now(),
    now(),
    false
  );

  insert into auth.identities (
    id, user_id, identity_data, provider, provider_id,
    last_sign_in_at, created_at, updated_at
  ) values (
    new_uid,
    new_uid,
    jsonb_build_object('sub', new_uid::text, 'email', lower(trim(staff_email))),
    'email',
    new_uid::text,
    now(),
    now(),
    now()
  );

  return new_uid;
end;
$$ language plpgsql security definer;


-- 10. UPDATE STAFF PIN (RPC)
create or replace function public.update_staff_pin(staff_id uuid, new_pin text)
returns void as $$
begin
  if not exists (
    select 1 from public.profiles
    where id = staff_id and role = 'staff' and owner_id = auth.uid()
  ) then
    raise exception 'Not your staff member';
  end if;

  update auth.users
  set encrypted_password = crypt(new_pin, gen_salt('bf')),
      updated_at = now()
  where id = staff_id;
end;
$$ language plpgsql security definer;


-- 11. DELETE STAFF ACCOUNT (RPC)
create or replace function public.delete_staff_account(staff_id uuid)
returns void as $$
begin
  if not exists (
    select 1 from public.profiles
    where id = staff_id and role = 'staff' and owner_id = auth.uid()
  ) then
    raise exception 'Not your staff member';
  end if;

  delete from auth.users
  where id = staff_id;
end;
$$ language plpgsql security definer;


-- 12. DELETE OWN ACCOUNT (RPC)
create or replace function public.delete_own_account()
returns void as $$
declare
  uid uuid := auth.uid();
begin
  delete from auth.users where id in (
    select id from public.profiles where owner_id = uid and role = 'staff'
  );
  delete from auth.users where id = uid;
end;
$$ language plpgsql security definer;


-- 13. CHECK SLUG AVAILABILITY (RPC)
create or replace function public.is_slug_available(slug_input text)
returns boolean as $$
begin
  return not exists (
    select 1 from public.profiles
    where slug = lower(trim(slug_input))
    and role = 'owner'
  );
end;
$$ language plpgsql security definer;


-- 14. GET PUBLIC CARD DATA (RPC)
create or replace function public.get_public_card(slug_input text, card_unique_id uuid)
returns jsonb as $$
declare
  owner_row record;
  card_row record;
  customer_row record;
  campaign_payload jsonb;
  history_data jsonb;
begin
  select id, slug, business_name into owner_row
  from public.profiles where slug = slug_input and role = 'owner';
  if not found then return null; end if;

  select * into card_row
  from public.issued_cards where unique_id = card_unique_id and owner_id = owner_row.id;
  if not found then return null; end if;

  select * into customer_row
  from public.customers where id = card_row.customer_id;
  if not found then return null; end if;

  select jsonb_build_object(
    'id', c.id,
    'name', c.name,
    'description', c.description,
    'reward_name', c.reward_name,
    'tagline', c.tagline,
    'background_image', c.background_image,
    'background_opacity', c.background_opacity,
    'logo_image', c.logo_image,
    'show_logo', c.show_logo,
    'title_size', c.title_size,
    'icon_key', c.icon_key,
    'colors', c.colors,
    'total_stamps', c.total_stamps,
    'social', c.social
  )
  into campaign_payload
  from public.campaigns c
  where c.id = card_row.campaign_id;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', t.id, 'type', t.type, 'amount', t.amount,
      'date', t.date, 'timestamp', t."timestamp", 'title', t.title
    ) order by t."timestamp"
  ), '[]'::jsonb)
  into history_data
  from public.transactions t where t.card_id = card_row.id;

  return jsonb_build_object(
    'card', jsonb_build_object(
      'id', card_row.id, 'uniqueId', card_row.unique_id,
      'campaignId', card_row.campaign_id, 'campaignName', card_row.campaign_name,
      'stamps', card_row.stamps, 'lastVisit', card_row.last_visit,
      'status', card_row.status, 'completedDate', card_row.completed_date,
      'templateSnapshot', card_row.template_snapshot,
      'history', history_data
    ),
    'customer', jsonb_build_object(
      'id', customer_row.id, 'name', customer_row.name
    ),
    'campaign', campaign_payload
  );
end;
$$ language plpgsql security definer;
