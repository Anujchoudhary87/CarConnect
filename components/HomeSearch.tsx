"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import type { VehicleWithInfo } from "@/lib/types";
import { CarCard } from "@/components/CarCard";
import { Button } from "@/components/ui";
import { getStoredLocation } from "@/components/location-store";
import { matchesPhrase, normalizePhrase, parseBrandModel, recordDemand } from "@/lib/demand";

const SEARCH_SUGGESTIONS = [
  "Thar",
  "Mahindra Thar",
  "Thar 2025",
  "Thar Diesel",
  "Creta 2024",
  "i20 automatic",
  "Scorpio 2022 diesel",
];

interface ParsedSearch {
  raw: string;
  brand: string;
  model: string;
  year: number | null;
  fuel: string;
  transmission: string;
  seats: number | null;
  maxPrice: number | null;
}

function parseSearch(input: string): ParsedSearch {
  const norm = normalizePhrase(input);
  const { brand: parsedBrand, model: rawModel } = parseBrandModel(input);

  // Year: e.g. 2025, 2024, 2022
  const yearMatch = norm.match(/\b(20\d{2})\b/);
  const year = yearMatch ? parseInt(yearMatch[1], 10) : null;

  // Fuel: Petrol, Diesel, CNG, Electric/EV, Hybrid
  let fuel = "";
  if (/electric|\bev\b/.test(norm)) fuel = "Electric";
  else if (/cng/.test(norm)) fuel = "CNG";
  else if (/diesel/.test(norm)) fuel = "Diesel";
  else if (/petrol/.test(norm)) fuel = "Petrol";
  else if (/hybrid/.test(norm)) fuel = "Hybrid";

  // Transmission: Automatic, Manual, AMT
  let transmission = "";
  if (/amt\b/.test(norm)) transmission = "AMT";
  else if (/automatic|auto\b/.test(norm)) transmission = "Automatic";
  else if (/manual/.test(norm)) transmission = "Manual";

  // Seating: e.g. 5 seater, 7 seater
  const seatMatch = norm.match(/\b(\d+)\s*(?:seater|seat|sitting)\b/);
  const seats = seatMatch ? parseInt(seatMatch[1], 10) : null;

  // Budget / max price: e.g. "under 10 lakh", "8 lakh tak"
  let maxPrice: number | null = null;
  const priceMatch = norm.match(/(?:under|below|max|upto|tak)\s*₹?\s*(\d+(?:\.\d+)?)\s*(?:lakh|lac|l)/);
  if (priceMatch) {
    maxPrice = Math.round(parseFloat(priceMatch[1]) * 100000);
  }

  // Model fallback resolution
  let model = rawModel;
  if (!model) {
    const knownModels = [
      "thar",
      "creta",
      "scorpio",
      "i20",
      "i10",
      "swift",
      "baleno",
      "brezza",
      "ertiga",
      "seltos",
      "sonet",
      "venue",
      "exter",
      "verna",
      "city",
      "amaze",
      "nexon",
      "punch",
      "harrier",
      "safari",
      "innova",
      "fortuner",
      "hyryder",
      "hector",
    ];
    for (const km of knownModels) {
      if (matchesPhrase(norm, km)) {
        model = km;
        break;
      }
    }
  }

  // If brand is empty but model is known, associate standard brand where definitive
  let brand = parsedBrand;
  if (!brand && model) {
    const mLower = model.toLowerCase();
    if (mLower === "thar" || mLower === "scorpio") brand = "Mahindra";
    else if (mLower === "creta" || mLower === "venue" || mLower === "i20" || mLower === "i10" || mLower === "verna" || mLower === "exter") brand = "Hyundai";
    else if (mLower === "swift" || mLower === "baleno" || mLower === "brezza" || mLower === "ertiga") brand = "Maruti Suzuki";
    else if (mLower === "seltos" || mLower === "sonet") brand = "Kia";
    else if (mLower === "nexon" || mLower === "punch" || mLower === "harrier" || mLower === "safari") brand = "Tata";
    else if (mLower === "city" || mLower === "amaze") brand = "Honda";
    else if (mLower === "innova" || mLower === "fortuner" || mLower === "hyryder") brand = "Toyota";
  }

  return { raw: input, brand, model, year, fuel, transmission, seats, maxPrice };
}

function demandPayload(p: ParsedSearch) {
  const location = getStoredLocation();
  const city = location?.label && location.label !== "My location" ? location.label : "";
  return {
    source: "marketplace" as const,
    rawRequirement: p.raw,
    brand: p.brand,
    model: p.model,
    fuel: p.fuel,
    transmission: p.transmission,
    seatingCapacity: p.seats,
    minYear: p.year,
    maxPrice: p.maxPrice,
    minPrice: null,
    city,
    lat: location?.lat ?? null,
    lng: location?.lng ?? null,
    radiusKm: null,
    status: "unmet" as const,
  };
}

export function HomeSearch() {
  const [query, setQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [parsedState, setParsedState] = useState<ParsedSearch | null>(null);

  // Results & fallback states
  const [results, setResults] = useState<VehicleWithInfo[] | null>(null);
  const [sameModelFallback, setSameModelFallback] = useState(false);
  const [sameModelNote, setSameModelNote] = useState("");
  const [relatedCars, setRelatedCars] = useState<VehicleWithInfo[]>([]);
  const [relatedConsent, setRelatedConsent] = useState<"ask" | "yes" | "no">("ask");

  const [favorites, setFavorites] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Notification opt-in flow
  const [demandId, setDemandId] = useState<string | null>(null);
  const [notifyStatus, setNotifyStatus] = useState<"ask" | "on" | "off">("ask");
  const [notifyBusy, setNotifyBusy] = useState(false);
  const [notifyMessage, setNotifyMessage] = useState("");

  async function executeSearch(searchPhrase: string) {
    const term = searchPhrase.trim();
    if (!term) {
      setError("Search ke liye brand, model, variant ya spec likhein.");
      setResults(null);
      return;
    }

    setQuery(term);
    setLoading(true);
    setError("");
    setNotifyMessage("");
    setDemandId(null);
    setNotifyStatus("ask");
    setSameModelFallback(false);
    setSameModelNote("");
    setRelatedCars([]);
    setRelatedConsent("ask");
    setSubmittedQuery(term);

    const parsed = parseSearch(term);
    setParsedState(parsed);

    try {
      // Fetch current inventory from marketplace endpoint
      const response = await fetch("/api/marketplace?sort=newest");
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Cars load nahi hui");

      const allVehicles = (Array.isArray(data.vehicles) ? data.vehicles : []) as VehicleWithInfo[];
      const normModel = parsed.model.toLowerCase();
      const normBrand = parsed.brand.toLowerCase();

      if (normModel) {
        // Model was specifically requested
        const modelCars = allVehicles.filter((car) => {
          const mMatch = car.model.toLowerCase().includes(normModel) || car.variant?.toLowerCase().includes(normModel);
          const bMatch = !normBrand || car.brand.toLowerCase().includes(normBrand);
          return mMatch && bMatch;
        });

        if (modelCars.length > 0) {
          // Model inventory exists. Check exact spec match:
          const exactSpecMatches = modelCars.filter((car) => {
            if (parsed.year && car.year !== parsed.year) return false;
            if (parsed.fuel && car.fuel.toLowerCase() !== parsed.fuel.toLowerCase()) return false;
            if (parsed.transmission && car.transmission.toLowerCase() !== parsed.transmission.toLowerCase()) return false;
            if (parsed.seats && car.seating_capacity !== parsed.seats) return false;
            if (parsed.maxPrice && car.price > parsed.maxPrice) return false;
            return true;
          });

          if (exactSpecMatches.length > 0) {
            // Priority 1: Exact spec match exists
            setResults(exactSpecMatches);
          } else {
            // Priority 2: Same-model fallback!
            // E.g. Thar 2025 requested, but only Thar 2024 is available.
            // Show Thar 2024, explain 2025 is unavailable, allow Notify Me for exact requirement.
            const specNotes: string[] = [];
            if (parsed.year) specNotes.push(`${parsed.year}`);
            if (parsed.fuel) specNotes.push(`${parsed.fuel}`);
            if (parsed.transmission) specNotes.push(`${parsed.transmission}`);
            const specStr = specNotes.join(" ");

            setResults(modelCars);
            setSameModelFallback(true);
            setSameModelNote(
              `“${parsed.model} ${specStr}” ka exact match abhi stock mein nahi hai. Ye ${parsed.model} ke available options hain:`
            );

            // Record demand for the exact requirement
            const recordedId = await recordDemand(demandPayload(parsed));
            if (recordedId) setDemandId(recordedId);
          }
        } else {
          // Priority 3: Zero inventory of requested model!
          // NEVER automatically show Creta/Seltos/etc. Show no-match flow.
          setResults([]);
          const recordedId = await recordDemand(demandPayload(parsed));
          if (recordedId) setDemandId(recordedId);

          // Prepare related alternatives ONLY if user consents
          const related = allVehicles
            .filter((car) => {
              if (parsed.fuel && car.fuel.toLowerCase() === parsed.fuel.toLowerCase()) return true;
              if (parsed.year && Math.abs(car.year - parsed.year) <= 1) return true;
              if (normBrand && car.brand.toLowerCase().includes(normBrand)) return true;
              return false;
            })
            .slice(0, 6);
          setRelatedCars(related);
        }
      } else if (normBrand) {
        // Brand-level search (e.g. "Mahindra", "Hyundai")
        const brandCars = allVehicles.filter((car) => car.brand.toLowerCase().includes(normBrand));
        setResults(brandCars);
        if (brandCars.length === 0) {
          const recordedId = await recordDemand(demandPayload(parsed));
          if (recordedId) setDemandId(recordedId);
        }
      } else {
        // Broad search by city, fuel, or tokens
        const tokens = term.toLowerCase().split(/\s+/).filter(Boolean);
        const matches = allVehicles.filter((car) => {
          const text = `${car.brand} ${car.model} ${car.variant} ${car.city || ""}`.toLowerCase();
          return tokens.every((t) => text.includes(t));
        });
        setResults(matches);
        if (matches.length === 0) {
          const recordedId = await recordDemand(demandPayload(parsed));
          if (recordedId) setDemandId(recordedId);
        }
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Cars load nahi hui");
      setResults([]);
    } finally {
      setLoading(false);
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void executeSearch(query);
  }

  async function enableNotify() {
    setNotifyBusy(true);
    setNotifyMessage("");
    try {
      const id = demandId ?? (parsedState ? await recordDemand(demandPayload(parsedState)) : null);
      if (!id) {
        setNotifyMessage("Stock alert save karne ke liye please pehle login karein.");
        setNotifyStatus("ask");
        return;
      }
      const response = await fetch(`/api/demands/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notify: true }),
      });
      if (!response.ok) {
        setNotifyMessage("Notification enable nahi ho saka. Thodi der baad try karein.");
        return;
      }
      setDemandId(id);
      setNotifyStatus("on");
      setNotifyMessage("Aapki requirement save kar li hai. Jaise hi matching car aayegi, notification mil jayega.");
    } catch {
      setNotifyMessage("Notification enable nahi ho saka. Thodi der baad try karein.");
    } finally {
      setNotifyBusy(false);
    }
  }

  function declineNotify() {
    setNotifyStatus("off");
  }

  function updateFavorite(car: VehicleWithInfo, favorite: boolean) {
    setFavorites((current) => ({ ...current, [car.id]: favorite }));
  }

  return (
    <section id="car-search" className="mx-auto max-w-6xl scroll-mt-24 px-4">
      <div className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm sm:p-7">
        <div className="max-w-2xl">
          <p className="text-xs font-bold uppercase tracking-widest text-brand">Fast inventory search</p>
          <h2 className="mt-1 text-2xl font-extrabold tracking-tight text-stone-900 sm:text-3xl">Car Search</h2>
          <p className="mt-1 text-sm text-stone-500">
            Seedhi smart search — brand, model, year ya fuel se verified dealer stock search karein.
          </p>
        </div>

        <form onSubmit={submit} className="mt-5 flex flex-col gap-3 sm:flex-row">
          <label htmlFor="home-car-search" className="sr-only">
            Search brand, model, variant or city
          </label>
          <input
            id="home-car-search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search e.g. Thar 2025, Creta 2024, i20 automatic, Scorpio diesel"
            className="h-12 min-w-0 flex-1 rounded-xl border border-stone-300 bg-stone-50 px-4 text-sm text-stone-900 placeholder:text-stone-400 focus:border-brand focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand/20"
          />
          <Button type="submit" size="lg" loading={loading} className="h-12 shrink-0 px-8">
            Search
          </Button>
        </form>

        <div className="mt-3 flex flex-wrap items-center gap-1.5 text-xs text-stone-500">
          <span className="font-semibold text-stone-600">Quick search:</span>
          {SEARCH_SUGGESTIONS.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => void executeSearch(suggestion)}
              className="rounded-full border border-stone-200 bg-stone-50 px-2.5 py-1 text-xs text-stone-700 transition hover:border-brand hover:bg-brand/5 hover:text-brand"
            >
              {suggestion}
            </button>
          ))}
        </div>

        {error && (
          <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        )}

        {loading && (
          <p className="mt-5 text-sm text-stone-500">Live dealer inventory search ho raha hai…</p>
        )}

        {/* RESULTS FOUND (EXACT OR SAME-MODEL FALLBACK) */}
        {!loading && results !== null && results.length > 0 && (
          <div className="mt-6">
            {sameModelFallback && (
              <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-bold text-amber-900">Exact year/spec match available nahi hai</p>
                    <p className="mt-0.5 text-xs text-amber-800">{sameModelNote}</p>
                  </div>
                  {notifyStatus === "ask" && (
                    <Button
                      type="button"
                      size="sm"
                      onClick={enableNotify}
                      loading={notifyBusy}
                      className="shrink-0"
                    >
                      🔔 Notify Me for &quot;{submittedQuery}&quot;
                    </Button>
                  )}
                  {notifyStatus === "on" && (
                    <span className="text-xs font-semibold text-emerald-800">
                      ✓ Stock alert active
                    </span>
                  )}
                </div>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-bold text-stone-800">
                {results.length} car{results.length === 1 ? "" : "s"} {sameModelFallback ? "same-model options" : `found for “${submittedQuery}”`}
              </h3>
              <Link
                href={`/marketplace?q=${encodeURIComponent(submittedQuery)}`}
                className="text-sm font-semibold text-brand hover:underline"
              >
                Open full marketplace →
              </Link>
            </div>

            <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {results.map((car) => (
                <CarCard
                  key={car.id}
                  car={{ ...car, is_favorite: favorites[car.id] ?? car.is_favorite }}
                  onToggleFavorite={updateFavorite}
                />
              ))}
            </div>
          </div>
        )}

        {/* NO-MATCH STATE (ZERO INVENTORY FOR REQUESTED MODEL) */}
        {!loading && results !== null && results.length === 0 && (
          <div className="mt-6 rounded-2xl border border-dashed border-stone-300 bg-stone-50 p-5 sm:p-6">
            <h3 className="font-bold text-stone-900">Abhi exact match available nahi hai.</h3>
            <p className="mt-1 max-w-2xl text-sm text-stone-600">
              Aapki requirement save kar sakte hain. Jaise hi matching car stock mein aayegi, aapko bata denge.
            </p>

            {/* Notify Me choice */}
            {notifyStatus === "ask" && (
              <div className="mt-4 flex flex-wrap items-center gap-2.5">
                <Button type="button" size="sm" onClick={enableNotify} loading={notifyBusy}>
                  Haan, batao
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={declineNotify}>
                  Nahi, thanks
                </Button>
              </div>
            )}

            {notifyStatus === "on" && (
              <p className="mt-3 text-sm font-semibold text-emerald-700">
                ✓ Done! {notifyMessage || "Matching car stock mein aate hi aapko bata denge."}
              </p>
            )}

            {notifyStatus === "off" && (
              <p className="mt-3 text-xs text-stone-500">Requirement recorded. Notification off.</p>
            )}

            {/* Related cars separate permission question */}
            {relatedConsent === "ask" && (
              <div className="mt-5 border-t border-stone-200/80 pt-4">
                <p className="text-sm font-semibold text-stone-800">
                  Kya aap iske related cars bhi dekhna chahenge?
                </p>
                <div className="mt-2.5 flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() => setRelatedConsent("yes")}
                  >
                    Haan, related cars dikhao
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setRelatedConsent("no")}
                  >
                    Nahi, thanks
                  </Button>
                </div>
              </div>
            )}

            {relatedConsent === "yes" && relatedCars.length > 0 && (
              <div className="mt-5 border-t border-stone-200 pt-4">
                <h4 className="text-sm font-bold text-stone-800">Related Cars:</h4>
                <p className="mt-0.5 text-xs text-stone-500">
                  Aapki preference ke similar options jo abhi live stock mein available hain:
                </p>
                <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {relatedCars.map((car) => (
                    <CarCard
                      key={car.id}
                      car={{ ...car, is_favorite: favorites[car.id] ?? car.is_favorite }}
                      onToggleFavorite={updateFavorite}
                    />
                  ))}
                </div>
              </div>
            )}

            {relatedConsent === "yes" && relatedCars.length === 0 && (
              <div className="mt-5 border-t border-stone-200 pt-4 text-xs text-stone-500">
                Abhi is segment mein related cars bhi available nahi hain. Filters hata kar full marketplace dekhein.
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
