import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { VehicleInput } from "./vehicles-input";
import { validateInput } from "./vehicles-input";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Not authenticated" }, { status: 401 });

  const body = (await request.json()) as VehicleInput;
  const err = validateInput(body);
  if (err) return Response.json({ error: err }, { status: 400 });

  const { data: dealer } = await supabase
    .from("dealers")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!dealer) {
    return Response.json({ error: "Set up your dealer profile first" }, { status: 400 });
  }

  const { data: vehicle, error } = await supabase
    .from("vehicles")
    .insert([
      {
        dealer_id: dealer.id,
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
        status: "active",
      },
    ])
    .select("id")
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });

  // Attach uploaded images.
  const images = (body.images ?? []).filter(Boolean);
  if (images.length > 0) {
    await supabase.from("vehicle_images").insert(
      images.map((url, i) => ({ vehicle_id: vehicle.id, url, position: i })),
    );
  }

  return Response.json({ vehicle }, { status: 201 });
}