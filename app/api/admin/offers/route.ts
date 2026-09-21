import { requireAdminApi } from "@/lib/auth";

export async function GET() {
  const admin = await requireAdminApi();
  if (!admin) return Response.json({ error: "Not authenticated" }, { status: 401 });
  const supabase = admin.supabase;

  const [{ data: offers }, { data: users }] = await Promise.all([
    supabase
      .from("dealer_offers")
      .select("id, offer_price, status, created_at, listing:customer_sell_listings(brand, model, variant, user_id), dealer:dealers(dealership_name, verified)")
      .order("created_at", { ascending: false })
      .limit(200),
    supabase.from("users").select("id, full_name, phone"),
  ]);

  const userMap = new Map((users ?? []).map((u) => [u.id, u]));
  const pick = (x: unknown) => (Array.isArray(x) ? (x as unknown[])[0] : x);
  const rows = (offers ?? []).map((o) => {
    const listing = pick(o.listing) as
      | { brand?: string; model?: string; variant?: string; user_id?: string }
      | undefined;
    const dealer = pick(o.dealer) as { dealership_name?: string; verified?: boolean } | undefined;
    const owner = userMap.get(listing?.user_id ?? "") ?? null;
    return {
      id: o.id,
      offer_price: o.offer_price,
      status: o.status,
      created_at: o.created_at,
      listing: listing
        ? { brand: listing.brand, model: listing.model, variant: listing.variant }
        : null,
      dealer: dealer?.dealership_name
        ? { dealership_name: dealer.dealership_name, verified: dealer.verified }
        : null,
      owner: owner ? { full_name: owner.full_name, phone: owner.phone } : null,
    };
  });

  return Response.json({ offers: rows });
}