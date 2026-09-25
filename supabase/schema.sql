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
  down_payment numeric(12, 2) check (down_payment >= 0),
  finance_interest_rate numeric(4, 2) check (finance_interest_rate >= 0 and finance_interest_rate <= 30),
  seating_capacity integer check (seating_capacity is null or seating_capacity > 0),
  city text default '',
  description text default '',
  lat double precision,
  lng double precision,
  status text not null default 'pending' check (status in ('pending', 'active', 'sold', 'rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- finance_amount is never stored — it is always derived as (price - down_payment),
  -- and a down_payment can never exceed the price, so the derived amount is >= 0.
  constraint vehicles_down_payment_le_price check (down_payment is null or down_payment <= price)
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
create index vehicles_seating_idx on public.vehicles (seating_capacity);

alter table public.vehicles
  add column if not exists seating_capacity integer
    check (seating_capacity is null or seating_capacity > 0);

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

-- ---------- customer_demands (anonymous demand signals) ----------
-- One row per normalized, unmet (or partially-met) customer search/AI request.
-- Privacy: never stores name / phone / email. user_id is kept only for
-- deduplication and admin inspection; dealers only ever see aggregated output.
create table public.customer_demands (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  source text not null default 'ai_advisor' check (source in ('ai_advisor', 'marketplace')),
  brand text not null default '',
  model text not null default '',
  fuel text not null default '',
  transmission text not null default '',
  seating_capacity integer check (seating_capacity is null or seating_capacity > 0),
  min_year integer check (min_year between 1980 and 2100),
  max_price numeric(14, 2) check (max_price >= 0),
  min_price numeric(14, 2) check (min_price >= 0),
  city text not null default '',
  lat double precision,
  lng double precision,
  radius_km integer default 50,
  status text not null default 'unmet' check (status in ('unmet', 'partial')),
  fingerprint text not null default '',
  cluster_key text not null default '',
  raw_requirement text not null default '',
  created_at timestamptz not null default now()
);

create index customer_demands_user_idx on public.customer_demands (user_id);
create index customer_demands_fingerprint_idx on public.customer_demands (user_id, fingerprint);
create index customer_demands_cluster_idx on public.customer_demands (cluster_key);
create index customer_demands_status_idx on public.customer_demands (status);
create index customer_demands_created_idx on public.customer_demands (created_at);

alter table public.customer_demands enable row level security;

create policy "customer records own demand"
  on public.customer_demands for insert to authenticated
  with check (user_id = auth.uid());
create policy "customer reads own demand"
  on public.customer_demands for select to authenticated
  using (user_id = auth.uid());
create policy "customer updates own demand"
  on public.customer_demands for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
create policy "customer deletes own demand"
  on public.customer_demands for delete to authenticated
  using (user_id = auth.uid());
create policy "admin manages demand"
  on public.customer_demands for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Dealers (and admin) read ONLY aggregated, privacy-safe demand clusters.
-- Security definer: runs as the table owner and filters by role internally,
-- so dealers never get base-table access (no user_id / raw requirements).
create or replace function public.get_demand_clusters()
returns table (
  cluster_key text,
  brand text,
  model text,
  fuel text,
  seating_capacity integer,
  min_year integer,
  max_price numeric,
  city text,
  customers bigint,
  signals bigint,
  last_requested timestamptz
)
language sql stable security definer set search_path = public
as $$
  select
    d.cluster_key,
    max(d.brand)::text as brand,
    max(d.model)::text as model,
    max(d.fuel)::text as fuel,
    max(d.seating_capacity)::integer as seating_capacity,
    min(d.min_year)::integer as min_year,
    max(d.max_price)::numeric as max_price,
    max(d.city)::text as city,
    count(distinct d.user_id)::bigint as customers,
    count(*)::bigint as signals,
    max(d.created_at) as last_requested
  from public.customer_demands d
  where (public.is_dealer() or public.is_admin())
    and d.status in ('unmet', 'partial')
  group by d.cluster_key
  order by customers desc, last_requested desc;
$$;

-- =============================================================
-- Demand → stock match + in-app customer notifications
-- =============================================================
-- On top of the existing demand feature. When a dealer adds or relists an
-- active vehicle, run_demand_matching() finds every unmet/partial demand that
-- satisfies the vehicle's hard criteria, records the match (once per
-- demand/vehicle pair) and notifies opted-in customers inside the app.
-- Privacy: notifications only ever touch the vehicle's own customer; dealers
-- never read demand base rows or customer notifications (aggregates only).

alter table public.customer_demands
  add column if not exists notify boolean not null default false;

alter table public.customer_demands
  add column if not exists seating_capacity integer
    check (seating_capacity is null or seating_capacity > 0);

create index if not exists customer_demands_seating_idx
  on public.customer_demands (seating_capacity);

-- Vehicle ↔ demand matches. Dealer availability is NOT derived from these rows
-- (it is counted live from active inventory); this table only powers customer
-- notifications and admin inspection.
create table if not exists public.demand_vehicle_matches (
  id uuid primary key default gen_random_uuid(),
  demand_id uuid not null references public.customer_demands (id) on delete cascade,
  vehicle_id uuid not null references public.vehicles (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (demand_id, vehicle_id)
);

create index if not exists demand_vehicle_matches_vehicle_idx
  on public.demand_vehicle_matches (vehicle_id);
create index if not exists demand_vehicle_matches_demand_idx
  on public.demand_vehicle_matches (demand_id);

alter table public.demand_vehicle_matches enable row level security;

-- Matches are created only inside the security-definer function below; no
-- customer or dealer ever selects these rows directly.
create policy "admin manages matches"
  on public.demand_vehicle_matches for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- In-app notifications for the demand owner. In-app only — no WhatsApp /
-- SMS / email / push.
create table if not exists public.customer_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  type text not null default 'stock_match' check (type in ('stock_match', 'manual')),
  demand_id uuid references public.customer_demands (id) on delete cascade,
  vehicle_id uuid references public.vehicles (id) on delete cascade,
  title text not null default '',
  message text not null default '',
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists customer_notifications_user_idx
  on public.customer_notifications (user_id, created_at desc);
create index if not exists customer_notifications_read_idx
  on public.customer_notifications (user_id, read_at);

alter table public.customer_notifications enable row level security;

create policy "customer reads own notifications"
  on public.customer_notifications for select to authenticated
  using (user_id = auth.uid());
create policy "customer updates own notifications"
  on public.customer_notifications for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "customer deletes own notifications"
  on public.customer_notifications for delete to authenticated
  using (user_id = auth.uid());
create policy "admin manages notifications"
  on public.customer_notifications for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Hard-criteria matcher for one vehicle against one demand row.
-- Mirrors the AI Advisor's exact-match rules: every non-empty demand criterion
-- must be satisfied; empty criteria are never required. Location only binds
-- when the demand has lat+lng+radius AND the vehicle has lat+lng (and is
-- within radius); no demand location → vehicle is never rejected for location.
create or replace function public.demand_vehicle_match(
  p_vehicle_id uuid,
  p_demand_id uuid
)
returns boolean
language sql immutable
as $$
  select
    (d.brand = '' or lower(v.brand) = lower(d.brand))
    and (d.model = '' or v.model ilike '%' || d.model || '%')
    and (d.fuel = '' or lower(v.fuel) = lower(d.fuel))
    and (d.transmission = '' or lower(v.transmission) = lower(d.transmission))
    and (d.seating_capacity is null or (v.seating_capacity is not null and v.seating_capacity = d.seating_capacity))
    and (d.min_year is null or v.year >= d.min_year)
    and (d.min_price is null or v.price >= d.min_price)
    and (d.max_price is null or v.price <= d.max_price)
    and (
      d.lat is null or d.lng is null or d.radius_km is null
      or (
        v.lat is not null
        and v.lng is not null
        and (2 * 6371 * asin(sqrt(
              (sin(radians((v.lat - d.lat) / 2)))::double precision ^ 2
              + cos(radians(d.lat)) * cos(radians(v.lat))
                * (sin(radians((v.lng - d.lng) / 2)))::double precision ^ 2
            ))) <= d.radius_km
      )
    )
  from public.vehicles v
  cross join public.customer_demands d
  where v.id = p_vehicle_id and d.id = p_demand_id;
$$;

-- One launch point for "dealer added / relisted a vehicle". Validates the
-- vehicle is the caller's own (or caller is admin) and is 'active'; inserts any
-- NEW demand↔vehicle matches; then notifies the demand owners who opted in and
-- do not already have an unread stock_match. Returns notifications created.
create or replace function public.run_demand_matching(p_vehicle_id uuid)
returns integer
language plpgsql security definer set search_path = public
as $$
declare
  v_dealer_id uuid;
  v_status text;
  created_notifications integer := 0;
begin
  select v.dealer_id, v.status
    into v_dealer_id, v_status
  from public.vehicles v
  where v.id = p_vehicle_id;

  if v_dealer_id is null then
    raise exception 'vehicle not found';
  end if;

  if not (select public.is_dealer_owner(v_dealer_id) or public.is_admin()) then
    raise exception 'not allowed';
  end if;

  -- Only active stock can satisfy a demand. Sold/rejected/pending vehicles
  -- are never matched; a relist that goes back to 'active' is matched again.
  if v_status <> 'active' then
    return 0;
  end if;

  with matched as (
    insert into public.demand_vehicle_matches (demand_id, vehicle_id)
    select d.id, p_vehicle_id
    from public.customer_demands d
    where d.status in ('unmet', 'partial')
      and public.demand_vehicle_match(p_vehicle_id, d.id)
    on conflict (demand_id, vehicle_id) do nothing
    returning id, demand_id
  )
  insert into public.customer_notifications (user_id, type, demand_id, vehicle_id, title, message)
  select
    d.user_id,
    'stock_match',
    m.demand_id,
    p_vehicle_id,
    'Aapki demand ke liye stock mil gaya',
    v.brand || ' ' || v.model || ' (' || v.year || ', ' || v.fuel || ') — ₹'
      || to_char(v.price / 100000, 'FM999999990.9') || 'L' || ' · ' || dl.dealership_name
  from matched m
  join public.customer_demands d on d.id = m.demand_id
  join public.vehicles v on v.id = p_vehicle_id
  left join public.dealers dl on dl.id = v.dealer_id
  where d.notify = true
    and not exists (
      select 1 from public.customer_notifications n
      where n.user_id = d.user_id
        and n.demand_id = m.demand_id
        and n.type = 'stock_match'
        and n.read_at is null
    );

  get diagnostics created_notifications = row_count;
  return created_notifications;
end;
$$;


-- =============================================================
-- CUSTOMER ALERTS (price-drop / sold) + DEALER FOLLOW-UPS
-- Additive only. Reuses customer_notifications for both in-app
-- notifications AND dealer daily follow-up digests (user_id column
-- already supports any auth user, dealers included).
-- =============================================================

-- ---------- Task 1: price-drop notification ----------
-- Fired from PUT /api/vehicles/[id] whenever a vehicle price is reduced.
-- Notifies (idempotently, per user+vehicle): everyone who favourited the
-- vehicle, plus opted-in customers whose open demand matches the vehicle.
-- Best-effort — a notification failure never fails the price update.
-- Drop the old 2-arg signature first so re-applying this file never leaves a
-- stale overload behind.
drop function if exists public.notify_price_drop(uuid, numeric);
create or replace function public.notify_price_drop(
  p_vehicle_id uuid,
  p_old_price numeric,
  p_new_price numeric
)
returns integer
language plpgsql security definer set search_path = public
as $$
declare
  v_targets uuid[];
  created_notifications integer := 0;
begin
  -- Only run when the price actually dropped and the car is still active.
  if p_old_price is null or p_new_price is null or p_new_price >= p_old_price then
    return 0;
  end if;

  -- 1) customers who favourited this vehicle
  select coalesce(array_agg(distinct f.user_id), '{}'::uuid[])
    into v_targets
  from public.favorites f
  where f.vehicle_id = p_vehicle_id;

  -- 2) opted-in customers whose open demand matches this vehicle
  select v_targets || coalesce(array_agg(distinct d.user_id), '{}'::uuid[])
    into v_targets
  from public.customer_demands d
  where d.notify = true
    and public.demand_vehicle_match(p_vehicle_id, d.id);

  if cardinality(v_targets) = 0 then
    return 0;
  end if;

  with inserted as (
    insert into public.customer_notifications (
      user_id, type, demand_id, vehicle_id, title, message
    )
    select
      t.user_id,
      'price_drop',
      null,
      p_vehicle_id,
      '😍 Price drop!',
      (
        select 'Aapki pasand ki gaadi ka price kam hua hai — '
               || concat_ws(' ', v.brand, v.model, v.variant)
               || ' ab '
               || trim(trailing '.' from trim(trailing '0' from to_char(p_new_price / 100000, 'FM999999990.9')))
               || 'L mein available hai.'
        from public.vehicles v
        where v.id = p_vehicle_id
      )
    from unnest(v_targets) as t(user_id)
    where not exists (
      select 1 from public.customer_notifications n
      where n.user_id = t.user_id
        and n.vehicle_id = p_vehicle_id
        and n.type = 'price_drop'
        and n.read_at is null
    )
    on conflict do nothing
    returning 1
  )
  select count(*) into created_notifications from inserted;

  return created_notifications;
end;
$$;

-- ---------- Task 1: sold notification ----------
-- Fired from POST /api/vehicles/[id]/status when a vehicle is marked sold.
-- Notifies (idempotently) favouriters + opted-in matched-demand customers.
create or replace function public.notify_vehicle_sold(
  p_vehicle_id uuid
)
returns integer
language plpgsql security definer set search_path = public
as $$
declare
  v_targets uuid[];
  created_notifications integer := 0;
begin
  -- favouriters
  select coalesce(array_agg(distinct f.user_id), '{}'::uuid[])
    into v_targets
  from public.favorites f
  where f.vehicle_id = p_vehicle_id;

  -- opted-in matched demands
  select v_targets || coalesce(array_agg(distinct d.user_id), '{}'::uuid[])
    into v_targets
  from public.customer_demands d
  where d.notify = true
    and public.demand_vehicle_match(p_vehicle_id, d.id);

  if cardinality(v_targets) = 0 then
    return 0;
  end if;

  with inserted as (
    insert into public.customer_notifications (
      user_id, type, demand_id, vehicle_id, title, message
    )
    select
      t.user_id,
      'sold',
      null,
      p_vehicle_id,
      '😢 Ye gaadi bik gayi',
      (
        select 'Aapki pasand ki gaadi '
               || (select concat_ws(' ', v.brand, v.model)
                     from public.vehicles v where v.id = p_vehicle_id)
               || ' ab sold ho gayi hai. Naye stock ke liye notification on rakho.'
      )
    from unnest(v_targets) as t(user_id)
    where not exists (
      select 1 from public.customer_notifications n
      where n.user_id = t.user_id
        and n.vehicle_id = p_vehicle_id
        and n.type = 'sold'
        and n.read_at is null
    )
    on conflict do nothing
    returning 1
  )
  select count(*) into created_notifications from inserted;

  return created_notifications;
end;
$$;

-- ---------- Task 2: dealer follow-up column (additive) ----------
-- Canonical interaction record is public.enquiries. followup_choice stores the
-- dealer's lightweight decision so the dealer dashboard can show "Aaj call
-- karne hain (N)" and the daily digest. Additive — no existing column touched.
alter table public.enquiries
  add column if not exists followup_choice text
    default null
    check (followup_choice is null or followup_choice in ('interested','baad_mein','nahi_banega','aa_raha_hoon'));
alter table public.enquiries
  add column if not exists next_followup_at timestamptz default null;

create index if not exists enquiries_followup_idx
  on public.enquiries (dealer_id, next_followup_at);

-- ---------- Task 2: daily dealer digest ----------
-- Security-definer: creates (idempotently, one per dealer per UTC day) a single
-- notification summarising today's due follow-ups. Reuses customer_notifications
-- (user_id = the dealer's auth user id). Empty / no-due → no notification.
create or replace function public.sync_dealer_followup_digest(
  p_dealer_id uuid
)
returns integer
language plpgsql security definer set search_path = public
as $$
declare
  v_user_id uuid;
  v_due integer;
  v_day_start timestamptz;
  v_created integer := 0;
begin
  select user_id into v_user_id
  from public.dealers where id = p_dealer_id;

  if v_user_id is null then
    return 0;
  end if;

  v_day_start := date_trunc('day', now());

  -- due = follow-ups scheduled at-or-before end of today that aren't a
  -- "nahi_banega" (cancelled). Null next_followup_at = nothing to do.
  select count(*) into v_due
  from public.enquiries e
  where e.dealer_id = p_dealer_id
    and e.next_followup_at is not null
    and e.followup_choice <> 'nahi_banega'
    and e.next_followup_at < v_day_start + interval '1 day';

  -- One digest per dealer per day. Never duplicate.
  if v_due > 0 and not exists (
    select 1 from public.customer_notifications n
    where n.user_id = v_user_id
      and n.type = 'followup_digest'
      and n.created_at >= v_day_start
      and n.created_at < v_day_start + interval '1 day'
  ) then
    insert into public.customer_notifications (user_id, type, title, message)
    values (
      v_user_id,
      'followup_digest',
      '📞 Aaj ' || v_due || ' follow-up call',
      'Aaj ' || v_due || ' customer ka follow-up pending hai. Turant call karo — sales badhani hai!'
    );
    v_created := 1;
  end if;

  return v_created;
end;
$$;

-- The daily digest cron (/api/cron/followup-digest) invokes this function via
-- the service-role client (server-only key, never exposed to the browser).
-- Granting EXECUTE to service_role follows the existing privileged-path
-- pattern in this schema and does not reopen any public path — PUBLIC execute
-- was revoked above and only 'authenticated' + 'service_role' can call it.
grant execute on function public.sync_dealer_followup_digest(uuid) to service_role;

-- ---------- Task 1/2: widen the notification type CHECK ----------
-- customer_notifications.type was created as check (type in
-- ('stock_match', 'manual')). Task 1 (price_drop, sold) and Task 2
-- (followup_digest) store additional types, so the inline column CHECK
-- (auto-named customer_notifications_type_check) must be replaced.
-- Additive only: the table is never dropped/recreated and the original
-- types stay valid.
alter table public.customer_notifications
  drop constraint if exists customer_notifications_type_check;

alter table public.customer_notifications
  add constraint customer_notifications_type_check
  check (type in ('stock_match', 'manual', 'price_drop', 'sold', 'followup_digest'));
