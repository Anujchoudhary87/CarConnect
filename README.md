# Car Connect 🚘

Used-car marketplace for local Indian dealers & customers — list, buy, sell, dealer-to-dealer, admin approvals.

Built with **Next.js 16**, **TypeScript**, **Tailwind CSS v4**, **Supabase** (Postgres + Auth + Storage), **Leaflet/OpenStreetMap**, deployed on **Vercel**.

## Setup (local)

1. **Supabase project** — create a free project at [supabase.com](https://supabase.com).
2. **Run the schema** — open SQL Editor and paste the whole `supabase/schema.sql`. This creates all tables, RLS policies, the `vehicle-images` storage bucket, and the `handle_new_user` trigger.
3. **Make yourself admin** — sign up once in the app, then run the UPDATE statement at the end of `schema.sql` with your user id.
4. **Environment** — copy the example file and fill in values from Supabase Dashboard → Settings → API:

   ```bash
   cp .env.local.example .env.local
   ```

   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (optional — only needed for the seed script)
   - `NEXT_PUBLIC_APP_URL`

5. **Install & run**

   ```bash
   npm install
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000).

> Run Node 22+ to avoid the supabase-js EBADENGINE warning (Node 20 works but logs the warning).

### Seed demo data (optional)

```bash
node scripts/seed.mjs
```

Creates an admin, a customer, two dealers, cars, and a sell listing + offer.

| Role | Email | Password |
| --- | --- | --- |
| Admin | `admin@carconnect.in` | `admin@1234` |
| Customer | `customer@demo.com` | `demo@1234` |
| Dealer (verified) | `gaurav@rajputcars.com` | `demo@1234` |
| Dealer (unverified) | `rahul@shekharmotors.com` | `demo@1234` |

## Features

- **Gaadi Kharido (Buy)** — marketplace with search, brand/price/year/KM filters, Nearby location (radius) filter, distance sorting, save (favorites), car detail page with gallery, specs, dealer card, map, and Call/WhatsApp/enquiry/test-drive contact bar.
- **Apni Gaadi Becho (Sell)** — customers list their car; verified dealers view it and submit offers; the owner accepts/rejects/marks sold.
- **Dealer Panel** — inventory (Add/Edit/Sold/Relist/Delete), Customer Enquiries & Test Drive inbox, Dealer Network (browse other dealers' cars + send interest + inbox), My Offers on customer cars, Dealer Profile.
- **Dealer Onboarding** — profile + verification docs; admin approves; verified dealers unlock Sell-My-Car listings and get the badge.
- **Admin Panel** — overview counts, verify/unverify dealers (with proof links), approve/reject/delete car listings, manage sell listings.

## Workflow notes

- New dealer cars list with `status = 'pending'` and only appear publicly after the admin approves them.
- `proxy.ts` (Next 16 middleware) guards `/dealer`, `/admin`, `/favorites`, `/sell`, `/account`.
- All writes go through Route Handlers under `/api/*`; reads use the Supabase server client + RLS.
- Supabase needs an email confirmation setting for production signups.

## Project structure

```
app/
  (landing, auth, become-dealer, marketplace, cars/[id], sell, favorites, account, dealer/*, admin, docs/setup)
app/api/      → route handlers (vehicles, marketplace, sell-listings, offers, enquiries,
                test-drives, favorites, geocode, dealer profile/verification, admin, dealer-interests)
components/   → UI kit + feature components (CarCard, Marketplace, CarForm, SellForm,
                SellListingDetail, PhotoUpload, DocUpload, LocationPicker, LeafletMap…)
lib/          → supabase clients, auth guards, env, formatting, geo (haversine/bbox), types
supabase/     → schema.sql (all tables, RLS, storage, triggers, admin SQL)
scripts/      → seed.mjs
```

## Deploy to Vercel

1. Push to GitHub and import the repo in Vercel.
2. Add the environment variables above (production).
3. Deploy. The `npm run build` step runs automatically.

See `/docs/setup` (visible on the live app) for a human-readable walkthrough.