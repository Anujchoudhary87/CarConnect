import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Please login as a dealer" }, { status: 401 });

  const { listing_id, offer_price, message } = await request.json();
  if (!listing_id || !offer_price || Number(offer_price) <= 0) {
    return Response.json({ error: "Offer price is required" }, { status: 400 });
  }

  const { data: dealer } = await supabase
    .from("dealers")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!dealer) return Response.json({ error: "Set up your dealer profile first" }, { status: 400 });

  const { data: listing } = await supabase
    .from("customer_sell_listings")
    .select("id, status")
    .eq("id", listing_id)
    .maybeSingle();
  if (!listing) return Response.json({ error: "Listing not found" }, { status: 404 });
  if (listing.status !== "open") return Response.json({ error: "This listing is no longer open" }, { status: 400 });

  const { data: existing } = await supabase
    .from("dealer_offers")
    .select("id, status")
    .eq("listing_id", listing_id)
    .eq("dealer_id", dealer.id)
    .maybeSingle();

  if (existing) {
    if (existing.status === "withdrawn") {
      // Reactivate a withdrawn offer.
      const { error } = await supabase
        .from("dealer_offers")
        .update({ offer_price: Number(offer_price), message: message ?? "", status: "pending", updated_at: new Date().toISOString() })
        .eq("id", existing.id);
      if (error) return Response.json({ error: error.message }, { status: 500 });
      return Response.json({ ok: true });
    }
    return Response.json({ error: "Aapne pehle se offer bhej diya hai is car pe" }, { status: 400 });
  }

  const { error } = await supabase.from("dealer_offers").insert({
    listing_id,
    dealer_id: dealer.id,
    offer_price: Number(offer_price),
    message: message ?? "",
  });
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}