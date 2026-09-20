import { NextRequest } from "next/server";
import { requireAdminApi } from "@/lib/auth";

export async function PUT(request: NextRequest, ctx: RouteContext<"/api/admin/vehicles/[id]">) {
  const { id } = await ctx.params;
  const admin = await requireAdminApi();
  if (!admin) return Response.json({ error: "Not authenticated" }, { status: 401 });
  const supabase = admin.supabase;

  const { action } = await request.json();
  if (action === "delete") {
    const { error } = await supabase.from("vehicles").delete().eq("id", id);
    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json({ ok: true });
  }
  if (!["active", "rejected", "pending"].includes(action)) {
    return Response.json({ error: "Invalid action" }, { status: 400 });
  }
  const { error } = await supabase
    .from("vehicles")
    .update({ status: action, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}