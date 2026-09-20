"use client";

import { useState } from "react";
import type { VehicleWithInfo } from "@/lib/types";
import { CarCard } from "@/components/CarCard";
import { Button } from "@/components/ui";
import { formatPriceShort } from "@/lib/format";
import { distanceLabel } from "@/lib/geo";
import { getStoredLocation } from "@/components/location-store";

const SUGGESTIONS = [
  "Best car for my budget",
  "Family car under ₹10 lakh",
  "Low maintenance car",
  "Petrol car for city use",
  "Best SUV under ₹15 lakh",
  "Compare Creta vs Seltos",
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
}

function scoreVehicle(v: VehicleWithInfo, p: Parsed): Scored {
  const reasons: string[] = [];
  let score = 0;

  if (p.maxPrice != null) {
    if (v.price <= p.maxPrice) {
      reasons.push(`Fits your budget of ${formatPriceShort(v.price)} or less`);
      score += 3;
    } else {
      reasons.push(`Priced ${formatPriceShort(v.price)} — above your budget`);
      score -= 3;
    }
  }

  if (p.fuel) {
    if (v.fuel.toLowerCase() === p.fuel.toLowerCase()) {
      reasons.push(`${v.fuel} fuel (matches your choice)`);
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
      reasons.push(`${v.year} model year (${p.minYear} or newer)`);
      score += 2;
    } else {
      score -= 2;
    }
  }

  if (p.wantsNear && v.distance_km != null) {
    reasons.push(`${distanceLabel(v.distance_km)} from you`);
  }

  return { ...v, score, reasons };
}

function describeHelp(p: Parsed) {
  const notes: string[] = [];
  if (p.seats != null) {
    notes.push(
      "Seating capacity is not stored in the inventory yet — verify seats directly with the dealer before finalising.",
    );
  }
  if (!p.maxPrice && !p.fuel && p.minYear == null && !p.transmission) {
    notes.push(
      "Tell me your budget, fuel, year and location for sharper suggestions. Results below are the newest listings on Car Connect.",
    );
  }
  return notes;
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

  async function run(q: string) {
    if (!q.trim()) return;
    setQuery(q);
    setLoading(true);
    setError("");
    setNote("");
    setSearched(false);
    setResults([]);
    setCompareName(null);

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
      if (!res.ok) throw new Error(data.error ?? "Could not load cars");
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
            reasons: [car.city ? `Listed in ${car.city}` : "Location not set"],
          })),
        );
      } else {
        const scored = vehicles
          .map((v) => scoreVehicle(v, parsed))
          .sort((a, b) => b.score - a.score || (a.distance_km ?? 1e9) - (b.distance_km ?? 1e9));
        setResults(scored.slice(0, 8));
        const help = describeHelp(parsed);
        if (help.length) setNote(help.join(" "));
      }
      setSearched(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load cars");
      setSearched(true);
    } finally {
      setLoading(false);
    }
  }

  function onToggleFavorite(car: VehicleWithInfo, favorite: boolean) {
    setFavState((f) => ({ ...f, [car.id]: favorite }));
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
            Tell us your budget, family size, usage and preferences. Our AI will find suitable cars for
            you from the real Car Connect inventory.
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
              Get Car Recommendations
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
                    ? `Comparing: ${compareName}`
                    : `${results.length} suggestion${results.length === 1 ? "" : "s"} from live inventory`}
                </h3>
                <button
                  onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
                  className="text-xs font-medium text-brand hover:underline"
                >
                  Ask again ↑
                </button>
              </div>

              {results.length === 0 ? (
                <div className="mt-4 rounded-xl border border-dashed border-stone-300 bg-white px-6 py-10 text-center">
                  <span className="text-3xl">🛻</span>
                  <p className="mt-2 text-sm font-medium text-stone-700">
                    No cars match these requirements right now.
                  </p>
                  <p className="mx-auto mt-1 max-w-sm text-sm text-stone-500">
                    Try a wider budget, relax fuel/year filters, or check the full marketplace. If a
                    field wasn&apos;t available, the AI said so instead of guessing.
                  </p>
                </div>
              ) : compareName ? (
                <CompareTable cars={results} />
              ) : (
                <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {results.map((car) => (
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
        Insurance, registration and features are shown only when dealers provide them — they are not
        stored in the current inventory.
      </p>
    </div>
  );
}