import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Saves ONLY the location columns of the caller's own dealer row, so the office
// location can be saved on its own from the dealer profile without touching any
// other profile field.
//
// `apply_to_existing` is the only way an already-published listing ever moves:
// it is opt-in per save (default false) and is refused unless the caller passes
// it, so changing the office location never silently rewrites inventory.
interface LocationBody {
  city?: string;
  state?: string;
  address?: string;
  lat?: number | null;
  lng?: number | null;
  apply_to_existing?: boolean;
}

function num(v: unknown): number | null {
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Not authenticated" }, { status: 401 });

  const body = (await request.json()) as LocationBody;

  const city = (body.city ?? "").trim();
  if (!city) return Response.json({ error: "City is required" }, { status: 400 });

  const lat = num(body.lat);
  const lng = num(body.lng);
  // The office location is the anchor for Google Maps links and for
  // Nearby/distance, so exact coordinates are required — not optional.
  if (lat === null || lng === null) {
    return Response.json(
      { error: "Office location ke liye exact latitude aur longitude chahiye" },
      { status: 400 },
    );
  }
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return Response.json({ error: "Latitude/longitude range se bahar hai" }, { status: 400 });
  }

  const patch = {
    city,
    state: (body.state ?? "").trim(),
    address: (body.address ?? "").trim(),
    lat,
    lng,
  };

  // Read the current location before overwriting it: the old value is what
  // identifies the listings that were still using the previous default.
  const { data: previous, error: readError } = await supabase
    .from("dealers")
    .select("id, city, state, address, lat, lng")
    .eq("user_id", user.id)
    .maybeSingle();

  if (readError) return Response.json({ error: readError.message }, { status: 500 });
  if (!previous) return Response.json({ error: "Dealer profile not found" }, { status: 404 });

  // Scoped to user_id = auth.uid(); the "dealer can update own profile" RLS
  // policy independently rejects any other dealer's row.
  const { data: dealer, error } = await supabase
    .from("dealers")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .select("id, city, state, address, lat, lng")
    .maybeSingle();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  if (!dealer) return Response.json({ error: "Dealer profile not found" }, { status: 404 });

  let updatedListings = 0;

  // Explicit, dealer-initiated bulk move. Only listings whose saved location
  // still equals the PREVIOUS office location are touched, so a per-vehicle
  // override (any listing with a different city or pin) is always preserved.
  if (body.apply_to_existing && typeof previous.lat === "number" && typeof previous.lng === "number") {
    const { data: moved, error: moveError } = await supabase
      .from("vehicles")
      .update({ city, state: patch.state, address: patch.address, lat, lng })
      .eq("dealer_id", previous.id)
      .eq("lat", previous.lat)
      .eq("lng", previous.lng)
      .ilike("city", previous.city ?? "")
      .select("id");

    if (moveError) {
      return Response.json(
        { error: moveError.message, dealer, updatedListings: 0 },
        { status: 500 },
      );
    }
    updatedListings = (moved ?? []).length;
  }

  return Response.json({ dealer, updatedListings });
}
