import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { Dealer, Vehicle } from "@/lib/types";
import { buildWhatsAppAdMessage } from "@/lib/whatsapp-ad";

export async function GET(_request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Not authenticated" }, { status: 401 });

  const { data: profile } = await supabase
    .from("users")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();
  const { data: dealerByUser } = await supabase
    .from("dealers")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  const { data: vehicle } = await supabase
    .from("vehicles")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!vehicle) return Response.json({ error: "Vehicle not found" }, { status: 404 });
  const car = vehicle as Vehicle;

  const owner = dealerByUser?.id === car.dealer_id;
  const admin = Boolean(profile?.is_admin);
  if (!owner && !admin) return Response.json({ error: "Vehicle not found" }, { status: 404 });

  const { data: dealerRow } = await supabase
    .from("dealers")
    .select("dealership_name, city, state, verified")
    .eq("id", car.dealer_id)
    .maybeSingle();
  if (!dealerRow) return Response.json({ error: "Dealer not found" }, { status: 404 });
  const dealer = dealerRow as Pick<Dealer, "dealership_name" | "city" | "state" | "verified">;

  const message = buildWhatsAppAdMessage(car, dealer);

  return Response.json({ message }, { status: 200 });
}