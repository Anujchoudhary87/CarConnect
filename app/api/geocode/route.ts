import { NextRequest } from "next/server";

const NOMINATIM = "https://nominatim.openstreetmap.org";
const UA = "CarConnect/0.1 (used-car marketplace; contact: hello@carconnect.in)";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim();
  if (!q) {
    return Response.json({ error: "Missing q parameter" }, { status: 400 });
  }

  try {
    const res = await fetch(
      `${NOMINATIM}/search?format=jsonv2&limit=6&countrycodes=in&q=${encodeURIComponent(q)}`,
      { headers: { "User-Agent": UA, Referer: "https://carconnect.in" } },
    );
    if (!res.ok) throw new Error(`Nominatim error ${res.status}`);
    const data = (await res.json()) as Array<{
      lat: string;
      lon: string;
      display_name: string;
      address?: { city?: string; town?: string; village?: string; county?: string; state?: string };
    }>;
    const results = data.map((r) => ({
      lat: parseFloat(r.lat),
      lng: parseFloat(r.lon),
      label: r.display_name,
      city: r.address?.city || r.address?.town || r.address?.village || r.address?.county || "",
      state: r.address?.state || "",
    }));
    return Response.json({ results });
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : "Geocoding failed" },
      { status: 502 },
    );
  }
}