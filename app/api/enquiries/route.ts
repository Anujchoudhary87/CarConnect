import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Please login to send an enquiry" }, { status: 401 });

  const { vehicle_id, message, name } = await request.json();
  if (!vehicle_id) return Response.json({ error: "vehicle_id is required" }, { status: 400 });

  const { data: vehicle } = await supabase
    .from("vehicles")
    .select("id, dealer_id")
    .eq("id", vehicle_id)
    .eq("status", "active")
    .maybeSingle();
  if (!vehicle) return Response.json({ error: "Vehicle not found" }, { status: 404 });

  const { data: profile } = await supabase
    .from("users")
    .select("full_name, phone")
    .eq("id", user.id)
    .maybeSingle();

  const { error } = await supabase.from("enquiries").insert({
    vehicle_id,
    dealer_id: vehicle.dealer_id,
    user_id: user.id,
    name: name || profile?.full_name || "",
    phone: profile?.phone || "",
    message: message || "",
    type: "enquiry",
  });

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}