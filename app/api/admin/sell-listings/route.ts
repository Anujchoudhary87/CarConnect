import { requireAdminApi } from "@/lib/auth";

export async function GET() {
  const admin = await requireAdminApi();
  if (!admin) return Response.json({ error: "Not authenticated" }, { status: 401 });
  const supabase = admin.supabase;

  const [{ data: listings }, { data: users }] = await Promise.all([
    supabase
      .from("customer_sell_listings")
      .select("*, offers:dealer_offers(*, dealer:dealers(dealership_name))")
      .order("created_at", { ascending: false })
      .limit(100),
    supabase.from("users").select("id, full_name, phone"),
  ]);

  const userMap = new Map((users ?? []).map((u) => [u.id, u]));
  const rows = (listings ?? []).map((l) => ({
    ...l,
    owner: userMap.get(l.user_id as string) ?? null,
  }));

  return Response.json({ listings: rows });
}

export async function DELETE(request: Request) {
  const admin = await requireAdminApi();
  if (!admin) return Response.json({ error: "Not authenticated" }, { status: 401 });
  const supabase = admin.supabase;

  let id: string;
  try {
    ({ id } = await request.json());
  } catch {
    return Response.json({ error: "id required" }, { status: 400 });
  }
  if (!id) return Response.json({ error: "id required" }, { status: 400 });

  const { error } = await supabase.from("customer_sell_listings").delete().eq("id", id);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}