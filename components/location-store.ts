export interface HomeLocation {
  lat: number;
  lng: number;
  label: string;
}

interface GeocodeHit {
  lat: number;
  lng: number;
  city?: string;
  district?: string;
  state?: string;
  label?: string;
}

const KEY = "cc_home_location";
export const LOCATION_EVENT = "cc:location";

export const AREA_CITIES = [
  "Jaipur",
  "Ajmer",
  "Udaipur",
  "Jodhpur",
  "Kota",
  "Delhi",
  "Gurugram",
  "Noida",
  "Mumbai",
  "Pune",
  "Ahmedabad",
  "Bengaluru",
  "Hyderabad",
  "Chennai",
  "Kolkata",
  "Lucknow",
  "Kanpur",
  "Indore",
  "Bhopal",
  "Nagpur",
  "Chandigarh",
];

// Builds "City, District, State" (e.g. "Pilani, Jhunjhunu, Rajasthan") while
// dropping duplicated parts and empties.
export function buildLabel(parts: Array<string | undefined>): string {
  const out: string[] = [];
  for (const p of parts) {
    const t = (p ?? "").trim();
    if (!t) continue;
    if (out[out.length - 1]?.toLowerCase() === t.toLowerCase()) continue;
    out.push(t);
  }
  return out.join(", ");
}

function toHit(data: GeocodeHit | null | undefined): HomeLocation | null {
  if (!data || typeof data.lat !== "number" || typeof data.lng !== "number") return null;
  return { lat: data.lat, lng: data.lng, label: buildLabel([data.city, data.district, data.state]) };
}

export function getStoredLocation(): HomeLocation | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as HomeLocation;
    if (typeof parsed.lat !== "number" || typeof parsed.lng !== "number") return null;
    return parsed;
  } catch {
    return null;
  }
}

export function setStoredLocation(loc: HomeLocation | null) {
  try {
    if (loc) {
      window.localStorage.setItem(KEY, JSON.stringify(loc));
      window.dispatchEvent(new CustomEvent<HomeLocation>(LOCATION_EVENT, { detail: loc }));
    } else {
      window.localStorage.removeItem(KEY);
      window.dispatchEvent(new CustomEvent<HomeLocation | null>(LOCATION_EVENT, { detail: null }));
    }
  } catch {
    // storage unavailable (private mode) — ignore
  }
}

export async function geocodeQuery(q: string): Promise<HomeLocation | null> {
  const res = await fetch(`/api/geocode?q=${encodeURIComponent(q.trim())}`);
  if (!res.ok) return null;
  const data = await res.json();
  return toHit(data.results?.[0] ?? null);
}

export async function geocodeCity(name: string): Promise<HomeLocation | null> {
  const loc = await geocodeQuery(`${name}, India`);
  return loc;
}

export async function geocodePosition(lat: number, lng: number): Promise<HomeLocation> {
  try {
    const res = await fetch(`/api/geocode/reverse?lat=${lat}&lng=${lng}`);
    if (res.ok) {
      const data = await res.json();
      const hit = toHit(data as GeocodeHit);
      if (hit?.label) return hit;
      if (typeof data.city === "string" && data.city) {
        return { lat, lng, label: data.city };
      }
    }
  } catch {
    // fall through to generic label
  }
  return { lat, lng, label: "My location" };
}

export async function locateFromBrowser(): Promise<HomeLocation | null> {
  if (typeof navigator === "undefined" || !navigator.geolocation) return null;
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      async (pos) => resolve(await geocodePosition(pos.coords.latitude, pos.coords.longitude)),
      () => resolve(null),
      { timeout: 8000, maximumAge: 5 * 60 * 1000 },
    );
  });
}