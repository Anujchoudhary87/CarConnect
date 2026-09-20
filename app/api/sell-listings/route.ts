import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface SellListingInput {
  brand?: string;
  model?: string;
  variant?: string;
  year?: number;
  km?: number;
  fuel?: string;
  owner?: string;
  transmission?: string;
  city?: string;
  lat?: number | null;
  lng?: number | null;
  expected_price?: number;
  description?: string;
  photos?: string[];
  contact_name?: string;
  contact_phone?: string;
}

const REQUIRED = ["brand", "model", "year", "km", "fuel", "expected_price", "contact_name", "contact_phone"];

function validate(b: SellListingInput): string | null {
  for (const key of REQUIRED) {
    const v = b[key as keyof SellListingInput];
    if (v === undefined || v === "" || v === null) return `${key} is required`;
  }
  if (isNaN(Number(b.year)) || isNaN(Number(b.km)) || isNaN(Number(b.expected_price))) {
    return "Year, KM and expected price must be valid numbers";
  }
  return null;
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Please login to list your car" }, { status: 401 });

  const body = (await request.json()) as SellListingInput;
  const err = validate(body);
  if (err) return Response.json({ error: err }, { status: 400 });

  const { data, error } = await supabase
    .from("customer_sell_listings")
    .insert([
      {
        user_id: user.id,
        brand: body.brand,
        model: body.model,
        variant: body.variant ?? "",
        year: Number(body.year),
        km: Number(body.km),
        fuel: body.fuel,
        owner: body.owner ?? "1st",
        transmission: body.transmission ?? "Manual",
        city: body.city ?? "",
        lat: body.lat ?? null,
        lng: body.lng ?? null,
        expected_price: Number(body.expected_price),
        description: body.description ?? "",
        photos: body.photos ?? [],
        contact_name: body.contact_name,
        contact_phone: body.contact_phone,
        status: "open",
      },
    ])
    .select("*")
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ listing: data }, { status: 201 });
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ listings: [] }, { status: 200 });

  const { data } = await supabase
    .from("customer_sell_listings")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const listings = (data ?? []) as Array<Record<string, unknown> & { id: string }>;

  let offerCounts: Record<string, number> = {};
  if (listings.length > 0) {
    const { data: offers } = await supabase
      .from("dealer_offers")
      .select("listing_id")
      .in("listing_id", listings.map((l) => l.id));
    offerCounts = ((offers ?? []) as Array<{ listing_id: string }>).reduce<Record<string, number>>(
      (acc, o) => {
        acc[o.listing_id] = (acc[o.listing_id] ?? 0) + 1;
        return acc;
      },
      {},
    );
  }

  return Response.json({
    listings: listings.map((l) => ({ ...l, offer_count: offerCounts[l.id] ?? 0 })),
  });
}