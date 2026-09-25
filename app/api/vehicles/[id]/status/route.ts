import { NextRequest } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { runDemandMatching } from "@/lib/demand-api";

// Task 1 wire-up: mark sold → best-effort alert favouriters + opted-in
// matched demand. notify_vehicle_sold is idempotent in SQL, and this route
// must never fail the actual status change.
async function notifySold(supabase: Pick<SupabaseClient, "rpc">, vehicleId: string) {
  try {
    await supabase.rpc("notify_vehicle_sold", { p_vehicle_id: vehicleId });
  } catch {
    // best-effort only
  }
}

export async function POST(request: NextRequest, ctx: RouteContext<"/api/vehicles/[id]/status">) {
  const { id } = await ctx.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Not authenticated" }, { status: 401 });

  const { status } = await request.json();
  if (!["sold", "active"].includes(status)) {
    return Response.json({ error: "Invalid status" }, { status: 400 });
  }

  const { data: dealer } = await supabase
    .from("dealers")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!dealer) return Response.json({ error: "Dealer profile missing" }, { status: 400 });

  const { data: existing } = await supabase
    .from("vehicles")
    .select("id")
    .eq("id", id)
    .eq("dealer_id", dealer.id)
    .maybeSingle();
  if (!existing) return Response.json({ error: "Vehicle not found" }, { status: 404 });

  const { error } = await supabase
    .from("vehicles")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return Response.json({ error: error.message }, { status: 500 });

  if (status === "sold") {
    await notifySold(supabase, id);
  } else if (status === "active") {
    // Relisted as active → stock is available again, so match waiting demand.
    await runDemandMatching(supabase, id).catch(() => {});
  }

  return Response.json({ ok: true });
}
