// Car Connect demo seed script.
// Usage: node scripts/seed.mjs
// Requires: .env.local with SUPABASE_SERVICE_ROLE_KEY, NEXT_PUBLIC_SUPABASE_URL
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

function loadEnv() {
  try {
    const text = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
    for (const line of text.split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)=(.*)$/);
      if (!m) continue;
      const [key, value] = [m[1], m[2].trim().replace(/^"(.*)"$/, "$1")];
      process.env[key] = value;
    }
  } catch {
    // no .env.local
  }
}

loadEnv();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const CARS = [
  { brand: "Maruti Suzuki", model: "Swift", variant: "VXI", year: 2021, km: 24500, fuel: "Petrol", price: 480000, city: "Jaipur", owner: "1st", transmission: "Manual", desc: "Single owner, properly maintained, service records available." },
  { brand: "Hyundai", model: "i20", variant: "Sportz", year: 2022, km: 18000, fuel: "Petrol", price: 680000, city: "Jaipur", owner: "1st", transmission: "Manual", desc: "Showroom condition, alloy wheels, rear camera." },
  { brand: "Maruti Suzuki", model: "Baleno", variant: "Alpha", year: 2020, km: 38000, fuel: "Petrol", price: 620000, city: "Jaipur", owner: "2nd", transmission: "AMT", desc: "Automatic, both keys, new tyres." },
  { brand: "Tata", model: "Nexon", variant: "XZ+", year: 2023, km: 10000, fuel: "Diesel", price: 850000, city: "Jaipur", owner: "1st", transmission: "Manual", desc: "Under warranty, excellent condition." },
  { brand: "Maruti Suzuki", model: "Celerio", variant: "VXI", year: 2019, km: 52000, fuel: "CNG", price: 330000, city: "Jaipur", owner: "1st", transmission: "Manual", desc: "CNG fitted from factory, great for city." },
  { brand: "Hyundai", model: "Creta", variant: "SX", year: 2021, km: 30000, fuel: "Diesel", price: 1150000, city: "Ajmer", owner: "1st", transmission: "Manual", desc: "Sunroof, full service history." },
  { brand: "Mahindra", model: "Bolero", variant: "ZLX", year: 2018, km: 65000, fuel: "Diesel", price: 560000, city: "Ajmer", owner: "2nd", transmission: "Manual", desc: "Strong SUV, new battery." },
  { brand: "Kia", model: "Seltos", variant: "HTX", year: 2022, km: 22000, fuel: "Petrol", price: 1350000, city: "Udaipur", owner: "1st", transmission: "Automatic", desc: "Top variant, 6 airbags, premium feel." },
];

const DEALERS = [
  {
    email: "gaurav@rajputcars.com",
    password: "demo@1234",
    full_name: "Gaurav Rajput",
    phone: "9829000001",
    dealership_name: "Rajput Motors",
    owner_name: "Gaurav Rajput",
    business_type: "showroom",
    gstin: "08AAAAA0000A1Z5",
    city: "Jaipur",
    state: "Rajasthan",
    address: "12, Ashok Marg, C-Scheme, Jaipur",
    bio: "Since 2010 — trusted used cars in Jaipur.",
    verified: true,
  },
  {
    email: "rahul@shekharmotors.com",
    password: "demo@1234",
    full_name: "Rahul Shekhar",
    phone: "9829000002",
    dealership_name: "Shekhar Motors",
    owner_name: "Rahul Shekhar",
    business_type: "independent",
    gstin: "08BBBBB0000B1Z5",
    city: "Ajmer",
    state: "Rajasthan",
    address: "45, Madhupura, Ajmer",
    bio: "Good deals, transparent paperwork.",
    verified: false,
  },
];

const CUSTOMER = {
  email: "customer@demo.com",
  password: "demo@1234",
  full_name: "Amit Verma",
  phone: "9829000030",
};

async function createUser(u) {
  const { data, error } = await supabase.auth.admin.createUser({
    email: u.email,
    password: u.password,
    email_confirm: true,
    user_metadata: { full_name: u.full_name, phone: u.phone, role: u.role },
  });
  if (error && !error.message.includes("already")) {
    throw error;
  }
  // If user already exists, fetch it.
  if (!data?.user) {
    const { data: list } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const existing = list?.users.find((x) => x.email === u.email);
    if (!existing) throw new Error(`Could not find user ${u.email}`);
    return existing;
  }
  return data.user;
}

async function main() {
  console.log("Seeding Car Connect demo data…");

  const adminUser = await createUser({
    email: "admin@carconnect.in",
    password: "admin@1234",
    full_name: "Car Connect Admin",
    phone: "9829000000",
    role: "customer",
  });
  const { error: adminRoleErr } = await supabase
    .from("users")
    .update({ role: "customer", is_admin: true })
    .eq("id", adminUser.id);
  if (adminRoleErr) console.warn("admin role set failed:", adminRoleErr.message);
  console.log(`✔ Admin: admin@carconnect.in / admin@1234`);

  const customerUser = await createUser({ ...CUSTOMER, role: "customer" });
  console.log(`✔ Customer: ${CUSTOMER.email} / ${CUSTOMER.password}`);

  const dealerUsers = {};
  for (const d of DEALERS) {
    const u = await createUser({ ...d, role: "dealer" });
    dealerUsers[d.email] = u;
    const { error: roleErr } = await supabase.from("users").update({ role: "dealer" }).eq("id", u.id);
    if (roleErr) console.warn("dealer role set failed:", roleErr.message);

    const { data: dealerRow, error: dealerErr } = await supabase
      .from("dealers")
      .insert({
        user_id: u.id,
        dealership_name: d.dealership_name,
        owner_name: d.owner_name,
        phone: d.phone,
        whatsapp: d.phone,
        email: d.email,
        business_type: d.business_type,
        gstin: d.gstin,
        city: d.city,
        state: d.state,
        address: d.address,
        bio: d.bio,
        verified: d.verified,
        verified_at: d.verified ? new Date().toISOString() : null,
      })
      .select()
      .single();
    if (dealerErr && !dealerErr.message.includes("duplicate")) throw dealerErr;
    dealerUsers[d.email].dealer_id = dealerRow?.id;
    d.id = dealerRow?.id;
    console.log(`✔ Dealer: ${d.dealership_name} (${d.city})`);
  }

  // Cars for each dealer (mostly active; every 5th is sold).
  let carCount = 0;
  for (let i = 0; i < CARS.length; i++) {
    const car = CARS[i];
    const dealer = DEALERS[i % DEALERS.length];
    const status = i % 5 === 4 ? "sold" : "active";
    const { data: v, error } = await supabase
      .from("vehicles")
      .insert({
        dealer_id: dealer.id,
        brand: car.brand,
        model: car.model,
        variant: car.variant,
        year: car.year,
        km: car.km,
        fuel: car.fuel,
        owner: car.owner,
        transmission: car.transmission,
        price: car.price,
        city: car.city,
        description: car.desc,
        status,
      })
      .select()
      .single();
    if (error) {
      console.warn("vehicle insert skipped:", error.message);
      continue;
    }
    await supabase.from("vehicle_images").insert({
      vehicle_id: v.id,
      url: `https://images.unsplash.com/photo-1592198084033-aade902d1aae?w=1200&q=70`,
      position: 0,
    });
    carCount++;
  }
  console.log(`✔ Cars seeded: ${carCount}`);

  // A sell listing from the customer + a dealer offer.
  const { data: listing } = await supabase
    .from("customer_sell_listings")
    .insert({
      user_id: customerUser.id,
      brand: "Maruti Suzuki",
      model: "WagonR",
      variant: "LXI",
      year: 2019,
      km: 41000,
      fuel: "Petrol",
      owner: "1st",
      transmission: "Manual",
      city: "Jaipur",
      expected_price: 320000,
      description: "Family car, single owner, no accident. Selling because upgrading.",
      photos: JSON.stringify([]),
      contact_name: "Amit Verma",
      contact_phone: "9829000030",
      status: "open",
    })
    .select()
    .single();
  if (listing) {
    await supabase.from("dealer_offers").insert({
      listing_id: listing.id,
      dealer_id: DEALERS[0].id,
      offer_price: 290000,
      message: "Cash deal immediately, aaj hi final kar sakte hain.",
    });
    console.log("✔ Sell listing + offer seeded");
  }

  console.log("\nDone! Logins:");
  console.log("  Admin:    admin@carconnect.in / admin@1234");
  console.log("  Customer: customer@demo.com / demo@1234");
  console.log("  Dealer 1: gaurav@rajputcars.com / demo@1234 (verified)");
  console.log("  Dealer 2: rahul@shekharmotors.com / demo@1234 (unverified)");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});