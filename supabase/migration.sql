-- ============================================================
-- ODMember: Full Database Schema (Idempotent)
-- Canonical fresh-install script for new Supabase projects.
-- Safe to re-run in Supabase SQL Editor.
-- For existing or older projects, use the targeted upgrade/repair
-- scripts in legacy-patches/ only when needed.
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

create or replace function public.current_staff_owner_id()
returns uuid
language sql
security definer
stable
set search_path = public
as $$
  select p.owner_id
  from public.profiles p
  where p.id = (select auth.uid())
    and p.role = 'staff'
  limit 1
$$;

drop policy if exists "Users can read own profile" on public.profiles;
create policy "Users can read own profile"
  on public.profiles for select
  using ((select auth.uid()) = id);

drop policy if exists "Owners can read own staff profiles" on public.profiles;
create policy "Owners can read own staff profiles"
  on public.profiles for select
  using (
    role = 'staff' and owner_id = (select auth.uid())
  );

drop policy if exists "Staff can read owner profile" on public.profiles;
create policy "Staff can read owner profile"
  on public.profiles for select
  using (
    id = (select public.current_staff_owner_id())
  );

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
  on public.profiles for update
  using ((select auth.uid()) = id);

drop policy if exists "Owners can update own staff profiles" on public.profiles;
create policy "Owners can update own staff profiles"
  on public.profiles for update
  using (
    role = 'staff' and owner_id = (select auth.uid())
  );

drop policy if exists "Owners can insert staff profiles" on public.profiles;
create policy "Owners can insert staff profiles"
  on public.profiles for insert
  with check (
    role = 'staff' AND owner_id = (select auth.uid())
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
$$ language plpgsql security definer
set search_path = public;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- 2. CAMPAIGNS TABLE
create table if not exists public.campaigns (
  id text primary key default gen_random_uuid()::text,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  is_enabled boolean not null default true,
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

alter table public.campaigns
  add column if not exists is_enabled boolean not null default true;

alter table public.campaigns enable row level security;

drop policy if exists "Owners can manage own campaigns" on public.campaigns;
create policy "Owners can manage own campaigns"
  on public.campaigns for all
  using ((select auth.uid()) = owner_id);

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
  campaign_id text references public.campaigns(id) on delete set null,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  campaign_name text not null,
  stamps int not null default 0,
  last_visit date not null default current_date,
  status text not null default 'Active' check (status in ('Active', 'Redeemed')),
  completed_date date,
  template_snapshot jsonb,
  created_at timestamptz not null default now()
);

create or replace function public.prevent_issuing_disabled_campaign_card()
returns trigger as $$
declare
  campaign_enabled boolean;
begin
  if new.campaign_id is null then
    return new;
  end if;

  select c.is_enabled
  into campaign_enabled
  from public.campaigns c
  where c.id = new.campaign_id;

  if found and campaign_enabled = false then
    raise exception 'CAMPAIGN_DISABLED: This campaign is disabled and cannot issue new cards.';
  end if;

  return new;
end;
$$ language plpgsql
set search_path = public;

drop trigger if exists issued_cards_block_disabled_campaign on public.issued_cards;
create trigger issued_cards_block_disabled_campaign
  before insert on public.issued_cards
  for each row
  execute function public.prevent_issuing_disabled_campaign_card();

update public.issued_cards ic
set template_snapshot = coalesce(
      ic.template_snapshot,
      jsonb_build_object(
        'id', c.id,
        'name', c.name,
        'description', c.description,
        'rewardName', c.reward_name,
        'tagline', c.tagline,
        'backgroundImage', c.background_image,
        'backgroundOpacity', c.background_opacity,
        'logoImage', c.logo_image,
        'showLogo', c.show_logo,
        'titleSize', c.title_size,
        'iconKey', c.icon_key,
        'colors', c.colors,
        'totalStamps', c.total_stamps,
        'social', c.social
      )
    ),
    campaign_name = coalesce(nullif(ic.campaign_name, ''), c.name)
from public.campaigns c
where ic.campaign_id = c.id
  and (ic.template_snapshot is null or nullif(ic.campaign_name, '') is null);

do $$
declare
  issued_cards_campaign_fk text;
begin
  select conname
  into issued_cards_campaign_fk
  from pg_constraint
  where conrelid = 'public.issued_cards'::regclass
    and contype = 'f'
    and confrelid = 'public.campaigns'::regclass
    and array_position(
      conkey,
      (
        select attnum
        from pg_attribute
        where attrelid = 'public.issued_cards'::regclass
          and attname = 'campaign_id'
      )
    ) is not null
  limit 1;

  if issued_cards_campaign_fk is not null then
    execute format(
      'alter table public.issued_cards drop constraint %I',
      issued_cards_campaign_fk
    );
  end if;
end;
$$;

alter table public.issued_cards
  alter column campaign_id drop not null;

alter table public.issued_cards
  add constraint issued_cards_campaign_id_fkey
  foreign key (campaign_id)
  references public.campaigns(id)
  on delete set null;

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
    card_id in (select id from public.issued_cards where owner_id = (select auth.uid()))
  );

drop policy if exists "Staff can read owner transactions" on public.transactions;
create policy "Staff can read owner transactions"
  on public.transactions for select
  using (
    card_id in (
      select ic.id from public.issued_cards ic
      where ic.owner_id = (
        select owner_id from public.profiles where id = (select auth.uid())
      )
    )
  );

drop policy if exists "Staff can insert transactions for owner cards" on public.transactions;
create policy "Staff can insert transactions for owner cards"
  on public.transactions for insert
  with check (
    card_id in (
      select ic.id from public.issued_cards ic
      where ic.owner_id = (
        select owner_id from public.profiles where id = (select auth.uid())
      )
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
  using (profile_id = (select auth.uid()));

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

-- 7A. CAMPAIGN ASSET STORAGE (PUBLIC BUCKET + OBJECT POLICIES)
insert into storage.buckets (id, name, public)
values ('campaign-assets', 'campaign-assets', true)
on conflict (id) do update
set public = excluded.public;

drop policy if exists "Campaign assets are publicly readable" on storage.objects;
create policy "Campaign assets are publicly readable"
  on storage.objects for select
  using (bucket_id = 'campaign-assets');

drop policy if exists "Users can upload own campaign assets" on storage.objects;
create policy "Users can upload own campaign assets"
  on storage.objects for insert
  with check (
    bucket_id = 'campaign-assets'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

drop policy if exists "Users can update own campaign assets" on storage.objects;
create policy "Users can update own campaign assets"
  on storage.objects for update
  using (
    bucket_id = 'campaign-assets'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  )
  with check (
    bucket_id = 'campaign-assets'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

drop policy if exists "Users can delete own campaign assets" on storage.objects;
create policy "Users can delete own campaign assets"
  on storage.objects for delete
  using (
    bucket_id = 'campaign-assets'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );


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
$$ language plpgsql security definer
set search_path = public;

create or replace function public.get_scan_entry_context(slug_input text, card_unique_id uuid)
returns jsonb as $$
declare
  owner_row record;
  card_row record;
begin
  select id, slug, business_name into owner_row
  from public.profiles
  where slug = slug_input and role = 'owner';
  if not found then return null; end if;

  select unique_id into card_row
  from public.issued_cards
  where unique_id = card_unique_id and owner_id = owner_row.id;
  if not found then return null; end if;

  return jsonb_build_object(
    'owner', jsonb_build_object(
      'id', owner_row.id,
      'slug', owner_row.slug,
      'businessName', owner_row.business_name
    ),
    'card', jsonb_build_object(
      'uniqueId', card_row.unique_id
    )
  );
end;
$$ language plpgsql security definer
set search_path = public;

create or replace function public.inspect_scanned_card(card_unique_id uuid)
returns jsonb as $$
declare
  actor_row record;
  card_row record;
  actor_owner_id uuid;
begin
  select id, role, owner_id into actor_row
  from public.profiles
  where id = auth.uid();
  if not found then
    return jsonb_build_object('status', 'missing');
  end if;

  actor_owner_id := case
    when actor_row.role = 'owner' then actor_row.id
    else actor_row.owner_id
  end;

  if actor_owner_id is null then
    return jsonb_build_object('status', 'missing');
  end if;

  select owner_id into card_row
  from public.issued_cards
  where unique_id = card_unique_id;

  if not found then
    return jsonb_build_object('status', 'missing');
  end if;

  if card_row.owner_id <> actor_owner_id then
    return jsonb_build_object('status', 'foreign');
  end if;

  return jsonb_build_object('status', 'owned');
end;
$$ language plpgsql security definer
set search_path = public;


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
begin
  if not exists (
    select 1 from public.profiles where id = owner_uid and role = 'owner'
  ) then
    raise exception 'Only owners can create staff accounts';
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
$$ language plpgsql security definer
set search_path = public;


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
$$ language plpgsql security definer
set search_path = public;


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
$$ language plpgsql security definer
set search_path = public;


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
$$ language plpgsql security definer
set search_path = public;


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
$$ language plpgsql security definer
set search_path = public;

create or replace function public.get_public_campaign_signup_context(slug_input text, campaign_id_input text)
returns jsonb as $$
declare
  owner_row record;
  campaign_row record;
begin
  select id, slug, business_name
  into owner_row
  from public.profiles
  where slug = slug_input and role = 'owner';
  if not found then return null; end if;

  select id, name, is_enabled
  into campaign_row
  from public.campaigns
  where id = campaign_id_input
    and owner_id = owner_row.id;
  if not found then return null; end if;

  return jsonb_build_object(
    'owner', jsonb_build_object(
      'id', owner_row.id,
      'slug', owner_row.slug,
      'businessName', owner_row.business_name
    ),
    'campaign', jsonb_build_object(
      'id', campaign_row.id,
      'name', campaign_row.name,
      'isEnabled', campaign_row.is_enabled
    )
  );
end;
$$ language plpgsql security definer
set search_path = public;

create or replace function public.register_public_campaign_signup(
  slug_input text,
  campaign_id_input text,
  customer_name_input text,
  customer_email_input text default null,
  customer_mobile_input text default null
)
returns jsonb as $$
declare
  owner_row record;
  campaign_row public.campaigns%rowtype;
  customer_row public.customers%rowtype;
  existing_card_row record;
  normalized_name text;
  normalized_email text;
  normalized_mobile text;
  now_ts timestamptz := now();
  new_card_id text;
  new_unique_id uuid;
begin
  normalized_name := trim(coalesce(customer_name_input, ''));
  normalized_email := nullif(lower(trim(coalesce(customer_email_input, ''))), '');
  normalized_mobile := nullif(regexp_replace(coalesce(customer_mobile_input, ''), '[^0-9]+', '', 'g'), '');

  if normalized_name = '' then
    return jsonb_build_object('outcome', 'error', 'error', 'Name is required.');
  end if;

  select id, slug, business_name
  into owner_row
  from public.profiles
  where slug = slug_input and role = 'owner';
  if not found then
    return jsonb_build_object('outcome', 'error', 'error', 'Business not found.');
  end if;

  select *
  into campaign_row
  from public.campaigns
  where id = campaign_id_input
    and owner_id = owner_row.id;
  if not found then
    return jsonb_build_object('outcome', 'error', 'error', 'Campaign not found.');
  end if;

  if normalized_email is not null or normalized_mobile is not null then
    select *
    into customer_row
    from public.customers c
    where c.owner_id = owner_row.id
      and (
        (normalized_email is not null and nullif(lower(trim(c.email)), '') = normalized_email)
        or
        (normalized_mobile is not null and nullif(regexp_replace(coalesce(c.mobile, ''), '[^0-9]+', '', 'g'), '') = normalized_mobile)
      )
    order by c.created_at asc
    limit 1;
  end if;

  if customer_row.id is not null then
    select ic.unique_id
    into existing_card_row
    from public.issued_cards ic
    where ic.owner_id = owner_row.id
      and ic.campaign_id = campaign_row.id
      and ic.customer_id = customer_row.id
      and ic.status = 'Active'
    order by ic.created_at asc
    limit 1;

    if found then
      return jsonb_build_object('outcome', 'redirect_existing', 'uniqueId', existing_card_row.unique_id);
    end if;
  end if;

  if campaign_row.is_enabled = false then
    return jsonb_build_object('outcome', 'campaign_disabled_no_existing');
  end if;

  if customer_row.id is null then
    insert into public.customers (id, owner_id, name, email, mobile, status)
    values (
      gen_random_uuid()::text,
      owner_row.id,
      normalized_name,
      coalesce(normalized_email, ''),
      normalized_mobile,
      'Active'
    )
    returning * into customer_row;
  end if;

  new_card_id := gen_random_uuid()::text;
  new_unique_id := gen_random_uuid();

  insert into public.issued_cards (
    id,
    unique_id,
    customer_id,
    campaign_id,
    owner_id,
    campaign_name,
    stamps,
    last_visit,
    status,
    template_snapshot
  )
  values (
    new_card_id,
    new_unique_id,
    customer_row.id,
    campaign_row.id,
    owner_row.id,
    campaign_row.name,
    0,
    current_date,
    'Active',
    jsonb_build_object(
      'id', campaign_row.id,
      'name', campaign_row.name,
      'description', campaign_row.description,
      'rewardName', campaign_row.reward_name,
      'tagline', campaign_row.tagline,
      'backgroundImage', campaign_row.background_image,
      'backgroundOpacity', campaign_row.background_opacity,
      'logoImage', campaign_row.logo_image,
      'showLogo', campaign_row.show_logo,
      'titleSize', campaign_row.title_size,
      'iconKey', campaign_row.icon_key,
      'colors', campaign_row.colors,
      'totalStamps', campaign_row.total_stamps,
      'social', campaign_row.social
    )
  );

  insert into public.transactions (
    id,
    card_id,
    type,
    amount,
    date,
    "timestamp",
    title
  )
  values (
    gen_random_uuid()::text,
    new_card_id,
    'issued',
    0,
    to_char(now_ts, 'Mon FMDD, YYYY FMHH12:MI AM'),
    floor(extract(epoch from now_ts) * 1000)::bigint,
    'Card Issued'
  );

  return jsonb_build_object('outcome', 'issued', 'uniqueId', new_unique_id);
end;
$$ language plpgsql security definer
set search_path = public;

create or replace function public.delete_campaign_preserve_cards(campaign_id_input text)
returns jsonb as $$
declare
  campaign_row public.campaigns%rowtype;
  campaign_snapshot jsonb;
begin
  select *
  into campaign_row
  from public.campaigns
  where id = campaign_id_input
    and owner_id = auth.uid();

  if not found then
    raise exception 'Campaign not found or not owned by current user';
  end if;

  campaign_snapshot := jsonb_build_object(
    'id', campaign_row.id,
    'name', campaign_row.name,
    'description', campaign_row.description,
    'rewardName', campaign_row.reward_name,
    'tagline', campaign_row.tagline,
    'backgroundImage', campaign_row.background_image,
    'backgroundOpacity', campaign_row.background_opacity,
    'logoImage', campaign_row.logo_image,
    'showLogo', campaign_row.show_logo,
    'titleSize', campaign_row.title_size,
    'iconKey', campaign_row.icon_key,
    'colors', campaign_row.colors,
    'totalStamps', campaign_row.total_stamps,
    'social', campaign_row.social
  );

  update public.issued_cards
  set template_snapshot = coalesce(template_snapshot, campaign_snapshot),
      campaign_name = coalesce(nullif(campaign_name, ''), campaign_row.name)
  where campaign_id = campaign_row.id;

  delete from public.campaigns
  where id = campaign_row.id;

  return jsonb_build_object('success', true);
end;
$$ language plpgsql security definer
set search_path = public;


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
$$ language plpgsql security definer
set search_path = public;


-- ============================================================
-- OD MEMBERSHIP (consumer accounts, manual renewals, shop verify)
-- ============================================================

create table if not exists public.member_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text not null default '',
  member_code text not null unique,
  country text not null default 'MY',
  created_at timestamptz not null default now()
);

alter table public.member_profiles add column if not exists public_username text;

create unique index if not exists idx_member_profiles_public_username_lower
  on public.member_profiles (lower(trim(public_username)))
  where public_username is not null and trim(public_username) <> '';

create table if not exists public.od_memberships (
  member_id uuid primary key references public.member_profiles(id) on delete cascade,
  status text not null default 'suspended' check (status in ('active', 'suspended')),
  plan text check (plan is null or plan in ('month', 'year', 'hour')),
  valid_from timestamptz,
  valid_until timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists public.od_membership_renewals (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.member_profiles(id) on delete cascade,
  plan text not null check (plan in ('month', 'year', 'hour')),
  valid_from timestamptz not null,
  valid_until timestamptz not null,
  renewed_by uuid not null references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.od_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists idx_od_membership_renewals_member on public.od_membership_renewals(member_id);
create index if not exists idx_od_membership_renewals_created on public.od_membership_renewals(created_at desc);

create or replace function public.generate_od_member_code()
returns text
language plpgsql
volatile
set search_path = public
as $$
declare
  candidate text;
  attempts int := 0;
begin
  loop
    attempts := attempts + 1;
    if attempts > 40 then
      raise exception 'Could not generate unique OD member code';
    end if;
    candidate := 'OD-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
    exit when not exists (select 1 from public.member_profiles where member_code = candidate);
  end loop;
  return candidate;
end;
$$;

create or replace function public.is_od_admin(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.od_admins o where o.user_id = uid);
$$;

alter table public.profiles add column if not exists od_business_category text;
alter table public.profiles add column if not exists od_discount_kind text;
alter table public.profiles add column if not exists od_discount_value numeric;

do $$
begin
  alter table public.profiles
    add constraint profiles_od_discount_kind_check
    check (od_discount_kind is null or od_discount_kind in ('percent', 'fixed'));
exception
  when duplicate_object then null;
end;
$$;

create or replace function public.handle_new_user()
returns trigger as $$
declare
  v_role text;
  v_owner_id uuid;
  v_od_cat text;
  v_od_kind text;
  v_od_val numeric;
  v_od_summary text;
begin
  v_role := coalesce(new.raw_user_meta_data->>'role', 'owner');

  if v_role = 'member' then
    insert into public.member_profiles (id, email, display_name, member_code)
    values (
      new.id,
      coalesce(new.email, ''),
      coalesce(nullif(trim(new.raw_user_meta_data->>'display_name'), ''), 'Member'),
      public.generate_od_member_code()
    )
    on conflict (id) do nothing;
    return new;
  end if;

  if v_role = 'staff'
    and (new.raw_user_meta_data->>'owner_id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  then
    v_owner_id := (new.raw_user_meta_data->>'owner_id')::uuid;
  else
    v_owner_id := null;
  end if;

  v_od_cat := nullif(trim(new.raw_user_meta_data->>'od_business_category'), '');
  v_od_kind := case
    when new.raw_user_meta_data->>'od_discount_kind' in ('percent', 'fixed') then new.raw_user_meta_data->>'od_discount_kind'
    else null
  end;
  begin
    if new.raw_user_meta_data->>'od_discount_value' is not null
       and new.raw_user_meta_data->>'od_discount_value' ~ '^[0-9]+(\.[0-9]+)?$'
    then
      v_od_val := (new.raw_user_meta_data->>'od_discount_value')::numeric;
    else
      v_od_val := null;
    end if;
  exception when others then
    v_od_val := null;
  end;

  v_od_summary := '';
  if v_od_kind = 'percent' and v_od_val is not null then
    v_od_summary := trim(to_char(v_od_val, 'FM999999990.99')) || '% off for OD members';
  elsif v_od_kind = 'fixed' and v_od_val is not null then
    v_od_summary := 'RM' || trim(to_char(v_od_val, 'FM999999990.99')) || ' off for OD members';
  end if;

  insert into public.profiles (
    id, business_name, email, slug, role, owner_id, status, access, tier,
    od_business_category, od_discount_kind, od_discount_value, od_discount_summary
  )
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'business_name', ''),
    new.email,
    case when v_role = 'owner' then new.raw_user_meta_data->>'slug' else null end,
    v_role,
    v_owner_id,
    'unverified',
    'active',
    'free',
    case when v_role = 'owner' then v_od_cat else null end,
    case when v_role = 'owner' then v_od_kind else null end,
    case when v_role = 'owner' then v_od_val else null end,
    case
      when v_role = 'owner' then coalesce(nullif(v_od_summary, ''), '')
      else ''
    end
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer
set search_path = public;

alter table public.member_profiles enable row level security;
alter table public.od_memberships enable row level security;
alter table public.od_membership_renewals enable row level security;
alter table public.od_admins enable row level security;

drop policy if exists "Members read own profile" on public.member_profiles;
create policy "Members read own profile"
  on public.member_profiles for select
  using (id = (select auth.uid()));

drop policy if exists "OD admins read all member profiles" on public.member_profiles;
create policy "OD admins read all member profiles"
  on public.member_profiles for select
  using (public.is_od_admin((select auth.uid())));

drop policy if exists "Members update own profile" on public.member_profiles;
create policy "Members update own profile"
  on public.member_profiles for update
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

drop policy if exists "Members read own membership" on public.od_memberships;
create policy "Members read own membership"
  on public.od_memberships for select
  using (member_id = (select auth.uid()));

drop policy if exists "OD admins read all memberships" on public.od_memberships;
create policy "OD admins read all memberships"
  on public.od_memberships for select
  using (public.is_od_admin((select auth.uid())));

drop policy if exists "Members read own renewals" on public.od_membership_renewals;
create policy "Members read own renewals"
  on public.od_membership_renewals for select
  using (member_id = (select auth.uid()));

drop policy if exists "OD admins read all renewals" on public.od_membership_renewals;
create policy "OD admins read all renewals"
  on public.od_membership_renewals for select
  using (public.is_od_admin((select auth.uid())));

drop policy if exists "Users read own od admin row" on public.od_admins;
create policy "Users read own od admin row"
  on public.od_admins for select
  using (user_id = (select auth.uid()));

create or replace function public.get_od_member_shop_verification(shop_slug text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  shop_row record;
  mem_code text;
  om record;
  v_qualified boolean := false;
begin
  if uid is null then
    return jsonb_build_object('error', 'not_authenticated');
  end if;

  if not exists (select 1 from public.member_profiles where id = uid) then
    return jsonb_build_object('error', 'not_member');
  end if;

  select business_name, slug into shop_row
  from public.profiles
  where slug = trim(shop_slug) and role = 'owner'
  limit 1;

  if not found then
    return jsonb_build_object('error', 'shop_not_found');
  end if;

  select member_code into mem_code
  from public.member_profiles
  where id = uid;

  select * into om
  from public.od_memberships
  where member_id = uid;

  if not found then
    return jsonb_build_object(
      'qualified', false,
      'member_code', mem_code,
      'valid_until', null,
      'valid_from', null,
      'membership_status', 'none',
      'shop_name', shop_row.business_name,
      'shop_slug', shop_row.slug
    );
  end if;

  v_qualified := (
    om.status = 'active'
    and om.valid_until is not null
    and om.valid_until >= now()
    and (om.valid_from is null or om.valid_from <= now())
  );

  return jsonb_build_object(
    'qualified', v_qualified,
    'member_code', mem_code,
    'valid_until', om.valid_until,
    'valid_from', om.valid_from,
    'membership_status', om.status,
    'shop_name', shop_row.business_name,
    'shop_slug', shop_row.slug
  );
end;
$$;

create or replace function public.admin_renew_od_membership(p_member_id uuid, p_plan text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_from timestamptz;
  v_until timestamptz;
  cur_until timestamptz;
begin
  if auth.uid() is null or not public.is_od_admin(auth.uid()) then
    raise exception 'not authorized';
  end if;

  if p_plan is null or p_plan not in ('month', 'year', 'hour') then
    raise exception 'invalid plan';
  end if;

  if not exists (select 1 from public.member_profiles where id = p_member_id) then
    raise exception 'member not found';
  end if;

  select valid_until into cur_until
  from public.od_memberships
  where member_id = p_member_id;

  if cur_until is not null and cur_until > now() then
    v_from := cur_until;
  else
    v_from := now();
  end if;

  if p_plan = 'month' then
    v_until := v_from + interval '1 month';
  elsif p_plan = 'year' then
    v_until := v_from + interval '1 year';
  else
    v_until := v_from + interval '1 hour';
  end if;

  insert into public.od_membership_renewals (member_id, plan, valid_from, valid_until, renewed_by)
  values (p_member_id, p_plan, v_from, v_until, auth.uid());

  insert into public.od_memberships (member_id, status, plan, valid_from, valid_until, updated_at)
  values (p_member_id, 'active', p_plan, v_from, v_until, now())
  on conflict (member_id) do update
  set status = 'active',
      plan = excluded.plan,
      valid_from = excluded.valid_from,
      valid_until = excluded.valid_until,
      updated_at = now();

  return jsonb_build_object('success', true, 'valid_from', v_from, 'valid_until', v_until);
end;
$$;

create or replace function public.admin_list_od_members()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not public.is_od_admin(auth.uid()) then
    raise exception 'not authorized';
  end if;

  return coalesce((
    select jsonb_agg(row_to_json(t) order by t.created_at desc)
    from (
      select
        mp.id,
        mp.email,
        mp.display_name,
        mp.member_code,
        mp.country,
        mp.created_at,
        om.status as membership_status,
        om.plan as membership_plan,
        om.valid_from,
        om.valid_until
      from public.member_profiles mp
      left join public.od_memberships om on om.member_id = mp.id
    ) t
  ), '[]'::jsonb);
end;
$$;

create or replace function public.admin_list_od_renewals(p_limit int default 200)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  lim int := least(coalesce(p_limit, 200), 500);
begin
  if auth.uid() is null or not public.is_od_admin(auth.uid()) then
    raise exception 'not authorized';
  end if;

  return coalesce((
    select jsonb_agg(row_to_json(t) order by t.created_at desc)
    from (
      select
        r.id,
        r.member_id,
        mp.member_code,
        mp.email,
        r.plan,
        r.valid_from,
        r.valid_until,
        r.created_at,
        r.renewed_by
      from public.od_membership_renewals r
      join public.member_profiles mp on mp.id = r.member_id
      order by r.created_at desc
      limit lim
    ) t
  ), '[]'::jsonb);
end;
$$;

grant execute on function public.get_od_member_shop_verification(text) to authenticated;
grant execute on function public.admin_renew_od_membership(uuid, text) to authenticated;
grant execute on function public.admin_list_od_members() to authenticated;
grant execute on function public.admin_list_od_renewals(int) to authenticated;

drop policy if exists "OD admins read all profiles" on public.profiles;
create policy "OD admins read all profiles"
  on public.profiles for select
  using (public.is_od_admin((select auth.uid())));

create or replace function public.member_self_renew_od_membership(p_plan text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  v_from timestamptz;
  v_until timestamptz;
  cur_until timestamptz;
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;

  if not exists (select 1 from public.member_profiles where id = uid) then
    raise exception 'not a member';
  end if;

  if p_plan is null or p_plan not in ('month', 'year', 'hour') then
    raise exception 'invalid plan';
  end if;

  select valid_until into cur_until
  from public.od_memberships
  where member_id = uid;

  if cur_until is not null and cur_until > now() then
    v_from := cur_until;
  else
    v_from := now();
  end if;

  if p_plan = 'month' then
    v_until := v_from + interval '1 month';
  elsif p_plan = 'year' then
    v_until := v_from + interval '1 year';
  else
    v_until := v_from + interval '1 hour';
  end if;

  insert into public.od_membership_renewals (member_id, plan, valid_from, valid_until, renewed_by)
  values (uid, p_plan, v_from, v_until, uid);

  insert into public.od_memberships (member_id, status, plan, valid_from, valid_until, updated_at)
  values (uid, 'active', p_plan, v_from, v_until, now())
  on conflict (member_id) do update
  set status = 'active',
      plan = excluded.plan,
      valid_from = excluded.valid_from,
      valid_until = excluded.valid_until,
      updated_at = now();

  return jsonb_build_object('success', true, 'valid_from', v_from, 'valid_until', v_until);
end;
$$;

create or replace function public.admin_list_vendor_accounts()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not public.is_od_admin(auth.uid()) then
    raise exception 'not authorized';
  end if;

  return coalesce((
    select jsonb_agg(row_to_json(t) order by t.created_at desc)
    from (
      select
        p.id,
        p.business_name,
        p.email,
        p.slug,
        p.role,
        p.status as account_status,
        p.access as access_status,
        p.tier,
        p.tier_expires_at,
        p.created_at,
        (
          select count(*)::int
          from public.profiles s
          where s.owner_id = p.id and s.role = 'staff'
        ) as staff_count
      from public.profiles p
      where p.role = 'owner'
    ) t
  ), '[]'::jsonb);
end;
$$;

grant execute on function public.member_self_renew_od_membership(text) to authenticated;
grant execute on function public.admin_list_vendor_accounts() to authenticated;

-- OD member directory (shops + services visible to active members)
alter table public.profiles add column if not exists od_directory_visible boolean not null default true;
alter table public.profiles add column if not exists od_discount_summary text not null default '';
alter table public.profiles add column if not exists od_listing_area text;
alter table public.profiles add column if not exists od_listing_lat double precision;
alter table public.profiles add column if not exists od_listing_lng double precision;
alter table public.profiles add column if not exists phone text;
alter table public.profiles add column if not exists od_shop_photo_url text;
alter table public.profiles add column if not exists od_logo_url text;
alter table public.profiles add column if not exists od_maps_url text;
alter table public.profiles add column if not exists od_operating_hours jsonb;
alter table public.profiles add column if not exists vendor_onboarding_completed boolean not null default false;
alter table public.profiles add column if not exists od_google_place_id text;

-- Cached Place Details (New) JSON for public vendor profile cards (TTL via expires_at)
create table if not exists public.od_place_details_cache (
  place_id text primary key,
  payload jsonb not null,
  expires_at timestamptz not null,
  updated_at timestamptz not null default now()
);

create index if not exists od_place_details_cache_expires_idx
  on public.od_place_details_cache (expires_at);

alter table public.od_place_details_cache enable row level security;

create or replace function public.upsert_od_place_details_cache(
  p_place_id text,
  p_payload jsonb,
  p_ttl_days int default 30
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  pid text;
  ttl_days int;
begin
  if auth.uid() is null then
    return jsonb_build_object('success', false, 'error', 'not_authenticated');
  end if;
  pid := trim(coalesce(p_place_id, ''));
  if pid = '' then
    return jsonb_build_object('success', false, 'error', 'invalid_place_id');
  end if;
  if p_payload is null or jsonb_typeof(p_payload) <> 'object' then
    return jsonb_build_object('success', false, 'error', 'invalid_payload');
  end if;
  ttl_days := greatest(1, least(coalesce(p_ttl_days, 30), 90));

  insert into public.od_place_details_cache as c (place_id, payload, expires_at, updated_at)
  values (pid, p_payload, now() + make_interval(days => ttl_days), now())
  on conflict (place_id) do update
    set payload = excluded.payload,
        expires_at = excluded.expires_at,
        updated_at = now();

  return jsonb_build_object('success', true);
end;
$$;

grant execute on function public.upsert_od_place_details_cache(text, jsonb, int) to authenticated;

create table if not exists public.od_shop_services (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  description text not null default '',
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_od_shop_services_owner on public.od_shop_services(owner_id);

alter table public.od_shop_services enable row level security;

drop policy if exists "Owners manage own od shop services" on public.od_shop_services;
create policy "Owners manage own od shop services"
  on public.od_shop_services for all
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

drop policy if exists "OD admins read all od shop services" on public.od_shop_services;
create policy "OD admins read all od shop services"
  on public.od_shop_services for select
  using (public.is_od_admin((select auth.uid())));

create or replace function public.get_od_member_directory()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    return jsonb_build_object('error', 'not_authenticated');
  end if;

  if not exists (
    select 1
    from public.member_profiles mp
    inner join public.od_memberships om on om.member_id = mp.id
    where mp.id = uid
      and om.status = 'active'
      and om.valid_until is not null
      and om.valid_until >= now()
      and (om.valid_from is null or om.valid_from <= now())
  ) then
    return jsonb_build_object('error', 'membership_not_active');
  end if;

  return coalesce((
    select jsonb_agg(row_to_json(t) order by t.business_name)
    from (
      select
        p.id as owner_id,
        p.business_name,
        p.slug,
        nullif(trim(p.od_business_category), '') as business_category,
        nullif(trim(p.od_discount_summary), '') as discount_summary,
        nullif(trim(p.od_listing_area), '') as area,
        nullif(trim(p.od_maps_url), '') as maps_url,
        nullif(trim(p.od_shop_photo_url), '') as shop_photo_url,
        p.od_listing_lat as listing_lat,
        p.od_listing_lng as listing_lng,
        (
          select nullif(trim(c.payload->>'rating'), '')::numeric
          from public.od_place_details_cache c
          where p.od_google_place_id is not null
            and trim(p.od_google_place_id) <> ''
            and c.place_id = trim(p.od_google_place_id)
            and c.expires_at > now()
          limit 1
        ) as rating,
        (
          select nullif(trim(c.payload->>'userRatingCount'), '')::int
          from public.od_place_details_cache c
          where p.od_google_place_id is not null
            and trim(p.od_google_place_id) <> ''
            and c.place_id = trim(p.od_google_place_id)
            and c.expires_at > now()
          limit 1
        ) as rating_count,
        (
          select nullif(trim((c.payload->'photos'->0)->>'name'), '')
          from public.od_place_details_cache c
          where p.od_google_place_id is not null
            and trim(p.od_google_place_id) <> ''
            and c.place_id = trim(p.od_google_place_id)
            and c.expires_at > now()
          limit 1
        ) as google_place_photo_name,
        (
          select coalesce(
            jsonb_agg(
              jsonb_build_object(
                'id', s.id,
                'name', s.name,
                'description', s.description
              )
              order by s.sort_order, s.name
            ),
            '[]'::jsonb
          )
          from public.od_shop_services s
          where s.owner_id = p.id
            and s.is_active = true
        ) as services
      from public.profiles p
      where p.role = 'owner'
        and p.slug is not null
        and trim(p.slug) <> ''
        and p.od_directory_visible = true
        and p.access = 'active'
    ) t
  ), '[]'::jsonb);
end;
$$;

grant execute on function public.get_od_member_directory() to authenticated;

create or replace function public.get_od_member_directory_preview(p_limit int default 2)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  lim int := greatest(1, least(coalesce(p_limit, 2), 6));
begin
  if auth.uid() is null then
    return jsonb_build_object('error', 'not_authenticated');
  end if;

  return coalesce((
    select jsonb_agg(row_to_json(t) order by t.business_name)
    from (
      select
        p.id as owner_id,
        p.business_name,
        p.slug,
        nullif(trim(p.od_business_category), '') as business_category,
        nullif(trim(p.od_discount_summary), '') as discount_summary,
        nullif(trim(p.od_listing_area), '') as area,
        nullif(trim(p.od_maps_url), '') as maps_url,
        nullif(trim(p.od_shop_photo_url), '') as shop_photo_url,
        p.od_listing_lat as listing_lat,
        p.od_listing_lng as listing_lng,
        (
          select nullif(trim(c.payload->>'rating'), '')::numeric
          from public.od_place_details_cache c
          where p.od_google_place_id is not null
            and trim(p.od_google_place_id) <> ''
            and c.place_id = trim(p.od_google_place_id)
            and c.expires_at > now()
          limit 1
        ) as rating,
        (
          select nullif(trim(c.payload->>'userRatingCount'), '')::int
          from public.od_place_details_cache c
          where p.od_google_place_id is not null
            and trim(p.od_google_place_id) <> ''
            and c.place_id = trim(p.od_google_place_id)
            and c.expires_at > now()
          limit 1
        ) as rating_count,
        (
          select nullif(trim((c.payload->'photos'->0)->>'name'), '')
          from public.od_place_details_cache c
          where p.od_google_place_id is not null
            and trim(p.od_google_place_id) <> ''
            and c.place_id = trim(p.od_google_place_id)
            and c.expires_at > now()
          limit 1
        ) as google_place_photo_name,
        (
          select coalesce(
            jsonb_agg(
              jsonb_build_object(
                'id', s.id,
                'name', s.name,
                'description', s.description
              )
              order by s.sort_order, s.name
            ),
            '[]'::jsonb
          )
          from public.od_shop_services s
          where s.owner_id = p.id
            and s.is_active = true
        ) as services
      from public.profiles p
      where p.role = 'owner'
        and p.slug is not null
        and trim(p.slug) <> ''
        and p.od_directory_visible = true
        and p.access = 'active'
      order by p.business_name
      limit lim
    ) t
  ), '[]'::jsonb);
end;
$$;

grant execute on function public.get_od_member_directory_preview(int) to authenticated;

create or replace function public.get_public_handle_page(p_handle text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  h text := lower(trim(p_handle));
  prof record;
  m_display text;
  m_user text;
  m_status text;
  m_from timestamptz;
  m_until timestamptz;
  m_active boolean;
  place_payload jsonb;
begin
  if p_handle is null or length(trim(p_handle)) < 2 or length(trim(p_handle)) > 63 then
    return jsonb_build_object('error', 'invalid_handle');
  end if;

  select
    p.slug,
    p.business_name,
    p.od_listing_area,
    p.od_discount_summary,
    p.od_maps_url,
    p.od_logo_url,
    p.od_shop_photo_url,
    p.od_business_category,
    p.od_directory_visible,
    p.od_google_place_id
  into prof
  from public.profiles p
  where p.role = 'owner'
    and p.slug is not null
    and trim(p.slug) <> ''
    and lower(trim(p.slug)) = h
  limit 1;

  if found then
    place_payload := null;
    if prof.od_google_place_id is not null and trim(prof.od_google_place_id) <> '' then
      select c.payload into place_payload
      from public.od_place_details_cache c
      where c.place_id = trim(prof.od_google_place_id)
        and c.expires_at > now();
    end if;

    return jsonb_build_object(
      'kind', 'vendor',
      'slug', prof.slug,
      'business_name', prof.business_name,
      'listing_area', nullif(trim(prof.od_listing_area), ''),
      'discount_summary', nullif(trim(prof.od_discount_summary), ''),
      'maps_url', nullif(trim(prof.od_maps_url), ''),
      'logo_url', nullif(trim(prof.od_logo_url), ''),
      'shop_photo_url', nullif(trim(prof.od_shop_photo_url), ''),
      'business_category', nullif(trim(prof.od_business_category), ''),
      'directory_visible', prof.od_directory_visible,
      'google_place_id', nullif(trim(prof.od_google_place_id), ''),
      'place_details', place_payload
    );
  end if;

  select mp.display_name, mp.public_username, om.status, om.valid_from, om.valid_until
  into m_display, m_user, m_status, m_from, m_until
  from public.member_profiles mp
  left join public.od_memberships om on om.member_id = mp.id
  where mp.public_username is not null
    and trim(mp.public_username) <> ''
    and lower(trim(mp.public_username)) = h
  limit 1;

  if found then
    m_active :=
      m_status = 'active'
      and m_until is not null
      and m_until >= now()
      and (m_from is null or m_from <= now());

    return jsonb_build_object(
      'kind', 'member',
      'username', m_user,
      'display_name', coalesce(nullif(trim(m_display), ''), 'OD Member'),
      'membership_active', m_active
    );
  end if;

  return jsonb_build_object('error', 'not_found');
end;
$$;

grant execute on function public.get_public_handle_page(text) to anon;
grant execute on function public.get_public_handle_page(text) to authenticated;

create or replace function public.set_member_public_username(p_username text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  norm text;
begin
  if uid is null then
    return jsonb_build_object('success', false, 'error', 'not_authenticated');
  end if;

  if not exists (select 1 from public.member_profiles where id = uid) then
    return jsonb_build_object('success', false, 'error', 'not_member');
  end if;

  if p_username is null or trim(p_username) = '' then
    update public.member_profiles set public_username = null where id = uid;
    return jsonb_build_object('success', true);
  end if;

  norm := lower(trim(p_username));

  if norm !~ '^[a-z0-9][a-z0-9_-]{1,61}$' then
    return jsonb_build_object('success', false, 'error', 'invalid_format');
  end if;

  if exists (
    select 1 from public.profiles
    where role = 'owner' and slug is not null and lower(trim(slug)) = norm
  ) then
    return jsonb_build_object('success', false, 'error', 'taken');
  end if;

  if exists (
    select 1 from public.member_profiles
    where id <> uid and public_username is not null and lower(trim(public_username)) = norm
  ) then
    return jsonb_build_object('success', false, 'error', 'taken');
  end if;

  update public.member_profiles set public_username = norm where id = uid;
  return jsonb_build_object('success', true);
end;
$$;

grant execute on function public.set_member_public_username(text) to authenticated;

create table if not exists public.od_place_search_cache (
  query_key text primary key,
  query text not null,
  region text not null default 'my',
  payload jsonb not null,
  expires_at timestamptz not null,
  updated_at timestamptz not null default now()
);

create index if not exists od_place_search_cache_expires_idx
  on public.od_place_search_cache (expires_at);

alter table public.od_place_search_cache enable row level security;

create or replace function public.get_od_place_search_cache(
  p_query text,
  p_region text default 'my'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  norm_query text;
  norm_region text;
  k text;
  cached jsonb;
begin
  if auth.uid() is null then
    return jsonb_build_object('success', false, 'error', 'not_authenticated');
  end if;
  norm_query := lower(trim(coalesce(p_query, '')));
  norm_region := lower(trim(coalesce(p_region, 'my')));
  if norm_query = '' then
    return jsonb_build_object('success', false, 'error', 'invalid_query');
  end if;
  k := norm_region || '|' || norm_query;

  select c.payload
    into cached
  from public.od_place_search_cache c
  where c.query_key = k
    and c.expires_at > now();

  return jsonb_build_object('success', true, 'payload', coalesce(cached, '[]'::jsonb));
end;
$$;

create or replace function public.upsert_od_place_search_cache(
  p_query text,
  p_region text,
  p_payload jsonb,
  p_ttl_days int default 30
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  norm_query text;
  norm_region text;
  ttl_days int;
  k text;
begin
  if auth.uid() is null then
    return jsonb_build_object('success', false, 'error', 'not_authenticated');
  end if;
  norm_query := lower(trim(coalesce(p_query, '')));
  norm_region := lower(trim(coalesce(p_region, 'my')));
  if norm_query = '' then
    return jsonb_build_object('success', false, 'error', 'invalid_query');
  end if;
  if p_payload is null or jsonb_typeof(p_payload) <> 'array' then
    return jsonb_build_object('success', false, 'error', 'invalid_payload');
  end if;

  ttl_days := greatest(1, least(coalesce(p_ttl_days, 30), 90));
  k := norm_region || '|' || norm_query;

  insert into public.od_place_search_cache as c (
    query_key,
    query,
    region,
    payload,
    expires_at,
    updated_at
  )
  values (
    k,
    norm_query,
    norm_region,
    p_payload,
    now() + make_interval(days => ttl_days),
    now()
  )
  on conflict (query_key) do update
    set payload = excluded.payload,
        expires_at = excluded.expires_at,
        updated_at = now();

  return jsonb_build_object('success', true);
end;
$$;

grant execute on function public.get_od_place_search_cache(text, text) to authenticated;
grant execute on function public.upsert_od_place_search_cache(text, text, jsonb, int) to authenticated;
