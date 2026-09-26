import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { VehicleInput } from "../vehicles-input";
import { validateInput } from "../vehicles-input";
import { resolveVehicleLocation } from "@/lib/vehicle-location";

export async function PUT(request: NextRequest, ctx: RouteContext<"/api/vehicles/[id]">) {
  const { id } = await ctx.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Not authenticated" }, { status: 401 });

  const { data: dealer } = await supabase
    .from("dealers")
    .select("id, city, state, address, lat, lng")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!dealer) return Response.json({ error: "Dealer profile missing" }, { status: 400 });

  const { data: existing } = await supabase
    .from("vehicles")
    .select("id, price, city, state, address, lat, lng")
    .eq("id", id)
    .eq("dealer_id", dealer.id)
    .maybeSingle();
  if (!existing) return Response.json({ error: "Vehicle not found" }, { status: 404 });

  const body = (await request.json()) as VehicleInput;
  const err = validateInput(body);
  if (err) return Response.json({ error: err }, { status: 400 });

  // This listing keeps its own copy of the location: sending coordinates is a
  // per-vehicle override, a request that says nothing about location keeps what
  // the listing already has, and anything else falls back to the dealer profile.
  // The dealer profile itself is never written here.
  const location = resolveVehicleLocation(dealer, body, existing);

  const oldPrice = Number(existing.price ?? 0);
  const newPrice = Number(body.price);
  const priceDropped = newPrice > 0 && newPrice < oldPrice;

  const { error } = await supabase
    .from("vehicles")
    .update({
      brand: body.brand,
      model: body.model,
      variant: body.variant ?? "",
      year: Number(body.year),
      fuel: body.fuel,
      km: Number(body.km),
      owner: body.owner,
      transmission: body.transmission,
      price: Number(body.price),
      down_payment: body.down_payment ?? null,
      finance_interest_rate: body.finance_interest_rate ?? null,
      seating_capacity: body.seating_capacity ?? null,
      city: location.city,
      state: location.state,
      address: location.address,
      description: body.description ?? "",
      lat: location.lat,
      lng: location.lng,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) return Response.json({ error: error.message }, { status: 500 });

  // Replace images: delete all current, insert the new set.
  await supabase.from("vehicle_images").delete().eq("vehicle_id", id);
  const images = (body.images ?? []).filter(Boolean);

  // Task 1A: price dropped → alert favouriters + opted-in matched demand customers.
  // Runs only AFTER the price update commits, so old/new prices are reliable.
  // Single, best-effort trigger (security-definer RPC, idempotent in SQL) —
  // never fails the PUT.
  if (priceDropped) {
    await Promise.resolve(
      supabase.rpc("notify_price_drop", {
        p_vehicle_id: id,
        p_old_price: oldPrice,
        p_new_price: newPrice,
      })
    ).then(() => {}).catch(() => {});
  }

  if (images.length > 0) {
    await supabase
      .from("vehicle_images")
      .insert(images.map((url, i) => ({ vehicle_id: id, url, position: i })));
  }

  return Response.json({ ok: true });
}

export async function DELETE(_request: NextRequest, ctx: RouteContext<"/api/vehicles/[id]">) {
  const { id } = await ctx.params;
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
  if (!dealer) return Response.json({ error: "Dealer profile missing" }, { status: 400 });

  const { data: existing } = await supabase
    .from("vehicles")
    .select("id")
    .eq("id", id)
    .eq("dealer_id", dealer.id)
    .maybeSingle();
  if (!existing) return Response.json({ error: "Vehicle not found" }, { status: 404 });

  const { error } = await supabase.from("vehicles").delete().eq("id", id);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}