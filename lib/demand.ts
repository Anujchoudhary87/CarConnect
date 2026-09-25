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
  seatingCapacity: number | null;
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

// Words that clearly are NOT a car-model name. Only consulted when a query has
// no brand, so "Honda City" still parses model="city" via the brand branch.
const MODEL_STOP = new Set([
  "below", "less", "upto", "till", "within", "or", "with", "the", "a", "an", "any", "new", "newer",
  "used", "ka", "ki", "ke", "se", "mein", "chahiye", "chahta", "chahti", "hain", "hai", "wala",
  "wali", "wale", "car", "cars", "vehicle", "vehicles", "budget", "max", "minimum", "lakh", "lac",
  "lakhs", "crore", "cr", "rupees", "rs", "tak", "like", "need", "want", "looking", "best", "good",
  "great", "nice", "safe", "my", "i", "petrol", "diesel", "cng", "electric", "ev", "hybrid", "lpg",
  "automatic", "auto", "manual", "amt", "cvt", "dct", "suv", "suvs", "sedan", "sedans", "hatchback",
  "hatchbacks", "mpv", "mpvs", "crossover", "crossovers", "luxury", "sports", "family", "city",
  "use", "liye", "kaam", "seater", "seat", "seats", "seating", "sitting", "passenger", "passengers",
  "people", "persons", "person", "km", "kms", "owner", "owners", "baad", "before", "aur", "ya",
  "ek", "do", "teen", "donon", "sasta", "sasti", "mehanga", "mehangi", "zyada", "jada", "kam",
  "dikhhao", "show", "nearest", "compare", "comparison", "difference", "between", "look", "suggest",
  "recommend", "recommendation", "sahi", "exact", "better", "price", "prices", "in", "on", "at",
  "as", "so", "very", "quite", "both", "one", "two", "three", "first", "second", "third",
]);

// Normalize free text for model/spec matching: lowercase, strip ₹/commas, collapse whitespace.
export function normalizePhrase(s: string): string {
  return s.toLowerCase().replace(/[₹,]/g, "").replace(/\s+/g, " ").trim();
}

// True when `phrase` appears in `text` on word boundaries (never as a substring of a longer word).
export function matchesPhrase(text: string, phrase: string): boolean {
  if (!phrase) return false;
  const i = text.indexOf(phrase);
  if (i < 0) return false;
  const isWord = (c: string | undefined) => typeof c === "string" && /[a-z0-9]/.test(c);
  const prev = i === 0 ? undefined : text[i - 1];
  const end = i + phrase.length;
  const next = end >= text.length ? undefined : text[end];
  return !isWord(prev) && !isWord(next);
}

// Best-effort brand + model extraction from a free-text requirement.
// - With a brand: first meaningful token after the brand (existing behavior).
// - Without a brand: the first plausible model token ("Thar", "Ciaz", "2022 Thar diesel").
//   Broad/generic words are ignored so "petrol SUV", "family car", etc. stay brand-agnostic.
export function parseBrandModel(q: string): { brand: string; model: string } {
  const clean = normalizePhrase(q);
  const lower = clean;
  const brand = BRANDS.find((b) => lower.includes(b.trim().toLowerCase())) ?? "";
  if (brand) {
    const idx = lower.indexOf(brand.toLowerCase());
    const rest = clean.slice(idx + brand.length).replace(/[,:.()]/g, " ").trim();
    const first = (rest.split(/\s+/)[0] ?? "").replace(/[^a-zA-Z0-9\-]/g, "");
    if (!first || first.length < 2 || BRAND_STOP.has(first.toLowerCase()) || /^20\d{2}$/.test(first)) {
      return { brand, model: "" };
    }
    return { brand, model: first };
  }
  for (const raw of clean.split(/\s+/)) {
    const t = raw.replace(/[^a-zA-Z0-9]/g, "");
    if (!t || t.length < 2) continue;
    if (/^20\d{2}$/.test(t)) continue;
    if (/^\d/.test(t)) continue;
    if (BRAND_STOP.has(t) || MODEL_STOP.has(t)) continue;
    return { brand, model: t };
  }
  return { brand, model: "" };
}

export function fingerprintOf(f: DemandFields): string {
  const b = priceBucket(f.maxPrice ? f.maxPrice / 100000 : null);
  return [
    f.brand.trim().toLowerCase(),
    f.model.trim().toLowerCase(),
    f.fuel.trim().toLowerCase(),
    f.transmission.trim().toLowerCase(),
    f.seatingCapacity ? String(f.seatingCapacity) : "",
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
    f.transmission.trim().toLowerCase() || "any",
    f.seatingCapacity ? String(f.seatingCapacity) : "any",
    f.minYear ? String(f.minYear) : "any",
    priceBucketKey(b) || "any",
    city || "allindia",
  ].join("::");
}

export function isMeaningful(f: DemandFields): boolean {
  return Boolean(
    f.brand || f.model || f.fuel || f.transmission || f.seatingCapacity || f.minYear || f.maxPrice,
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