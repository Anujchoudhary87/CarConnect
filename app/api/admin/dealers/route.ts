import { NextRequest } from "next/server";
import { requireAdminApi } from "@/lib/auth";

export async function GET() {
  const admin = await requireAdminApi();
  if (!admin) return Response.json({ error: "Not authenticated" }, { status: 401 });
  const supabase = admin.supabase;

  const { data } = await supabase
    .from("dealers")
    .select("*, verification:dealer_verification(*)")
    .order("created_at", { ascending: false })
    .limit(200);

  return Response.json({ dealers: data ?? [] });
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