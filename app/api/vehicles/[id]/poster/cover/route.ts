import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isPosterImage } from "@/lib/poster/sort";
import type { Vehicle, VehicleImage } from "@/lib/types";

const BUCKET_KEY = "/storage/v1/object/public/vehicle-images/";

function pathFromUrl(url: string): string | null {
  const idx = url.indexOf(BUCKET_KEY);
  if (idx === -1) return null;
  return url.slice(idx + BUCKET_KEY.length).split("?")[0];
}

export async function POST(request: NextRequest, ctx: RouteContext<"/api/vehicles/[id]/poster/cover">) {
  try {
    return await handlePost(request, ctx);
  } catch (e) {
    // Never let the handler bubble up raw — the route must always answer JSON
    // (a thrown error would otherwise surface as an HTML error page).
    const message = e instanceof Error ? e.message : "Cover set karte waqt error aa gaye";
    return Response.json({ error: message }, { status: 500 });
  }
}

async function handlePost(request: NextRequest, ctx: RouteContext<"/api/vehicles/[id]/poster/cover">) {
  const { id } = await ctx.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Not authenticated" }, { status: 401 });

  const { posterUrl, posterPath } = (await request.json()) as {
    posterUrl?: string;
    posterPath?: string;
  };
  if (!posterUrl || !posterPath) {
    return Response.json({ error: "posterUrl aur posterPath required hai" }, { status: 400 });
  }

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
    .select("id, dealer_id")
    .eq("id", id)
    .maybeSingle();
  if (!vehicle) return Response.json({ error: "Vehicle not found" }, { status: 404 });

  const owner = dealerByUser?.id === (vehicle as Vehicle).dealer_id;
  const admin = Boolean(profile?.is_admin);
  if (!owner && !admin) return Response.json({ error: "Vehicle not found" }, { status: 404 });

  const { data: rows } = await supabase
    .from("vehicle_images")
    .select("id, url, position")
    .eq("vehicle_id", id)
    .order("position", { ascending: true });

  const all = ((rows ?? []) as VehicleImage[]).sort(
    (a, b) => a.position - b.position,
  );
  const originals = all.filter((r) => !isPosterImage(r));
  const oldPosters = all.filter(isPosterImage);

  for (const p of oldPosters) {
    const path = pathFromUrl(p.url);
    if (path) await supabase.storage.from("vehicle-images").remove([path]);
  }

  // The `authenticated` role has no UPDATE on vehicle_images, so instead of
  // shifting positions in place we rebuild the rows: delete everything for
  // this vehicle and re-insert poster@0 + originals@1..n in one batch.
  const { error: deleteError } = await supabase
    .from("vehicle_images")
    .delete()
    .eq("vehicle_id", id);
  if (deleteError) return Response.json({ error: deleteError.message }, { status: 500 });

  const { error } = await supabase.from("vehicle_images").insert([
    { vehicle_id: id, url: posterUrl, position: 0 },
    ...originals.map((o, i) => ({ vehicle_id: id, url: o.url, position: i + 1 })),
  ]);
  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({ ok: true, url: posterUrl }, { status: 200 });
}