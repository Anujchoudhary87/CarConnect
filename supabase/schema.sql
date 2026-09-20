-- =============================================================
-- CarBazaar (MVP) schema
-- Used-car platform for local Indian dealers and customers.
--
-- IMPORTANT: This file must be run IN ORDER (top to bottom).
-- The statements are staged so that every table exists before the
-- functions and policies that reference it, because `language sql`
-- functions are parsed/validated at creation time and policies are
-- validated when created. Run the whole file once in the Supabase
-- SQL editor. It is not idempotent (no IF NOT EXISTS on tables).
-- =============================================================

-- ---------- Storage bucket for vehicle photos ----------
insert into storage.buckets (id, name, public)
values ('vehicle-images', 'vehicle-images', true)
on conflict (id) do nothing;

create policy "public read vehicle images" on storage.objects
  for select using (bucket_id = 'vehicle-images');
create policy "authenticated upload vehicle images" on storage.objects
  for insert to authenticated with check (bucket_id = 'vehicle-images');
create policy "authenticated update vehicle images" on storage.objects
  for update to authenticated using (bucket_id = 'vehicle-images');
create policy "authenticated delete vehicle images" on storage.objects
  for delete to authenticated using (bucket_id = 'vehicle-images' and owner = auth.uid());

-- ---------- users (profiles, one row per auth user) ----------
create table public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '',
  phone text default '',
  role text not null default 'customer' check (role in ('customer', 'dealer', 'admin')),
  is_admin boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index users_role_idx on public.users (role);

alter table public.users enable row level security;

create policy "public can read profiles"
  on public.users for select using (true);
create policy "user can update own profile"
  on public.users for update using (auth.uid() = id)
  with check (auth.uid() = id);
create policy "user can insert own profile"
  on public.users for insert with check (auth.uid() = id);

-- Auto-create a profile row when someone signs up.
-- (Only after public.users exists.)
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  insert into public.users (id, full_name, phone, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce(new.raw_user_meta_data ->> 'phone', ''),
    coalesce(new.raw_user_meta_data ->> 'role', 'customer')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ---------- Helper functions (depend on public.users) ----------
create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (select 1 from public.users where id = auth.uid() and is_admin = true);
$$;

create or replace function public.is_dealer()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (select 1 from public.users where id = auth.uid() and role = 'dealer');
$$;

-- ---------- dealers ----------
create table public.dealers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.users (id) on delete cascade,
  dealership_name text not null,
  owner_name text default '',
  phone text default '',
  whatsapp text default '',
  email text default '',
  business_type text default 'showroom' check (business_type in ('showroom', 'independent', 'online', 'franchise')),
  gstin text default '',
  city text default '',
  state text default '',
  address text default '',
  lat double precision,
  lng double precision,
  bio text default '',
  verified boolean not null default false,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index dealers_user_idx on public.dealers (user_id);
create index dealers_city_idx on public.dealers (city);
create index dealers_verified_idx on public.dealers (verified);

alter table public.dealers enable row level security;

create policy "public can read dealers"
  on public.dealers for select using (true);
create policy "dealer can create own profile"
  on public.dealers for insert to authenticated
  with check (user_id = auth.uid() and public.is_dealer());
create policy "dealer can update own profile"
  on public.dealers for update to authenticated
  using (user_id = auth.uid() and public.is_dealer())
  with check (user_id = auth.uid() and public.is_dealer());
create policy "admin can update dealers"
  on public.dealers for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy "dealer can delete own profile"
  on public.dealers for delete to authenticated
  using (user_id = auth.uid());

-- ---------- Helper functions (depend on public.dealers) ----------
create or replace function public.is_verified_dealer()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (select 1 from public.dealers where user_id = auth.uid() and verified = true);
$$;

create or replace function public.is_dealer_owner(check_dealer_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (select 1 from public.dealers where id = check_dealer_id and user_id = auth.uid());
$$;

-- ---------- dealer_verification ----------
create table public.dealer_verification (
  id uuid primary key default gen_random_uuid(),
  dealer_id uuid not null references public.dealers (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  id_proof_path text default '',
  business_proof_path text default '',
  notes text default '',
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  admin_note text default '',
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz
);

create index dealer_verification_dealer_idx on public.dealer_verification (dealer_id);
create index dealer_verification_status_idx on public.dealer_verification (status);

alter table public.dealer_verification enable row level security;

create policy "dealer submits own verification"
  on public.dealer_verification for insert to authenticated
  with check (user_id = auth.uid());
create policy "owner or admin can read verification"
  on public.dealer_verification for select
  using (user_id = auth.uid() or public.is_admin());
create policy "owner updates own verification"
  on public.dealer_verification for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "admin can review verification"
  on public.dealer_verification for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ---------- vehicles (cars listed by dealers) ----------
create table public.vehicles (
  id uuid primary key default gen_random_uuid(),
  dealer_id uuid not null references public.dealers (id) on delete cascade,
  brand text not null,
  model text not null,
  variant text default '',
  year integer not null check (year between 1980 and 2100),
  fuel text not null check (fuel in ('Petrol', 'Diesel', 'CNG', 'Electric', 'Hybrid', 'LPG')),
  km integer not null default 0 check (km >= 0),
  owner text not null default '1st' check (owner in ('1st', '2nd', '3rd', '4th')),
  transmission text not null default 'Manual' check (transmission in ('Manual', 'Automatic', 'AMT', 'CVT', 'DCT')),
  price numeric(12, 2) not null check (price >= 0),
  city text default '',
  description text default '',
  lat double precision,
  lng double precision,
  status text not null default 'pending' check (status in ('pending', 'active', 'sold', 'rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index vehicles_dealer_idx on public.vehicles (dealer_id);
create index vehicles_status_idx on public.vehicles (status);
create index vehicles_brand_idx on public.vehicles (brand);
create index vehicles_model_idx on public.vehicles (model);
create index vehicles_city_idx on public.vehicles (city);
create index vehicles_price_idx on public.vehicles (price);
create index vehicles_year_idx on public.vehicles (year);
create index vehicles_fuel_idx on public.vehicles (fuel);
create index vehicles_lat_idx on public.vehicles (lat);
create index vehicles_lng_idx on public.vehicles (lng);

alter table public.vehicles enable row level security;

create policy "public can read active vehicles"
  on public.vehicles for select
  using (status = 'active');
create policy "dealer reads own vehicles"
  on public.vehicles for select to authenticated
  using (public.is_dealer_owner(dealer_id) or public.is_admin());
create policy "dealer inserts own vehicles"
  on public.vehicles for insert to authenticated
  with check (public.is_dealer_owner(dealer_id));
create policy "dealer updates own vehicles"
  on public.vehicles for update to authenticated
  using (public.is_dealer_owner(dealer_id) or public.is_admin())
  with check (public.is_dealer_owner(dealer_id) or public.is_admin());
create policy "dealer deletes own vehicles"
  on public.vehicles for delete to authenticated
  using (public.is_dealer_owner(dealer_id) or public.is_admin());

-- ---------- vehicle_images ----------
create table public.vehicle_images (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.vehicles (id) on delete cascade,
  url text not null,
  position integer not null default 0,
  created_at timestamptz not null default now()
);

create index vehicle_images_vehicle_idx on public.vehicle_images (vehicle_id);

alter table public.vehicle_images enable row level security;

create policy "public can read vehicle images"
  on public.vehicle_images for select using (true);
create policy "owner inserts vehicle images"
  on public.vehicle_images for insert to authenticated
  with check (exists (
    select 1 from public.vehicles v
    where v.id = vehicle_id and (public.is_dealer_owner(v.dealer_id) or public.is_admin())
  ));
create policy "owner deletes vehicle images"
  on public.vehicle_images for delete to authenticated
  using (exists (
    select 1 from public.vehicles v
    where v.id = vehicle_id and (public.is_dealer_owner(v.dealer_id) or public.is_admin())
  ));

-- ---------- customer_sell_listings (Apni Gaadi Becho) ----------
create table public.customer_sell_listings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  brand text not null,
  model text not null,
  variant text default '',
  year integer not null,
  km integer not null default 0,
  fuel text not null,
  owner text not null default '1st',
  transmission text not null default 'Manual',
  city text default '',
  lat double precision,
  lng double precision,
  expected_price numeric(12, 2) not null,
  description text default '',
  photos jsonb not null default '[]'::jsonb,
  contact_name text not null default '',
  contact_phone text not null default '',
  status text not null default 'open' check (status in ('open', 'sold', 'closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index customer_sell_user_idx on public.customer_sell_listings (user_id);
create index customer_sell_status_idx on public.customer_sell_listings (status);
create index customer_sell_city_idx on public.customer_sell_listings (city);

alter table public.customer_sell_listings enable row level security;

create policy "owner creates sell listing"
  on public.customer_sell_listings for insert to authenticated
  with check (user_id = auth.uid());
create policy "owner or verified dealers can read sell listings"
  on public.customer_sell_listings for select
  using (user_id = auth.uid() or public.is_verified_dealer() or public.is_admin());
create policy "owner updates sell listing"
  on public.customer_sell_listings for update to authenticated
  using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());
create policy "owner deletes sell listing"
  on public.customer_sell_listings for delete to authenticated
  using (user_id = auth.uid() or public.is_admin());

-- ---------- dealer_offers (dealer -> customer sell listing) ----------
create table public.dealer_offers (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.customer_sell_listings (id) on delete cascade,
  dealer_id uuid not null references public.dealers (id) on delete cascade,
  offer_price numeric(12, 2) not null,
  message text default '',
  status text not null default 'pending' check (status in ('pending', 'accepted', 'rejected', 'withdrawn')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (listing_id, dealer_id)
);

create index dealer_offers_listing_idx on public.dealer_offers (listing_id);
create index dealer_offers_dealer_idx on public.dealer_offers (dealer_id);

alter table public.dealer_offers enable row level security;

create policy "dealer creates offer"
  on public.dealer_offers for insert to authenticated
  with check (public.is_dealer_owner(dealer_id));
create policy "involved parties read offers"
  on public.dealer_offers for select
  using (
    public.is_dealer_owner(dealer_id)
    or exists (select 1 from public.customer_sell_listings l where l.id = listing_id and l.user_id = auth.uid())
    or public.is_admin()
  );
create policy "involved parties update offers"
  on public.dealer_offers for update to authenticated
  using (
    public.is_dealer_owner(dealer_id)
    or exists (select 1 from public.customer_sell_listings l where l.id = listing_id and l.user_id = auth.uid())
    or public.is_admin()
  );
create policy "dealer deletes own offer"
  on public.dealer_offers for delete to authenticated
  using (public.is_dealer_owner(dealer_id));

-- ---------- enquiries (customer -> dealer) ----------
create table public.enquiries (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.vehicles (id) on delete cascade,
  dealer_id uuid not null references public.dealers (id) on delete cascade,
  user_id uuid references public.users (id) on delete set null,
  name text not null,
  phone text not null,
  message text default '',
  type text not null default 'enquiry' check (type in ('enquiry', 'test_drive', 'dealer_interest')),
  created_at timestamptz not null default now()
);

create index enquiries_dealer_idx on public.enquiries (dealer_id);
create index enquiries_vehicle_idx on public.enquiries (vehicle_id);

alter table public.enquiries enable row level security;

create policy "customer creates enquiry"
  on public.enquiries for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (select 1 from public.vehicles v where v.id = vehicle_id and v.dealer_id = public.enquiries.dealer_id)
  );
create policy "involved parties read enquiries"
  on public.enquiries for select
  using (user_id = auth.uid() or public.is_dealer_owner(dealer_id) or public.is_admin());
create policy "dealer or admin delete enquiries"
  on public.enquiries for delete to authenticated
  using (public.is_dealer_owner(dealer_id) or public.is_admin());

-- ---------- test_drive_requests ----------
create table public.test_drive_requests (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.vehicles (id) on delete cascade,
  dealer_id uuid not null references public.dealers (id) on delete cascade,
  user_id uuid references public.users (id) on delete set null,
  name text not null,
  phone text not null,
  preferred_date date,
  preferred_time text default '',
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'done', 'cancelled')),
  created_at timestamptz not null default now()
);

create index test_drive_dealer_idx on public.test_drive_requests (dealer_id);

alter table public.test_drive_requests enable row level security;

create policy "customer creates test drive request"
  on public.test_drive_requests for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (select 1 from public.vehicles v where v.id = vehicle_id and v.dealer_id = public.test_drive_requests.dealer_id)
  );
create policy "involved parties read test drive requests"
  on public.test_drive_requests for select
  using (user_id = auth.uid() or public.is_dealer_owner(dealer_id) or public.is_admin());
create policy "dealer or admin delete test drive requests"
  on public.test_drive_requests for delete to authenticated
  using (public.is_dealer_owner(dealer_id) or public.is_admin());

-- ---------- favorites (wishlist) ----------
create table public.favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  vehicle_id uuid not null references public.vehicles (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, vehicle_id)
);

create index favorites_user_idx on public.favorites (user_id);

alter table public.favorites enable row level security;

create policy "owner manages favorites"
  on public.favorites for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------- dealer_interests (dealer -> dealer) ----------
create table public.dealer_interests (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.vehicles (id) on delete cascade,
  from_dealer_id uuid not null references public.dealers (id) on delete cascade,
  to_dealer_id uuid not null references public.dealers (id) on delete cascade,
  message text default '',
  offer_price numeric(12, 2),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'rejected', 'withdrawn')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (vehicle_id, from_dealer_id)
);

create index dealer_interests_from_idx on public.dealer_interests (from_dealer_id);
create index dealer_interests_to_idx on public.dealer_interests (to_dealer_id);

alter table public.dealer_interests enable row level security;

create policy "dealer sends interest"
  on public.dealer_interests for insert to authenticated
  with check (public.is_dealer_owner(from_dealer_id));
create policy "involved dealers read interests"
  on public.dealer_interests for select
  using (public.is_dealer_owner(from_dealer_id) or public.is_dealer_owner(to_dealer_id) or public.is_admin());
create policy "involved dealers update interests"
  on public.dealer_interests for update to authenticated
  using (public.is_dealer_owner(from_dealer_id) or public.is_dealer_owner(to_dealer_id) or public.is_admin());
create policy "dealer deletes own interest"
  on public.dealer_interests for delete to authenticated
  using (public.is_dealer_owner(from_dealer_id) or public.is_admin());

-- =============================================================
-- How to make a user admin:
--   update public.users set role = 'admin', is_admin = true
--   where email = 'you@example.com';
-- =============================================================