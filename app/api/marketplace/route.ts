import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { MarketplaceFilters, VehicleWithInfo } from "@/lib/types";
import { boundingBox, haversineKm } from "@/lib/geo";
import { sortVehicleImages } from "@/lib/poster/sort";

const LIMIT = 60;

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const f: MarketplaceFilters = Object.fromEntries(sp.entries());

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const latitude = f.lat ? parseFloat(f.lat) : NaN;
  const longitude = f.lng ? parseFloat(f.lng) : NaN;
  const radiusKmStr = f.radius_km;
  const is200Plus = radiusKmStr === "200+";
  const radiusKm = is200Plus ? NaN : (radiusKmStr ? parseFloat(radiusKmStr) : NaN);
  const hasLocation = !isNaN(latitude) && !isNaN(longitude);

  let query = supabase
    .from("vehicles")
    .select(
      "*, dealer:dealers(*), vehicle_images:vehicle_images(url, position, created_at)",
    )
    .eq("status", "active");

  // Distance (bounding box approximation, real distance computed below).
  // "200+" means ALL cars (no distance restriction), so skip filtering entirely.
  if (hasLocation && !is200Plus && !isNaN(radiusKm) && radiusKm > 0) {
    const b = boundingBox(latitude, longitude, radiusKm);
    query = query
      .gte("lat", b.minLat)
      .lte("lat", b.maxLat)
      .not("lat", "is", null)
      .not("lng", "is", null)
      .gte("lng", b.minLng)
      .lte("lng", b.maxLng);
  }

  if (f.q) {
    // PostgREST's .or() treats `,` and `(`/`)` as condition syntax, so a raw
    // search like "Swift, Jaipur" or "Swift (2nd gen)" would otherwise 500.
    // Split into safe tokens and match any of them across the fields.
    const tokens = f.q
      .toLowerCase()
      .replace(/[,()]/g, " ")
      .split(/\s+/)
      .map((t) => t.trim().replace(/^%+|%+$/g, ""))
      .filter((t) => t.length > 0)
      .slice(0, 4);
    if (tokens.length > 0) {
      const conds = tokens
        .flatMap((t) => [
          `brand.ilike.%${t}%`,
          `model.ilike.%${t}%`,
          `variant.ilike.%${t}%`,
          `city.ilike.%${t}%`,
        ])
        .join(",");
      query = query.or(conds);
    }
  }
  const excludeDealerId = sp.get("exclude_dealer_id");
  if (excludeDealerId) query = query.neq("dealer_id", excludeDealerId);
  if (f.brand) query = query.eq("brand", f.brand);
  if (f.fuel) query = query.eq("fuel", f.fuel);
  if (f.transmission) query = query.eq("transmission", f.transmission);
  if (f.min_price) query = query.gte("price", parseFloat(f.min_price));
  if (f.max_price) query = query.lte("price", parseFloat(f.max_price));
  if (f.min_year) query = query.gte("year", parseInt(f.min_year));
  if (f.max_year) query = query.lte("year", parseInt(f.max_year));
  if (f.max_km) query = query.lte("km", parseInt(f.max_km));
  if (f.owner) query = query.eq("owner", f.owner);
  if (f.seats) {
    const seats = Number(f.seats);
    if (!Number.isInteger(seats) || seats < 1) {
      return Response.json({ error: "Seating capacity must be a positive whole number" }, { status: 400 });
    }
    query = query.eq("seating_capacity", seats);
  }

  const { data, error } = await query.order("created_at", { ascending: false }).limit(LIMIT);

  if (error) return Response.json({ error: error.message }, { status: 500 });

  const vehicles = (data ?? []) as VehicleWithInfo[];

  // Compute distances.
  let favoriteIds = new Set<string>();
  if (user) {
    const { data: favs } = await supabase
      .from("favorites")
      .select("vehicle_id")
      .eq("user_id", user.id);
    favoriteIds = new Set((favs ?? []).map((x) => x.vehicle_id));
  }

  let items = vehicles.map((v) => {
    let distanceKm: number | null = null;
    if (hasLocation && v.lat != null && v.lng != null) {
      distanceKm = haversineKm(latitude, longitude, v.lat, v.lng);
    }
    return {
      ...v,
      vehicle_images: sortVehicleImages(v.vehicle_images ?? []),
      distance_km: distanceKm,
      is_favorite: favoriteIds.has(v.id),
    };
  });

  // "200+" = no distance cap (all cars from 0 km onward).
  if (hasLocation && !is200Plus && !isNaN(radiusKm) && radiusKm > 0) {
    items = items.filter((v) => v.distance_km != null && v.distance_km <= radiusKm);
  }

  // Sorting.
  const sort = f.sort ?? (hasLocation ? "distance" : "newest");
  if (sort === "distance") {
    items = items.sort((a, b) => {
      const da = a.distance_km ?? Infinity;
      const db = b.distance_km ?? Infinity;
      return da - db;
    });
  } else if (sort === "price_asc") {
    items = items.sort((a, b) => a.price - b.price);
  } else if (sort === "price_desc") {
    items = items.sort((a, b) => b.price - a.price);
  }

  // Distinct brands for the filter UI.
  const { data: brandRows } = await supabase
    .from("vehicles")
    .select("brand")
    .eq("status", "active");
  const brands = Array.from(new Set((brandRows ?? []).map((x) => x.brand))).sort();

  return Response.json({ vehicles: items, brands });
}