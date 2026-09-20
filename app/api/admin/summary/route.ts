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
    dealers,
    pendingDealers,
    vehicles,
    pendingVehicles,
    activeVehicles,
    sellListings,
    openSellListings,
    enquiries,
  ] = await Promise.all([
    count("users"),
    count("dealers"),
    count("dealers", { eq: ["verified", "false"] }),
    count("vehicles"),
    count("vehicles", { eq: ["status", "pending"] }),
    count("vehicles", { eq: ["status", "active"] }),
    count("customer_sell_listings"),
    count("customer_sell_listings", { eq: ["status", "open"] }),
    count("enquiries"),
  ]);

  return Response.json({ users, dealers, pendingDealers, vehicles, pendingVehicles, activeVehicles, sellListings, openSellListings, enquiries });
}