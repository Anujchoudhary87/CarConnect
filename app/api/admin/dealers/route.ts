import { NextRequest } from "next/server";
import { requireAdminApi } from "@/lib/auth";
import { authUserEmails, createServiceClient } from "@/lib/supabase/service";

export async function GET() {
  const admin = await requireAdminApi();
  if (!admin) return Response.json({ error: "Not authenticated" }, { status: 401 });
  const supabase = admin.supabase;

  const [{ data: dealers }, { data: vehicles }, emailMap] = await Promise.all([
    supabase
      .from("dealers")
      .select("*, verification:dealer_verification(*)")
      .order("created_at", { ascending: false })
      .limit(200),
    supabase.from("vehicles").select("dealer_id, status"),
    authUserEmails(),
  ]);

  const counts = new Map<string, { total: number; active: number; sold: number }>();
  for (const v of vehicles ?? []) {
    const c = counts.get(v.dealer_id as string) ?? { total: 0, active: 0, sold: 0 };
    c.total += 1;
    if (v.status === "active") c.active += 1;
    if (v.status === "sold") c.sold += 1;
    counts.set(v.dealer_id as string, c);
  }

  const rows = (dealers ?? []).map((d) => {
    const c = counts.get(d.id as string) ?? { total: 0, active: 0, sold: 0 };
    return {
      ...d,
      email: d.email || emailMap.get(d.user_id as string) || "",
      total_cars: c.total,
      active_cars: c.active,
      sold_cars: c.sold,
    };
  });

  return Response.json({ dealers: rows });
}

export async function PUT(request: NextRequest) {
  const admin = await requireAdminApi();
  if (!admin) return Response.json({ error: "Not authenticated" }, { status: 401 });
  const supabase = admin.supabase;

  const { dealer_id, verified, admin_note } = await request.json();
  if (!dealer_id) return Response.json({ error: "dealer_id required" }, { status: 400 });

  const { data: dealer } = await supabase
    .from("dealers")
    .select("id, user_id")
    .eq("id", dealer_id)
    .maybeSingle();
  if (!dealer) return Response.json({ error: "Dealer not found" }, { status: 404 });

  const { error } = await supabase
    .from("dealers")
    .update({
      verified: Boolean(verified),
      verified_at: verified ? new Date().toISOString() : null,
    })
    .eq("id", dealer_id);
  if (error) return Response.json({ error: error.message }, { status: 500 });

  const { data: existing } = await supabase
    .from("dealer_verification")
    .select("id")
    .eq("dealer_id", dealer_id)
    .maybeSingle();

  if (existing) {
    await supabase
      .from("dealer_verification")
      .update({
        status: verified ? "approved" : "rejected",
        admin_note: admin_note ?? "",
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", existing.id);
  } else {
    await supabase.from("dealer_verification").insert({
      dealer_id,
      user_id: dealer.user_id,
      status: verified ? "approved" : "rejected",
      admin_note: admin_note ?? "",
      submitted_at: new Date().toISOString(),
      reviewed_at: new Date().toISOString(),
    });
  }

  return Response.json({ ok: true });
}

export async function DELETE(request: NextRequest) {
  const admin = await requireAdminApi();
  if (!admin) return Response.json({ error: "Not authenticated" }, { status: 401 });

  const { user_id } = await request.json();
  if (!user_id) return Response.json({ error: "User ID required" }, { status: 400 });

  if (user_id === admin.user.id) {
    return Response.json({ error: "Cannot delete yourself" }, { status: 400 });
  }

  const svc = createServiceClient();
  if (!svc) return Response.json({ error: "Service client not configured" }, { status: 500 });

  const { error } = await svc.auth.admin.deleteUser(user_id);
  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({ ok: true });
}