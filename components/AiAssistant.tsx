"use client";

import { useState } from "react";
import type { VehicleWithInfo } from "@/lib/types";
import { CarCard } from "@/components/CarCard";
import { Button } from "@/components/ui";
import { formatPriceShort } from "@/lib/format";
import { distanceLabel } from "@/lib/geo";
import { getStoredLocation } from "@/components/location-store";
import { parseBrandModel, recordDemand } from "@/lib/demand";

const SUGGESTIONS = [
  "Mere budget ki best car",
  "₹10 lakh tak family car",
  "Kam maintenance wali car",
  "City use ke liye petrol car",
  "₹15 lakh tak best SUV",
  "Creta vs Seltos compare",
];

const PLACEHOLDER =
  "Example: I need a 5 seater petrol car under ₹10 lakh, 2022 or newer, near me";

interface Parsed {
  maxPrice: number | null;
  minYear: number | null;
  fuel: string | null;
  transmission: string | null;
  wantsNear: boolean;
  seats: number | null;
  compare: string[] | null;
}

function normalize(s: string) {
  return s.toLowerCase().replace(/,/g, "");
}

function parseReq(q: string): Parsed {
  const s = normalize(q);
  const out: Parsed = {
    maxPrice: null,
    minYear: null,
    fuel: null,
    transmission: null,
    wantsNear: false,
    seats: null,
    compare: null,
  };

  const vs = q.split(/\s+vs\.?\s+/i);
  if (vs.length >= 2 && vs.every((x) => trimForSearch(x).length > 0)) {
    out.compare = vs
      .map((x) =>
        trimForSearch(x)
          .replace(/^(compare|show|difference|between|me)\b\s*/i, "")
          .trim(),
      )
      .filter((x) => x.length > 0)
      .slice(0, 3);
    if (out.compare.length >= 2) return out;
  }

  const crore = s.match(
    /(?:under|below|less than|up to|max)?\s*₹?\s*(\d+(?:\.\d+)?)\s*(?:cr|crore)/,
  );
  const lakh = s.match(
    /(?:under|below|less than|up to|max)?\s*₹?\s*(\d+(?:\.\d+)?)\s*(?:lakh|lac)/,
  );
  if (lakh) out.maxPrice = Math.round(parseFloat(lakh[1]) * 100000);
  else if (crore) out.maxPrice = Math.round(parseFloat(crore[1]) * 10000000);

  if (/electric|ev\b/.test(s)) out.fuel = "Electric";
  else if (/hybrid/.test(s)) out.fuel = "Hybrid";
  else if (/\bcng\b/.test(s)) out.fuel = "CNG";
  else if (/diesel/.test(s)) out.fuel = "Diesel";
  else if (/petrol/.test(s)) out.fuel = "Petrol";

  if (/amt\b/.test(s)) out.transmission = "AMT";
  else if (/automatic|auto\b|a7|a 7\b/.test(s)) out.transmission = "Automatic";
  else if (/\bmanual\b/.test(s)) out.transmission = "Manual";

  const yrs = s.match(/20\d{2}/g);
  if (yrs) {
    const y = parseInt(yrs[0], 10);
    out.minYear = /after/.test(s) ? y + 1 : y;
  }

  out.wantsNear = /near me|nearby|around me|aas-paas|\bpaas\b|near\b/.test(s);

  const seats = s.match(/(\d)\s*(?:seater|seat|sitting)/);
  if (seats) out.seats = parseInt(seats[1], 10);

  return out;
}

function trimForSearch(x: string) {
  return x.trim().replace(/\s+/g, " ");
}

interface Scored extends VehicleWithInfo {
  score: number;
  reasons: string[];
  missed?: string[];
}

function scoreVehicle(v: VehicleWithInfo, p: Parsed): Scored {
  const reasons: string[] = [];
  let score = 0;

  if (p.maxPrice != null) {
    if (v.price <= p.maxPrice) {
      reasons.push(`Aapke ${formatPriceShort(v.price)} ya usse kam budget mein fit hai`);
      score += 3;
    } else {
      reasons.push(`${formatPriceShort(v.price)} — budget se upar`);
      score -= 3;
    }
  }

  if (p.fuel) {
    if (v.fuel.toLowerCase() === p.fuel.toLowerCase()) {
      reasons.push(`${v.fuel} fuel (aapki pasand se match)`);
      score += 2;
    } else {
      score -= 1;
    }
  }

  if (p.transmission) {
    if (v.transmission.toLowerCase() === p.transmission.toLowerCase()) {
      reasons.push(`${v.transmission} transmission`);
      score += 1;
    } else {
      score -= 1;
    }
  }

  if (p.minYear) {
    if (v.year >= p.minYear) {
      reasons.push(`${v.year} model year (${p.minYear} ya naya)`);
      score += 2;
    } else {
      score -= 2;
    }
  }

  if (p.wantsNear && v.distance_km != null) {
    reasons.push(`${distanceLabel(v.distance_km)} door aapse`);
  }

  return { ...v, score, reasons };
}

function describeHelp(p: Parsed) {
  const notes: string[] = [];
  if (p.seats != null) {
    notes.push(
      "Kar seating inventory mein abhi stored nahi hai — finalize karne se pehle seats dealer se confirm karo.",
    );
  }
  if (!p.maxPrice && !p.fuel && p.minYear == null && !p.transmission) {
    notes.push(
      "Budget, fuel, year aur location batao to behtar suggestions milengi. Neeche Car Connect ki newest listings hain.",
    );
  }
  return notes;
}

interface HardSpec {
  brand: string;
  model: string;
  fuel: string;
  transmission: string;
  minYear: number | null;
  maxPrice: number | null;
}

function specCountOf(s: HardSpec): number {
  return (
    (s.brand ? 1 : 0) +
    (s.model ? 1 : 0) +
    (s.fuel ? 1 : 0) +
    (s.transmission ? 1 : 0) +
    (s.minYear != null ? 1 : 0) +
    (s.maxPrice != null ? 1 : 0)
  );
}

function matchedCount(s: HardSpec, v: VehicleWithInfo): number {
  let n = 0;
  if (s.brand && v.brand.toLowerCase() === s.brand.toLowerCase()) n += 1;
  if (s.model && v.model.toLowerCase().includes(s.model.toLowerCase())) n += 1;
  if (s.fuel && v.fuel.toLowerCase() === s.fuel.toLowerCase()) n += 1;
  if (s.transmission && v.transmission.toLowerCase() === s.transmission.toLowerCase()) n += 1;
  if (s.minYear != null && v.year >= s.minYear) n += 1;
  if (s.maxPrice != null && v.price <= s.maxPrice) n += 1;
  return n;
}

function isCloseMatch(s: HardSpec, v: VehicleWithInfo): boolean {
  const total = specCountOf(s);
  if (total < 2) return false;
  const sat = matchedCount(s, v);
  if (sat === total) return false; // exact match, handled separately
  if (sat >= Math.max(2, total - 1)) return true;
  if (
    s.brand &&
    s.model &&
    v.brand.toLowerCase() === s.brand.toLowerCase() &&
    v.model.toLowerCase().includes(s.model.toLowerCase())
  ) {
    return sat >= 2;
  }
  return false;
}

function closeRank(s: HardSpec, v: VehicleWithInfo): number {
  let rank = matchedCount(s, v);
  if (
    s.brand &&
    s.model &&
    v.brand.toLowerCase() === s.brand.toLowerCase() &&
    v.model.toLowerCase().includes(s.model.toLowerCase())
  ) {
    rank += 1;
  }
  return rank;
}

function lakhLabel(value: number | null): string {
  if (value == null) return "";
  const lakh = value / 100000;
  return Number.isInteger(lakh) ? String(lakh) : lakh.toFixed(1);
}

function requirementSummary(p: Parsed, brand: string, model: string): string {
  const parts: string[] = [];
  const name = `${brand} ${model}`.trim();
  if (name) parts.push(name);
  if (p.fuel) parts.push(p.fuel);
  if (p.transmission) parts.push(p.transmission);
  if (p.minYear) parts.push(`${p.minYear}+`);
  if (p.maxPrice != null) parts.push(`₹${lakhLabel(p.maxPrice)}L tak`);
  return parts.join(" • ");
}

function missingCriteria(p: Parsed, brand: string, model: string, v: VehicleWithInfo): string[] {
  const out: string[] = [];
  if (brand && v.brand.toLowerCase() !== brand.toLowerCase()) {
    out.push(`Brand requirement match nahi ho rahi: aapne ${brand} maanga tha.`);
  } else if (model && !v.model.toLowerCase().includes(model.toLowerCase())) {
    out.push(`Model requirement match nahi ho rahi: aapne ${model} bola tha.`);
  }
  if (p.fuel && v.fuel.toLowerCase() !== p.fuel.toLowerCase()) {
    out.push(`Fuel requirement match nahi ho rahi: aapne ${p.fuel} bola tha.`);
  }
  if (p.transmission && v.transmission.toLowerCase() !== p.transmission.toLowerCase()) {
    out.push(`Transmission requirement match nahi ho rahi: aapne ${p.transmission} bola tha.`);
  }
  if (p.minYear && v.year < p.minYear) {
    out.push(`Year requirement match nahi ho rahi: aapne ${p.minYear}+ bola tha.`);
  }
  if (p.maxPrice != null && v.price > p.maxPrice) {
    out.push(`Price requirement match nahi ho rahi: aapke ₹${lakhLabel(p.maxPrice)}L tak budget tha.`);
  }
  return out;
}

export function AiAssistant() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [results, setResults] = useState<Scored[]>([]);
  const [compareName, setCompareName] = useState<string | null>(null);
  const [favState, setFavState] = useState<Record<string, boolean>>({});
  const [mode, setMode] = useState<"match" | "close" | "none" | "general" | null>(null);
  const [alternatives, setAlternatives] = useState<Scored[]>([]);
  const [showAlternatives, setShowAlternatives] = useState(false);
  const [requirement, setRequirement] = useState("");
  const [recordId, setRecordId] = useState<string | null>(null);
  const [optInStatus, setOptInStatus] = useState<"ask" | "on" | "off">("ask");
  const [optInMsg, setOptInMsg] = useState("");

  async function run(q: string) {
    if (!q.trim()) return;
    setQuery(q);
    setLoading(true);
    setError("");
    setNote("");
    setSearched(false);
    setResults([]);
    setCompareName(null);
    setMode(null);
    setAlternatives([]);
    setShowAlternatives(false);
    setRequirement("");
    setRecordId(null);
    setOptInStatus("ask");
    setOptInMsg("");

    const parsed = parseReq(q);

    try {
      const params = new URLSearchParams({ sort: "newest" });
      if (parsed.wantsNear) {
        const loc = getStoredLocation();
        if (loc) {
          params.set("lat", String(loc.lat));
          params.set("lng", String(loc.lng));
          params.set("sort", "distance");
        }
      }
      const res = await fetch(`/api/marketplace?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Cars load nahi hui");
      const vehicles = (data.vehicles ?? []) as VehicleWithInfo[];

      if (parsed.compare) {
        const found: { name: string; car: VehicleWithInfo }[] = [];
        for (const name of parsed.compare) {
          const car = vehicles.find(
            (v) =>
              `${v.brand} ${v.model} ${v.variant} ${v.model}`
                .toLowerCase()
                .includes(name.toLowerCase()) && name.length > 1,
          );
          if (car) found.push({ name, car });
        }
        setCompareName(parsed.compare.map((n) => n.trim()).join(" vs "));
        setResults(
          found.map(({ car }) => ({
            ...car,
            score: 0,
            reasons: [car.city ? `${car.city} mein listed` : "Location set nahi"],
          })),
        );
      } else {
        const scored = vehicles
          .map((v) => scoreVehicle(v, parsed))
          .sort((a, b) => b.score - a.score || (a.distance_km ?? 1e9) - (b.distance_km ?? 1e9));

        const { brand, model } = parseBrandModel(q);
        const spec: HardSpec = {
          brand,
          model,
          fuel: parsed.fuel ?? "",
          transmission: parsed.transmission ?? "",
          minYear: parsed.minYear,
          maxPrice: parsed.maxPrice,
        };
        const brandMatch = (v: VehicleWithInfo) =>
          !brand || v.brand.toLowerCase() === brand.toLowerCase();
        const modelMatch = (v: VehicleWithInfo) =>
          !model || v.model.toLowerCase().includes(model.toLowerCase());
        const hardMatch = (v: VehicleWithInfo) =>
          brandMatch(v) &&
          modelMatch(v) &&
          (parsed.maxPrice == null || v.price <= parsed.maxPrice) &&
          (parsed.minYear == null || v.year >= parsed.minYear) &&
          (parsed.fuel == null || v.fuel.toLowerCase() === parsed.fuel.toLowerCase()) &&
          (parsed.transmission == null ||
            v.transmission.toLowerCase() === parsed.transmission.toLowerCase());
        const matches = scored.filter(hardMatch);

        // Record anonymous demand when NO car satisfies all hard criteria.
        if (matches.length === 0) {
          const loc = parsed.wantsNear ? getStoredLocation() : null;
          const cityLabel = loc?.label && loc.label !== "My location" ? loc.label : "";
          const id = await recordDemand({
            source: "ai_advisor",
            rawRequirement: q,
            brand,
            model,
            fuel: parsed.fuel ?? "",
            transmission: parsed.transmission ?? "",
            minYear: parsed.minYear,
            maxPrice: parsed.maxPrice,
            minPrice: null,
            city: cityLabel,
            lat: loc?.lat ?? null,
            lng: loc?.lng ?? null,
            radiusKm: loc ? 50 : null,
            status: vehicles.some((v) => brandMatch(v)) ? "partial" : "unmet",
          });
          if (id) setRecordId(id);
        }

        const specCount = specCountOf(spec);
        if (specCount === 0) {
          // Broad preferences — normal scored recommendations are fine.
          setMode("general");
          setResults(scored.slice(0, 8));
        } else if (matches.length > 0) {
          // CASE 1 — exact/hard-criteria matches exist: show only those.
          setMode("match");
          setResults(matches.slice(0, 8));
        } else {
          // CASE 2/3 — zero exact matches.
          const close = scored
            .filter((v) => isCloseMatch(spec, v))
            .sort((a, b) => closeRank(spec, b) - closeRank(spec, a) || b.score - a.score)
            .slice(0, 6)
            .map((v) => ({ ...v, missed: missingCriteria(parsed, brand, model, v) }));
          if (close.length > 0) {
            // CASE 3 — meaningful close matches exist.
            setMode("close");
            setResults(close);
          } else {
            // CASE 2 — record the requirement, offer stock as labeled alternatives.
            setMode("none");
            setRequirement(requirementSummary(parsed, brand, model));
            setAlternatives(scored.slice(0, 8));
            setResults([]);
          }
        }

        const help = describeHelp(parsed);
        if (help.length) setNote(help.join(" "));
      }
      setSearched(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Cars load nahi hui");
      setSearched(true);
    } finally {
      setLoading(false);
    }
  }

  function onToggleFavorite(car: VehicleWithInfo, favorite: boolean) {
    setFavState((f) => ({ ...f, [car.id]: favorite }));
  }

  async function enableNotify() {
    if (!recordId) return;
    const res = await fetch(`/api/demands/${recordId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notify: true }),
    }).catch(() => null);
    if (!res?.ok) return;
    setOptInMsg("Stock milte hi aapko bata denge.");
    setOptInStatus("on");
  }

  function declineNotify() {
    setOptInStatus("off");
  }

  return (
    <section id="ai-assistant" className="mx-auto max-w-4xl px-4">
      <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-xl shadow-stone-900/5">
        <div className="border-b border-stone-100 bg-gradient-to-r from-red-50 to-stone-50 px-5 py-4 sm:px-7">
          <p className="text-xs font-bold uppercase tracking-wide text-brand">✨ AI Assistant for Cars</p>
          <h2 className="mt-0.5 text-xl font-extrabold text-stone-900 sm:text-2xl">
            Car Recommendation According to Your Requirements
          </h2>
          <p className="mt-1 text-sm text-stone-500">
            Budget, family size, usage aur preferences batao. Humara AI asli Car Connect inventory mein
            se suitable cars dhoondhta hai.
          </p>
        </div>

        <div className="p-5 sm:p-7">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              run(query);
            }}
            className="flex flex-col gap-3 sm:flex-row"
          >
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={PLACEHOLDER}
              className="h-13 min-h-12 flex-1 rounded-lg border border-stone-300 bg-white px-4 py-3 text-sm text-stone-900 placeholder:text-stone-400 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
              aria-label="Describe the car you need"
            />
            <Button type="submit" size="lg" loading={loading} className="h-12 shrink-0">
              Recommendations Pao
            </Button>
          </form>

          <div className="no-scrollbar -mx-1 mt-4 flex gap-2 overflow-x-auto px-1 pb-1">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => run(s)}
                className="shrink-0 rounded-full border border-stone-200 bg-white px-3.5 py-1.5 text-xs font-medium text-stone-700 transition-colors hover:border-brand hover:text-brand"
              >
                {s}
              </button>
            ))}
          </div>

          {note && (
            <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">{note}</p>
          )}
          {error && (
            <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
          )}

          {searched && !error && (
            <div className="mt-6">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-stone-700">
                  {compareName
                    ? `Compare kiya ja raha: ${compareName}`
                    : mode === "match"
                      ? `${results.length} matching option${results.length === 1 ? "" : "s"} live inventory se`
                      : mode === "close"
                        ? `${results.length} close option${results.length === 1 ? "" : "s"} aapki requirement ke`
                        : mode === "none"
                          ? "Aapki requirement ke hisaab se matching car stock mein nahi mili"
                          : `${results.length} suggestion${results.length === 1 ? "" : "s"} live inventory se`}
                </h3>
                <button
                  onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
                  className="text-xs font-medium text-brand hover:underline"
                >
                  Dobara poochho ↑
                </button>
              </div>

              {compareName ? (
                results.length === 0 ? (
                  <div className="mt-4 rounded-xl border border-dashed border-stone-300 bg-white px-6 py-10 text-center">
                    <span className="text-3xl">🛻</span>
                    <p className="mt-2 text-sm font-medium text-stone-700">
                      Abhi in requirements se koi car match nahi karti.
                    </p>
                    <p className="mx-auto mt-1 max-w-sm text-sm text-stone-500">
                      Zyada budget try karo, fuel/year filters hatao, ya full marketplace dekho. Agar koi
                      field available nahi thi, to AI ne guess karne ki bajaye bata diya.
                    </p>
                  </div>
                ) : (
                  <CompareTable cars={results} />
                )
              ) : mode === "none" ? (
                <div className="mt-4 rounded-xl border border-stone-200 bg-white p-5 shadow-sm sm:p-6">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">📝</span>
                    <div>
                      <p className="text-base font-bold text-stone-900">
                        Aapki choice record kar li gayi hai
                      </p>
                      <p className="mt-1 text-sm text-stone-500">
                        Abhi aapki requirement ke hisaab se koi matching car stock mein nahi hai. Hum aisi
                        car stock mein add karne ki koshish karenge.
                      </p>
                    </div>
                  </div>
                  {requirement && (
                    <p className="mt-3 inline-block rounded-lg bg-stone-100 px-3 py-1.5 text-sm font-semibold text-stone-700">
                      {requirement}
                    </p>
                  )}
                  {recordId && optInStatus !== "off" && (
                    <div className="mt-4 rounded-lg border border-stone-200 bg-stone-50 p-3.5">
                      {optInStatus === "ask" ? (
                        <>
                          <p className="text-sm font-semibold text-stone-800">
                            🔔 Is requirement ke liye updates paana hai?
                          </p>
                          <p className="mt-0.5 text-xs text-stone-500">
                            Jab stock mein aisi car aayegi, to aapko yahan hi pata chale jayega.
                          </p>
                          <div className="mt-2.5 flex flex-wrap items-center gap-2">
                            <Button size="sm" onClick={enableNotify}>Haan, batao</Button>
                            <Button variant="outline" size="sm" onClick={declineNotify}>Nahi, thanks</Button>
                          </div>
                        </>
                      ) : (
                        <p className="text-sm font-medium text-emerald-700">✓ {optInMsg}</p>
                      )}
                    </div>
                  )}
                  <div className="mt-4">
                    <Button variant="outline" onClick={() => setShowAlternatives((v) => !v)}>
                      {showAlternatives ? "Alternatives chhupao" : "Stock mein available cars dekho"}
                    </Button>
                  </div>
                  {showAlternatives && (
                    <div className="mt-5 border-t border-stone-100 pt-4">
                      <p className="font-semibold text-stone-800">
                        Aapki requirement se exact match nahi mila
                      </p>
                      <p className="mt-0.5 text-sm text-stone-500">
                        Ye current available cars hain jo aapki requirement ke closest options hain.
                      </p>
                      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {alternatives.map((car) => (
                          <div key={car.id} className="flex flex-col">
                            <CarCard
                              car={{ ...car, is_favorite: favState[car.id] ?? car.is_favorite }}
                              onToggleFavorite={onToggleFavorite}
                            />
                            {car.reasons.length > 0 && (
                              <ul className="mt-2 space-y-1 px-1">
                                {car.reasons.slice(0, 3).map((r, i) => (
                                  <li key={i} className="flex items-start gap-1.5 text-xs text-stone-500">
                                    <span className="mt-0.5 text-brand">•</span>
                                    <span>{r}</span>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  {mode === "close" && (
                    <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800">
                      Exact match nahi mila, lekin ye close options available hain.
                    </p>
                  )}
                  {results.length === 0 ? (
                    <div className="mt-4 rounded-xl border border-dashed border-stone-300 bg-white px-6 py-10 text-center">
                      <span className="text-3xl">🛻</span>
                      <p className="mt-2 text-sm font-medium text-stone-700">
                        Abhi in requirements se koi car match nahi karti.
                      </p>
                      <p className="mx-auto mt-1 max-w-sm text-sm text-stone-500">
                        Zyada budget try karo, fuel/year filters hatao, ya full marketplace dekho. Agar koi
                        field available nahi thi, to AI ne guess karne ki bajaye bata diya.
                      </p>
                    </div>
                  ) : (
                    <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {results.map((car) => (
                        <div key={car.id} className="flex flex-col">
                          <CarCard
                            car={{ ...car, is_favorite: favState[car.id] ?? car.is_favorite }}
                            onToggleFavorite={onToggleFavorite}
                          />
                          {mode === "close" &&
                            car.missed &&
                            car.missed.length > 0 && (
                              <ul className="mt-2 space-y-1 px-1">
                                {car.missed.map((m, i) => (
                                  <li key={i} className="flex items-start gap-1.5 text-xs font-medium text-amber-700">
                                    <span className="mt-0.5">⚠️</span>
                                    <span>{m}</span>
                                  </li>
                                ))}
                              </ul>
                            )}
                          {car.reasons.length > 0 && (
                            <ul className="mt-2 space-y-1 px-1">
                              {car.reasons.slice(0, 3).map((r, i) => (
                                <li key={i} className="flex items-start gap-1.5 text-xs text-stone-500">
                                  <span className="mt-0.5 text-brand">•</span>
                                  <span>{r}</span>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function CompareTable({ cars }: { cars: VehicleWithInfo[] }) {
  const rows = [
    { label: "Price", get: (v: VehicleWithInfo) => formatPriceShort(v.price) },
    { label: "Year", get: (v: VehicleWithInfo) => String(v.year) },
    { label: "KM", get: (v: VehicleWithInfo) => `${v.km.toLocaleString("en-IN")} km` },
    { label: "Fuel", get: (v: VehicleWithInfo) => v.fuel },
    { label: "Owner", get: (v: VehicleWithInfo) => `${v.owner} owner` },
    { label: "Transmission", get: (v: VehicleWithInfo) => v.transmission },
    { label: "City", get: (v: VehicleWithInfo) => v.city || "—" },
    { label: "Variant", get: (v: VehicleWithInfo) => v.variant || "—" },
    { label: "Dealer", get: (v: VehicleWithInfo) => v.dealer?.dealership_name || "—" },
  ];
  const verify = (v: VehicleWithInfo) => (v.dealer?.verified ? "✓ Verified Dealer" : "Dealer");
  return (
    <div className="mt-4 overflow-x-auto rounded-xl border border-stone-200">
      <table className="w-full min-w-[560px] text-left text-sm">
        <thead>
          <tr className="border-b border-stone-200 bg-stone-50">
            <th className="px-4 py-3 font-semibold text-stone-500">Spec</th>
            {cars.map((c) => (
              <th key={c.id} className="px-4 py-3 font-extrabold text-stone-900">
                {c.brand} {c.model} {c.variant}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-100">
          {rows.map((row) => (
            <tr key={row.label}>
              <td className="px-4 py-2.5 font-medium text-stone-500">{row.label}</td>
              {cars.map((c) => (
                <td key={c.id} className="px-4 py-2.5 text-stone-800">
                  {row.get(c)}
                </td>
              ))}
            </tr>
          ))}
          <tr>
            <td className="px-4 py-2.5 font-medium text-stone-500">Dealer status</td>
            {cars.map((c) => (
              <td key={c.id} className="px-4 py-2.5 text-stone-800">
                {verify(c)}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
      <p className="border-t border-stone-100 px-4 py-3 text-xs text-stone-400">
        Insurance, registration aur features sirf tab dikhte hain jab dealers provide karte hain — abhi
        current inventory mein stored nahi hain.
      </p>
    </div>
  );
}