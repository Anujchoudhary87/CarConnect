import { requireAdminApi } from "@/lib/auth";
import { createServiceClient, authUserEmails } from "@/lib/supabase/service";

export async function GET() {
  const admin = await requireAdminApi();
  if (!admin) return Response.json({ error: "Not authenticated" }, { status: 401 });
  const supabase = admin.supabase;

  const [{ data: profiles }, { data: sell }, { data: enq }, { data: td }, emailMap, favRows] =
    await Promise.all([
      supabase.from("users").select("*").order("created_at", { ascending: false }).limit(500),
      supabase.from("customer_sell_listings").select("user_id"),
      supabase.from("enquiries").select("user_id"),
      supabase.from("test_drive_requests").select("user_id"),
      authUserEmails(),
      (async () => {
        const svc = createServiceClient();
        if (!svc) return [] as { user_id: string }[];
        const { data } = await svc.from("favorites").select("user_id");
        return data ?? [];
      })(),
    ]);

  const favCount = new Map<string, number>();
  for (const f of favRows) favCount.set(f.user_id as string, (favCount.get(f.user_id as string) ?? 0) + 1);

  const sellCount = new Map<string, number>();
  for (const s of sell ?? []) sellCount.set(s.user_id as string, (sellCount.get(s.user_id as string) ?? 0) + 1);

  const enqCount = new Map<string, number>();
  for (const e of enq ?? []) if (e.user_id) enqCount.set(e.user_id as string, (enqCount.get(e.user_id as string) ?? 0) + 1);

  const tdCount = new Map<string, number>();
  for (const t of td ?? []) if (t.user_id) tdCount.set(t.user_id as string, (tdCount.get(t.user_id as string) ?? 0) + 1);

  const customers = (profiles ?? [])
    .filter((p) => p.role === "customer")
    .map((p) => ({
      id: p.id,
      full_name: p.full_name,
      phone: p.phone,
      email: emailMap.get(p.id as string) || "",
      created_at: p.created_at,
      sell_listings: sellCount.get(p.id as string) ?? 0,
      favorites: favCount.get(p.id as string) ?? 0,
      enquiries: enqCount.get(p.id as string) ?? 0,
      test_drives: tdCount.get(p.id as string) ?? 0,
    }));

  return Response.json({ customers });
}