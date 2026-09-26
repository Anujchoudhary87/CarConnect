-- Dealer location becomes the default listing location.
--
-- 1. public.vehicles gains the same address fields the dealer profile already
--    has (city existed already), so a listing stores a full, self-contained
--    location: city, state, address, lat, lng.
-- 2. Existing listings are backfilled from their own dealer's saved profile
--    location, but ONLY for fields that are missing/empty. A listing that
--    already has a valid location (including a per-vehicle override such as
--    "Chirawa") is left untouched, and the dealer profile is never modified.
--
-- No new tables and no new RLS policies: "dealer can update own profile"
-- (user_id = auth.uid()) and "dealer inserts/updates own vehicles"
-- (is_dealer_owner(dealer_id)) already restrict a dealer to their own rows.

begin;

alter table public.vehicles
  add column if not exists state text default '',
  add column if not exists address text default '';

-- Backfill: fill only empty location fields from the owning dealer's profile.
update public.vehicles v
set
  city = coalesce(nullif(btrim(v.city), ''), nullif(btrim(d.city), ''), ''),
  state = coalesce(nullif(btrim(v.state), ''), nullif(btrim(d.state), ''), ''),
  address = coalesce(nullif(btrim(v.address), ''), nullif(btrim(d.address), ''), ''),
  lat = coalesce(v.lat, d.lat),
  lng = coalesce(v.lng, d.lng)
from public.dealers d
where d.id = v.dealer_id
  and (
    v.lat is null
    or v.lng is null
    or btrim(coalesce(v.city, '')) = ''
    or btrim(coalesce(v.state, '')) = ''
  );

commit;
