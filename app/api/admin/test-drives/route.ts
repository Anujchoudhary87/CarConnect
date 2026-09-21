import { requireAdminApi } from "@/lib/auth";

export async function GET() {
  const admin = await requireAdminApi();
  if (!admin) return Response.json({ error: "Not authenticated" }, { status: 401 });
  const supabase = admin.supabase;

  const { data } = await supabase
    .from("test_drive_requests")
    .select("id, name, phone, preferred_date, preferred_time, status, created_at, vehicle:vehicles(brand, model, variant), dealer:dealers(dealership_name)")
    .order("created_at", { ascending: false })
    .limit(200);

  const pick = (x: unknown) => (Array.isArray(x) ? (x as unknown[])[0] : x);
  const rows = (data ?? []).map((t) => {
    const vehicle = pick(t.vehicle) as
      | { brand?: string; model?: string; variant?: string }
      | undefined;
    const dealer = pick(t.dealer) as { dealership_name?: string } | undefined;
    return {
      id: t.id,
      name: t.name,
      phone: t.phone,
      preferred_date: t.preferred_date,
      preferred_time: t.preferred_time,
      status: t.status,
      created_at: t.created_at,
      vehicle: vehicle
        ? { brand: vehicle.brand, model: vehicle.model, variant: vehicle.variant }
        : null,
      dealer: dealer?.dealership_name ?? null,
    };
  });

  return Response.json({ test_drives: rows });
}