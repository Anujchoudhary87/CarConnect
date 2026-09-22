import { NextRequest } from "next/server";
import { requireAdminApi } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireAdminApi();
  if (!auth) return Response.json({ error: "Not authorized" }, { status: 401 });

  const [{ data: signals }, { data: clusters }, { data: matches }, { data: notifications }] =
    await Promise.all([
      auth.supabase
        .from("customer_demands")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500),
      auth.supabase.rpc("get_demand_clusters"),
      auth.supabase
        .from("demand_vehicle_matches")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500),
      auth.supabase
        .from("customer_notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500),
    ]);
  return Response.json({ signals, clusters, matches, notifications });
}

export async function DELETE(request: NextRequest) {
  const auth = await requireAdminApi();
  if (!auth) return Response.json({ error: "Not authorized" }, { status: 401 });

  const body = (await request.json().catch(() => null)) as { cluster_key?: string; id?: string } | null;
  let query = auth.supabase.from("customer_demands").delete();
  if (body?.cluster_key) query = query.eq("cluster_key", body.cluster_key);
  else if (body?.id) query = query.eq("id", body.id);
  else return Response.json({ error: "Missing id or cluster_key" }, { status: 400 });

  const { error } = await query;
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}