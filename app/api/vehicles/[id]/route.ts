import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { VehicleInput } from "../vehicles-input";
import { validateInput } from "../vehicles-input";

export async function PUT(request: NextRequest, ctx: RouteContext<"/api/vehicles/[id]">) {
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

  const body = (await request.json()) as VehicleInput;
  const err = validateInput(body);
  if (err) return Response.json({ error: err }, { status: 400 });

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
      city: body.city ?? "",
      description: body.description ?? "",
      lat: body.lat ?? null,
      lng: body.lng ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) return Response.json({ error: error.message }, { status: 500 });

  // Replace images: delete all current, insert the new set.
  await supabase.from("vehicle_images").delete().eq("vehicle_id", id);
  const images = (body.images ?? []).filter(Boolean);
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