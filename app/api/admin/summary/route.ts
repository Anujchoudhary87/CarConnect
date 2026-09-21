import { requireAdminApi } from "@/lib/auth";

export async function GET() {
  const admin = await requireAdminApi();
  if (!admin) return Response.json({ error: "Not authenticated" }, { status: 401 });
  const supabase = admin.supabase;

  async function count(table: string, opts?: { eq: [string, string] }) {
    let q = supabase.from(table).select("id", { count: "exact", head: true });
    if (opts?.eq) q = q.eq(opts.eq[0], opts.eq[1]);
    const { count } = await q;
    return count ?? 0;
  }

  const [
    users,
    customers,
    dealers,
    verifiedDealers,
    pendingDealers,
    vehicles,
    sellListings,
    dealerOffers,
    enquiries,
    testDrives,
  ] = await Promise.all([
    count("users"),
    count("users", { eq: ["role", "customer"] }),
    count("dealers"),
    count("dealers", { eq: ["verified", "true"] }),
    count("dealers", { eq: ["verified", "false"] }),
    count("vehicles"),
    count("customer_sell_listings"),
    count("dealer_offers"),
    count("enquiries"),
    count("test_drive_requests"),
  ]);

  return Response.json({
    users,
    customers,
    dealers,
    verifiedDealers,
    pendingDealers,
    vehicles,
    sellListings,
    dealerOffers,
    enquiries,
    testDrives,
  });
}