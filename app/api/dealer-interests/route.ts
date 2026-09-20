import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Not authenticated" }, { status: 401 });

  const { vehicle_id, message, offer_price } = await request.json();
  if (!vehicle_id) return Response.json({ error: "vehicle_id is required" }, { status: 400 });

  const { data: dealer } = await supabase
    .from("dealers")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!dealer) return Response.json({ error: "Set up your dealer profile first" }, { status: 400 });

  const { data: vehicle } = await supabase
    .from("vehicles")
    .select("dealer_id")
    .eq("id", vehicle_id)
    .eq("status", "active")
    .maybeSingle();
  if (!vehicle) return Response.json({ error: "Vehicle not found" }, { status: 404 });
  if (vehicle.dealer_id === dealer.id) {
    return Response.json({ error: "Ye aapki apni gaadi hai" }, { status: 400 });
  }

  const { error } = await supabase.from("dealer_interests").insert({
    vehicle_id,
    from_dealer_id: dealer.id,
    to_dealer_id: vehicle.dealer_id,
    message: message ?? "",
    offer_price: offer_price ? Number(offer_price) : null,
  });

  if (error) {
    if (error.code === "23505") {
      return Response.json({ error: "Aap pehle se is gaadi mein interest dikha chuke hain" }, { status: 400 });
    }
    return Response.json({ error: error.message }, { status: 500 });
  }
  return Response.json({ ok: true });
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Not authenticated" }, { status: 401 });

  const { data: dealer } = await supabase
    .from("dealers")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!dealer) return Response.json({ received: [], sent: [] });

  const [received, sent] = await Promise.all([
    supabase
      .from("dealer_interests")
      .select("*, vehicle:vehicles(*), from_dealer:dealers!dealer_interests_from_dealer_id_fkey(*)")
      .eq("to_dealer_id", dealer.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("dealer_interests")
      .select("*, vehicle:vehicles(*), to_dealer:dealers!dealer_interests_to_dealer_id_fkey(*)")
      .eq("from_dealer_id", dealer.id)
      .order("created_at", { ascending: false }),
  ]);

  return Response.json({ received: received.data ?? [], sent: sent.data ?? [] });
}