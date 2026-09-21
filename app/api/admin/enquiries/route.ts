import { requireAdminApi } from "@/lib/auth";

export async function GET() {
  const admin = await requireAdminApi();
  if (!admin) return Response.json({ error: "Not authenticated" }, { status: 401 });
  const supabase = admin.supabase;

  const { data } = await supabase
    .from("enquiries")
    .select("id, name, phone, message, type, created_at, vehicle:vehicles(brand, model, variant), dealer:dealers(dealership_name)")
    .order("created_at", { ascending: false })
    .limit(200);

  const pick = (x: unknown) => (Array.isArray(x) ? (x as unknown[])[0] : x);
  const rows = (data ?? []).map((e) => {
    const vehicle = pick(e.vehicle) as
      | { brand?: string; model?: string; variant?: string }
      | undefined;
    const dealer = pick(e.dealer) as { dealership_name?: string } | undefined;
    return {
      id: e.id,
      name: e.name,
      phone: e.phone,
      message: e.message,
      type: e.type,
      created_at: e.created_at,
      vehicle: vehicle
        ? { brand: vehicle.brand, model: vehicle.model, variant: vehicle.variant }
        : null,
      dealer: dealer?.dealership_name ?? null,
    };
  });

  return Response.json({ enquiries: rows });
}