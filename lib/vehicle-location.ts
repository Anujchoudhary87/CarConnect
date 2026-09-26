import { EMPTY_LOCATION, hasCoordinates, type LocationValue } from "@/lib/location";

export interface LocationInput {
  city?: string | null;
  state?: string | null;
  address?: string | null;
  lat?: number | null;
  lng?: number | null;
}

export function toLocationValue(v: LocationInput | null | undefined): LocationValue {
  return {
    city: (v?.city ?? "").trim(),
    state: (v?.state ?? "").trim(),
    address: (v?.address ?? "").trim(),
    lat: hasCoordinates(v ?? {}) ? (v!.lat as number) : null,
    lng: hasCoordinates(v ?? {}) ? (v!.lng as number) : null,
  };
}

function text(v: string | null | undefined): string {
  return (v ?? "").trim();
}

/**
 * Location that gets stored on a vehicle listing.
 *
 * A listing is expected to carry its own copy of the location so it can be
 * changed (or geocoded) later without the dealer profile shifting underneath
 * it. When the request carries its own coordinates the listing is treated as
 * an explicit per-vehicle location, otherwise it inherits the dealer's saved
 * profile location. Empty text fields fall back to the dealer profile so a
 * pin without a reverse-geocoded city never blanks out a listing.
 *
 * `existing` is the row's current location and is only used on update: a
 * request that says nothing about location keeps what the listing already has,
 * so a per-vehicle override is never silently reset.
 */
export function resolveVehicleLocation(
  dealer: LocationInput | null | undefined,
  body: LocationInput | null | undefined,
  existing?: LocationInput | null,
): LocationValue {
  const base = toLocationValue(dealer);
  const b = body ?? {};
  const city = text(b.city);
  const state = text(b.state);
  const address = text(b.address);
  const lat = hasCoordinates(b) ? (b.lat as number) : null;
  const lng = hasCoordinates(b) ? (b.lng as number) : null;

  if (hasCoordinates(b)) {
    return {
      city: city || base.city,
      state: state || base.state,
      address: address || base.address,
      lat,
      lng,
    };
  }

  const current = toLocationValue(existing);
  const bodySaysNothing = !city && !state && !address;
  if (existing && bodySaysNothing && (hasCoordinates(current) || current.city || current.address)) {
    return current;
  }

  return {
    city: city || base.city,
    state: state || base.state,
    address: address || base.address,
    lat: base.lat,
    lng: base.lng,
  };
}

/** Location of a dealer profile that can seed a listing, or null when unset. */
export function dealerDefaultLocation(dealer: LocationInput | null | undefined): LocationValue {
  const v = toLocationValue(dealer);
  return hasCoordinates(v) || v.city || v.state || v.address ? v : { ...EMPTY_LOCATION };
}
