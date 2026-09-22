import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sortVehicleImages } from "@/lib/poster/sort";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Please login to save cars" }, { status: 401 });

  const { vehicle_id } = await request.json();
  if (!vehicle_id) return Response.json({ error: "vehicle_id is required" }, { status: 400 });

  const { data: existing } = await supabase
    .from("favorites")
    .select("id")
    .eq("user_id", user.id)
    .eq("vehicle_id", vehicle_id)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase.from("favorites").delete().eq("id", existing.id);
    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json({ favorite: false });
  }

  const { error } = await supabase.from("favorites").insert({ user_id: user.id, vehicle_id });
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ favorite: true });
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ favorites: [], vehicles: [] });

  const { data } = await supabase
    .from("favorites")
    .select("vehicle_id")
    .eq("user_id", user.id);

  const ids = (data ?? []).map((x) => x.vehicle_id);
  let vehicles: unknown[] = [];
  if (ids.length > 0) {
    const { data: v } = await supabase
      .from("vehicles")
      .select("*, dealer:dealers(*), vehicle_images(*)")
      .in("id", ids)
      .eq("status", "active");
    vehicles = (v ?? []).map((row) => ({
      ...row,
      vehicle_images: sortVehicleImages(
        (row as { vehicle_images: Array<{ url: string; position: number; created_at: string }> })
          .vehicle_images ?? [],
      ),
    }));
  }
  return Response.json({ favorites: ids, vehicles });
}