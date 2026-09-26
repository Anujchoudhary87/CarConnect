/**
 * Google Maps deep link for a saved point.
 *
 * Always built from the exact stored latitude/longitude, so the link lands on
 * the pin itself. A city/address text search is deliberately not used as a
 * fallback: it can drop the customer at a city centre instead of the shop.
 */
export function googleMapsUrl(
  lat: number | null | undefined,
  lng: number | null | undefined,
): string | null {
  if (typeof lat !== "number" || typeof lng !== "number") return null;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  // 6 decimals ≈ 0.1 m, well beyond what a map pin needs, and keeps the URL short.
  const query = `${lat.toFixed(6)},${lng.toFixed(6)}`;
  return `https://www.google.com/maps?q=${query}`;
}
