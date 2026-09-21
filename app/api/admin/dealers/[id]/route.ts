import { requireAdminApi } from "@/lib/auth";
import { authUserEmails } from "@/lib/supabase/service";

export async function GET(_request: Request, ctx: RouteContext<"/api/admin/dealers/[id]">) {
  const { id } = await ctx.params;
  const admin = await requireAdminApi();
  if (!admin) return Response.json({ error: "Not authenticated" }, { status: 401 });
  const supabase = admin.supabase;

  const { data: dealer } = await supabase
    .from("dealers")
    .select("*, verification:dealer_verification(*)")
    .eq("id", id)
    .maybeSingle();
  if (!dealer) return Response.json({ error: "Dealer not found" }, { status: 404 });

  const [{ data: cars }, { data: offers }, emailMap] = await Promise.all([
    supabase.from("vehicles").select("status").eq("dealer_id", id),
    supabase.from("dealer_offers").select("id").eq("dealer_id", id),
    authUserEmails(),
  ]);

  let total = 0;
  let active = 0;
  let sold = 0;
  for (const c of cars ?? []) {
    total += 1;
    if (c.status === "active") active += 1;
    if (c.status === "sold") sold += 1;
  }

  return Response.json({
    dealer: {
      ...dealer,
      email: dealer.email || emailMap.get(dealer.user_id as string) || "",
    },
    total_cars: total,
    active_cars: active,
    sold_cars: sold,
    offers_sent: offers?.length ?? 0,
  });
}