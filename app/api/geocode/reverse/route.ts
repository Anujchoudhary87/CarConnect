import { NextRequest } from "next/server";

const NOMINATIM = "https://nominatim.openstreetmap.org";
const UA = "CarConnect/0.1 (used-car marketplace; contact: hello@carconnect.in)";

export async function GET(request: NextRequest) {
  const lat = request.nextUrl.searchParams.get("lat");
  const lng = request.nextUrl.searchParams.get("lng");
  if (!lat || !lng) {
    return Response.json({ error: "Missing lat/lng parameters" }, { status: 400 });
  }

  try {
    const res = await fetch(
      `${NOMINATIM}/reverse?format=jsonv2&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lng)}`,
      { headers: { "User-Agent": UA, Referer: "https://carconnect.in" } },
    );
    if (!res.ok) throw new Error(`Nominatim error ${res.status}`);
    const data = await res.json();
    return Response.json({
      lat: parseFloat(lat),
      lng: parseFloat(lng),
      label: data.display_name ?? "",
      city: data.address?.city || data.address?.town || data.address?.village || data.address?.county || "",
      state: data.address?.state || "",
    });
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : "Reverse geocoding failed" },
      { status: 502 },
    );
  }
}