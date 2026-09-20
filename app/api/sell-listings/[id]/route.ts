import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(_request: NextRequest, ctx: RouteContext<"/api/sell-listings/[id]">) {
  const { id } = await ctx.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Not authenticated" }, { status: 401 });

  const { data: listing } = await supabase
    .from("customer_sell_listings")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!listing) return Response.json({ error: "Listing not found" }, { status: 404 });

  // Owner can read full detail (offers included).
  const { data: offers } = listing.user_id === user.id
    ? await supabase
        .from("dealer_offers")
        .select("*, dealer:dealers(*)")
        .eq("listing_id", id)
        .order("created_at", { ascending: false })
    : { data: [] };

  const { data: myOffer } = listing.user_id !== user.id
    ? await supabase
        .from("dealer_offers")
        .select("*")
        .eq("listing_id", id)
        .eq("dealer_id", (await supabase.from("dealers").select("id").eq("user_id", user.id).maybeSingle()).data?.id ?? "")
        .maybeSingle()
    : { data: null };

  return Response.json({ listing, offers: offers ?? [], my_offer: myOffer ?? null });
}

export async function PUT(request: NextRequest, ctx: RouteContext<"/api/sell-listings/[id]">) {
  const { id } = await ctx.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Not authenticated" }, { status: 401 });

  const { action } = await request.json();
  if (!["sold", "closed"].includes(action)) {
    return Response.json({ error: "Invalid action" }, { status: 400 });
  }

  const { data: listing } = await supabase
    .from("customer_sell_listings")
    .select("id")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!listing) return Response.json({ error: "Listing not found" }, { status: 404 });

  const { error } = await supabase
    .from("customer_sell_listings")
    .update({ status: action === "sold" ? "sold" : "closed", updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}