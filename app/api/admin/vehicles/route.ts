import { NextRequest } from "next/server";
import { requireAdminApi } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const admin = await requireAdminApi();
  if (!admin) return Response.json({ error: "Not authenticated" }, { status: 401 });
  const supabase = admin.supabase;

  const status = request.nextUrl.searchParams.get("status") || "all";
  let query = supabase
    .from("vehicles")
    .select("*, dealer:dealers(dealership_name, verified, city), vehicle_images(*)");
  if (status !== "all") query = query.eq("status", status);
  const { data } = await query.order("created_at", { ascending: false }).limit(200);

  return Response.json({ vehicles: data ?? [] });
}