// Shared shape for "where is this thing located" data. Used by the dealer
// profile location section and the vehicle listing location.
export interface LocationValue {
  city: string;
  state: string;
  address: string;
  lat: number | null;
  lng: number | null;
}

export const EMPTY_LOCATION: LocationValue = {
  city: "",
  state: "",
  address: "",
  lat: null,
  lng: null,
};

export function locationText(v: {
  city?: string | null;
  state?: string | null;
  address?: string | null;
}): string {
  const parts = [v.city, v.state].map((p) => (p ?? "").trim()).filter(Boolean);
  return parts.join(", ");
}

/** Short readable line, e.g. the saved office address or "Pilani, Rajasthan". */
export function addressLine(v: {
  city?: string | null;
  state?: string | null;
  address?: string | null;
}): string {
  const address = (v.address ?? "").trim();
  return address || locationText(v);
}

/** Readable address + city + state, for the customer's dealer location block. */
export function addressFull(v: {
  city?: string | null;
  state?: string | null;
  address?: string | null;
}): string {
  const parts = [(v.address ?? "").trim(), (v.city ?? "").trim(), (v.state ?? "").trim()].filter(
    Boolean,
  );
  // Address already ends with the city/state in most geocoder labels.
  const joined = parts.join(", ");
  if (!joined) return "";
  const tail = locationText(v);
  return tail && !joined.includes(tail) ? `${joined}, ${tail}` : joined;
}

export function hasCoordinates(v: { lat?: number | null; lng?: number | null }): boolean {
  return typeof v.lat === "number" && Number.isFinite(v.lat) && typeof v.lng === "number" && Number.isFinite(v.lng);
}

export function hasAnyLocation(v: LocationValue): boolean {
  return hasCoordinates(v) || Boolean(v.city.trim() || v.state.trim() || v.address.trim());
}

export function sameLocation(a: LocationValue, b: LocationValue): boolean {
  return (
    a.city.trim() === b.city.trim() &&
    a.state.trim() === b.state.trim() &&
    a.address.trim() === b.address.trim() &&
    (hasCoordinates(a) ? a.lat === b.lat && a.lng === b.lng : !hasCoordinates(b))
  );
}
