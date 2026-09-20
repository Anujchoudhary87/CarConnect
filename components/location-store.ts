export interface HomeLocation {
  lat: number;
  lng: number;
  label: string;
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

export function setStoredLocation(loc: HomeLocation) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(loc));
    window.dispatchEvent(new CustomEvent<HomeLocation>(LOCATION_EVENT, { detail: loc }));
  } catch {
    // storage unavailable (private mode) — ignore
  }
}

export async function geocodeCity(name: string): Promise<HomeLocation | null> {
  const res = await fetch(`/api/geocode?q=${encodeURIComponent(name + ", India")}`);
  if (!res.ok) return null;
  const data = await res.json();
  const hit = data.results?.[0];
  if (!hit || typeof hit.lat !== "number" || typeof hit.lng !== "number") return null;
  return { lat: hit.lat, lng: hit.lng, label: hit.city || name };
}

export async function geocodePosition(lat: number, lng: number): Promise<HomeLocation> {
  try {
    const res = await fetch(`/api/geocode/reverse?lat=${lat}&lng=${lng}`);
    if (res.ok) {
      const data = await res.json();
      if (data.city) return { lat, lng, label: data.city };
    }
  } catch {
    // fall through to generic label
  }
  return { lat, lng, label: "My location" };
}

export async function locateFromBrowser(): Promise<HomeLocation | null> {
  if (!navigator.geolocation) return null;
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      async (pos) => resolve(await geocodePosition(pos.coords.latitude, pos.coords.longitude)),
      () => resolve(null),
      { timeout: 8000 },
    );
  });
}