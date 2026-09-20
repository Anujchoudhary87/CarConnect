import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Owner can accept/reject an offer; the dealer can withdraw their own offer.
export async function PUT(request: NextRequest, ctx: RouteContext<"/api/offers/[id]">) {
  const { id } = await ctx.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Not authenticated" }, { status: 401 });

  const { status } = await request.json();
  if (!["accepted", "rejected", "withdrawn"].includes(status)) {
    return Response.json({ error: "Invalid status" }, { status: 400 });
  }

  const { data: offer } = await supabase
    .from("dealer_offers")
    .select("id, listing_id, dealer_id")
    .eq("id", id)
    .maybeSingle();
  if (!offer) return Response.json({ error: "Offer not found" }, { status: 404 });

  const { data: dealer } = await supabase
    .from("dealers")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  // Determine who is making the change.
  const isDealer = dealer?.id === offer.dealer_id && status === "withdrawn";
  const { data: listing } = !isDealer
    ? await supabase
        .from("customer_sell_listings")
        .select("user_id")
        .eq("id", offer.listing_id)
        .maybeSingle()
    : { data: null };
  const isOwner = listing?.user_id === user.id;

  if (!isDealer && !isOwner) {
    return Response.json({ error: "Not allowed" }, { status: 403 });
  }

  const { error } = await supabase
    .from("dealer_offers")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}