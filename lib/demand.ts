import { BRANDS } from "@/lib/constants";
import type { DemandSource } from "@/lib/types";

// Shared, client-safe helpers for the "Customer Demand" feature.
// Used by the AI Advisor and marketplace to normalize an unmet requirement
// into structured, anonymous demand fields.

export interface DemandFields {
  source: DemandSource;
  rawRequirement: string;
  brand: string;
  model: string;
  fuel: string;
  transmission: string;
  minYear: number | null;
  maxPrice: number | null;
  minPrice: number | null;
  city: string;
  lat: number | null;
  lng: number | null;
  radiusKm: number | null;
}

export const PRICE_BUCKETS_LAKH = [5, 8, 10, 15, 20, 30, 50];

export interface PriceBucket {
  low: number | null;
  high: number | null;
}

export function priceBucket(lakh?: number | null): PriceBucket {
  if (lakh == null || !isFinite(lakh) || lakh <= 0) return { low: null, high: null };
  for (let i = 0; i < PRICE_BUCKETS_LAKH.length; i++) {
    if (lakh <= PRICE_BUCKETS_LAKH[i]) {
      return { low: i === 0 ? null : PRICE_BUCKETS_LAKH[i - 1], high: PRICE_BUCKETS_LAKH[i] };
    }
  }
  const last = PRICE_BUCKETS_LAKH[PRICE_BUCKETS_LAKH.length - 1];
  return { low: last, high: null };
}

export function priceBucketKey(b: PriceBucket): string {
  return `${b.low ?? ""}-${b.high ?? ""}`;
}

export function priceBucketLabel(b: PriceBucket): string {
  if (b.low == null && b.high == null) return "";
  if (b.low == null) return `≤₹${b.high}L`;
  if (b.high == null) return `₹${b.low}L+`;
  return `₹${b.low}–${b.high}L`;
}

const BRAND_STOP = new Set([
  "under", "below", "less", "up", "to", "near", "nearby", "with", "and", "for", "the", "a", "an",
  "any", "new", "newer", "used", "ka", "ki", "ke", "se", "mein", "chahiye", "wala", "wali", "car",
  "cars", "budget", "max", "minimum", "around", "me", "aas", "paas", "neighbourhood",
]);

// Best-effort brand + first model token extraction from a free-text requirement.
export function parseBrandModel(q: string): { brand: string; model: string } {
  const lower = q.toLowerCase();
  const brand = BRANDS.find((b) => lower.includes(b.trim().toLowerCase())) ?? "";
  if (!brand) return { brand: "", model: "" };
  const idx = lower.indexOf(brand.toLowerCase());
  const rest = q.slice(idx + brand.length).replace(/[,:.()]/g, " ").trim();
  const first = (rest.split(/\s+/)[0] ?? "").replace(/[^a-zA-Z0-9\-]/g, "");
  if (!first || first.length < 2 || BRAND_STOP.has(first.toLowerCase()) || /^20\d{2}$/.test(first)) {
    return { brand, model: "" };
  }
  return { brand, model: first };
}

export function fingerprintOf(f: DemandFields): string {
  const b = priceBucket(f.maxPrice ? f.maxPrice / 100000 : null);
  return [
    f.brand.trim().toLowerCase(),
    f.model.trim().toLowerCase(),
    f.fuel.trim().toLowerCase(),
    f.transmission.trim().toLowerCase(),
    f.minYear ? String(f.minYear) : "",
    b.high ? String(b.high) : "",
    f.minPrice ? String(Math.round(f.minPrice / 100000)) : "",
    (f.city || "").trim().toLowerCase(),
  ].join("|");
}

export function clusterKeyOf(f: DemandFields): string {
  const b = priceBucket(f.maxPrice ? f.maxPrice / 100000 : null);
  const city = (f.city || "").trim().toLowerCase();
  return [
    f.brand.trim().toLowerCase() || "any",
    f.model.trim().toLowerCase() || "any",
    f.fuel.trim().toLowerCase() || "any",
    f.minYear ? String(f.minYear) : "any",
    priceBucketKey(b) || "any",
    city || "allindia",
  ].join("::");
}

export function isMeaningful(f: DemandFields): boolean {
  return Boolean(
    f.brand || f.model || f.fuel || f.transmission || f.minYear || f.maxPrice,
  );
}

// Fire-and-forget demand recording. Never blocks or surfaces errors to the user.
// Resolves to the recorded (or already-existing) demand id when the server
// accepted it — used for the AI Advisor's stock-notification opt-in.
export async function recordDemand(
  payload: DemandFields & { status?: "unmet" | "partial" },
): Promise<string | null> {
  try {
    const res = await fetch("/api/demands", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = (await res.json().catch(() => null)) as { ok?: boolean; id?: string } | null;
    if (!res.ok || !data?.ok || !data.id) return null;
    return data.id;
  } catch {
    // Demand capture is best-effort; ignore network/errors entirely.
    return null;
  }
}