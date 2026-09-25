"use client";

import { useEffect, useRef, useState } from "react";
import type { VehicleWithInfo } from "@/lib/types";
import { CarCard } from "@/components/CarCard";
import { Button } from "@/components/ui";
import { formatPriceShort } from "@/lib/format";
import { distanceLabel } from "@/lib/geo";
import { getStoredLocation } from "@/components/location-store";
import { matchesPhrase, normalizePhrase, parseBrandModel, recordDemand } from "@/lib/demand";
import {
  applyTurn,
  advisorReady,
  advisorReasons,
  advisorIntro,
  advisorGuidance,
  compareModelsIn,
  contextSummary,
  emptyCtx,
  pickQuestion,
  verdictFor,
  type AdvisorCtx,
  type AdvisorQuestion,
} from "@/lib/advisor";
import { AI_ASK_EVENT } from "@/components/ai-ask";

const SUGGESTIONS = [
  "Mujhe family ke liye car chahiye",
  "5 seater petrol under 10 lakh",
  "Meri income 1 lakh hai, family ke liye car chahiye",
  "10 lakh ke under kaunsi car lu?",
  "Petrol ya diesel?",
  "Creta aur Thar mein kya difference hai?",
  "Mujhe office ke liye daily 50 km chalani hai",
  "Mujhe highway ke liye car chahiye",
];

const PLACEHOLDER =
  "Example: Mujhe family ke liye 5 seater petrol car chahiye under ₹10 lakh...";

const HERO_HINTS = [
  "Mujhe family ke liye car chahiye",
  "5 seater petrol under 10 lakh",
  "10 lakh ke under kaunsi car lu?",
  "Creta aur Thar mein kya difference hai?",
];

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

  // "N lakh" counts as a budget UNLESS it is a personal-finance figure
// (income/EMI/down payment) — e.g. "Meri income 1 lakh hai" is not a car budget.
  const budgetAmount = (pat: RegExp) => {
    const m = s.match(pat);
    if (!m) return null;
    const prior = s.slice(Math.max(0, (m.index ?? 0) - 24), m.index ?? 0).trim();
    if (/income|salary|earn|kamaat|emi|installment|instalment|down ?payment|advance$/.test(prior)) return null;
    return m;
  };
  const crore = budgetAmount(/(?:under|below|less than|up to|max)?\s*₹?\s*(\d+(?:\.\d+)?)\s*(?:cr|crore)/);
  const lakh = budgetAmount(/(?:under|below|less than|up to|max)?\s*₹?\s*(\d+(?:\.\d+)?)\s*(?:lakh|lac)/);
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

  const seats = s.match(/(?:^|\D)(\d+)[\s-]*(?:seater|seat|sitting)(?:\D|$)/);
  if (seats) {
    const value = Number(seats[1]);
    if (Number.isInteger(value) && value > 0) out.seats = value;
  }

  return out;
}

function trimForSearch(x: string) {
  return x.trim().replace(/\s+/g, " ");
}

// Model names that exist in the live inventory as whole phrases in the query.
// Drives the hard model filter using the actual vehicle `model` field.
function knownModelIn(normQuery: string, vehicles: VehicleWithInfo[]): string {
  const seen = new Set<string>();
  for (const v of vehicles) {
    const m = (v.model ?? "").toLowerCase().replace(/\s+/g, " ").trim();
    if (m) seen.add(m);
  }
  return [...seen].sort((a, b) => b.length - a.length).find((m) => matchesPhrase(normQuery, m)) ?? "";
}

// Words that must never be treated as a model name even when the no-brand parser
// surfaces them first (personal/financial/advisory phrasing, e.g. "Meri income...").
const GENERIC_MODEL_WORDS = new Set([
  "meri", "mera", "mere", "main", "maine", "mujhe", "mai", "koi", "aap", "hum",
  "income", "salary", "earn", "emi", "installment", "instalment", "downpayment", "advance",
]);

// Model-only search: "Thar", "Creta", "2022 Thar diesel", "near Pilani Thar" all resolve to a
// hard model filter against the vehicle model field, without requiring the brand.
function resolveBrandModel(q: string, vehicles: VehicleWithInfo[]): { brand: string; model: string } {
  const parsed = parseBrandModel(q);
  const known = knownModelIn(normalizePhrase(q), vehicles);
  const generic = !parsed.brand && GENERIC_MODEL_WORDS.has(parsed.model.toLowerCase());
  return { brand: parsed.brand, model: known || (generic ? "" : parsed.model) };
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
  if (p.seats != null) parts.push(`${p.seats} Seater`);
  if (p.minYear) parts.push(`${p.minYear}+`);
  if (p.maxPrice != null) parts.push(`₹${lakhLabel(p.maxPrice)}L tak`);
  return parts.join(" • ");
}

export function AiAssistant({
  variant = "panel",
  placeholder = PLACEHOLDER,
  buttonLabel = "Recommendations Pao",
}: {
  variant?: "panel" | "hero";
  placeholder?: string;
  buttonLabel?: string;
}) {
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
  const [modelRequest, setModelRequest] = useState(false);
  const [relatedChoice, setRelatedChoice] = useState<"ask" | "yes" | "no">("ask");
  const [modelLabel, setModelLabel] = useState("");
  const [requirement, setRequirement] = useState("");
  const [recordId, setRecordId] = useState<string | null>(null);
  const [optInStatus, setOptInStatus] = useState<"ask" | "on" | "off">("ask");
  const [optInMsg, setOptInMsg] = useState("");

  // Advisor conversation state (current session only — never persisted).
  const ctxRef = useRef<AdvisorCtx>(emptyCtx());
  const questionRef = useRef<AdvisorQuestion | null>(null);
  const [question, setQuestion] = useState<AdvisorQuestion | null>(null);
  const [assistantLine, setAssistantLine] = useState("");
  const [advisorChips, setAdvisorChips] = useState<string[]>([]);
  const [advisorActive, setAdvisorActive] = useState(false);
  const [verdict, setVerdict] = useState("");

  function setQuestionUI(q: AdvisorQuestion | null) {
    questionRef.current = q;
    setQuestion(q);
  }

  const runRef = useRef(run);
  useEffect(() => {
    runRef.current = run;
  });

  useEffect(() => {
    const onAsk = (e: Event) => {
      const q = (e as CustomEvent<string>).detail;
      if (q && typeof q === "string") runRef.current(q);
    };
    window.addEventListener(AI_ASK_EVENT, onAsk);
    return () => window.removeEventListener(AI_ASK_EVENT, onAsk);
  }, []);

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
    setModelRequest(false);
    setRelatedChoice("ask");
    setModelLabel("");
    setRequirement("");
    setRecordId(null);
    setOptInStatus("ask");
    setOptInMsg("");
    const prevPending = questionRef.current?.field ?? null;
    setQuestionUI(null);
    setAssistantLine("");
    setAdvisorChips([]);
    setAdvisorActive(false);
    setVerdict("");

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

      // Conversational state update
      const ctxTurn = applyTurn(q, ctxRef.current, prevPending);
      ctxRef.current = ctxTurn.ctx;

      // 1. Model comparison check
      const compareNames =
        parsed.compare && parsed.compare.length >= 2
          ? parsed.compare
          : compareModelsIn(q, vehicles);

      if (compareNames && compareNames.length >= 2) {
        setAdvisorActive(true);
        setAdvisorChips(contextSummary(ctxRef.current));
        const found: { name: string; car: VehicleWithInfo }[] = [];
        for (const name of compareNames) {
          const car = vehicles.find(
            (v) =>
              `${v.brand} ${v.model} ${v.variant} ${v.model}`
                .toLowerCase()
                .includes(name.toLowerCase()) && name.length > 1,
          );
          if (car) found.push({ name, car });
        }
        setCompareName(compareNames.map((n) => n.trim()).join(" vs "));
        setResults(
          found.map(({ car }) => ({
            ...car,
            score: 0,
            reasons: [car.city ? `${car.city} mein listed` : "Location set nahi"],
          })),
        );
        const v = verdictFor(ctxRef.current, compareNames);
        setVerdict(
          v ||
            "Dono models ke trade-offs compare kiye gaye hain. Apni family size ya budget batao to personalized recommendation milega.",
        );
        setAssistantLine(advisorGuidance(q, ctxRef.current));
      } else {
        // 2. Specific-model request check
        const { brand, model } = resolveBrandModel(q, vehicles);
        const normModel = model ? model.toLowerCase() : "";
        const normBrand = brand ? brand.toLowerCase() : "";

        // Check whether a specific model was requested and whether any car of that model is in stock
        const hasModelCars = normModel
          ? vehicles.some(
              (v) =>
                v.model.toLowerCase().includes(normModel) &&
                (!normBrand || v.brand.toLowerCase() === normBrand),
            )
          : true;

        if (normModel && !hasModelCars) {
          // Zero inventory of the requested model — NEVER leak random cars!
          setMode("none");
          setModelRequest(true);
          setModelLabel(model);
          setRequirement(requirementSummary(parsed, brand, model));
          const id = await recordDemand({
            source: "ai_advisor",
            rawRequirement: q,
            brand,
            model,
            fuel: parsed.fuel ?? ctxRef.current.fuelPref ?? "",
            transmission: parsed.transmission ?? ctxRef.current.transPref ?? "",
            seatingCapacity: parsed.seats ?? ctxRef.current.seats,
            minYear: parsed.minYear,
            maxPrice: parsed.maxPrice ?? ctxRef.current.budget,
            minPrice: null,
            city: "",
            lat: null,
            lng: null,
            radiusKm: null,
            status: "unmet",
          });
          if (id) setRecordId(id);
          const scored = vehicles
            .map((v) => scoreVehicle(v, parsed))
            .sort((a, b) => b.score - a.score);
          setAlternatives(scored.slice(0, 6));
          setResults([]);
        } else if (advisorReady(ctxRef.current)) {
          // 3. Enough information is known! Search actual CarConnect live inventory
          setAdvisorActive(true);
          setAdvisorChips(contextSummary(ctxRef.current));
          setQuestionUI(null);

          const advParsed: Parsed = {
            maxPrice: ctxRef.current.budget,
            minYear: parsed.minYear,
            fuel: ctxRef.current.fuelPref || null,
            transmission: ctxRef.current.transPref || null,
            wantsNear: parsed.wantsNear,
            seats: ctxRef.current.seats,
            compare: null,
          };

          const advScored = vehicles
            .map((v) => scoreVehicle(v, advParsed))
            .sort((a, b) => b.score - a.score || (a.distance_km ?? 1e9) - (b.distance_km ?? 1e9));

          // Strict filters on stated hard constraints (budget, seating, fuel, transmission)
          const advPool = advScored.filter((v) => {
            if (ctxRef.current.budget != null && v.price > ctxRef.current.budget) return false;
            if (
              ctxRef.current.seats != null &&
              (v.seating_capacity == null || v.seating_capacity !== ctxRef.current.seats)
            )
              return false;
            if (
              ctxRef.current.fuelPref &&
              v.fuel.toLowerCase() !== ctxRef.current.fuelPref.toLowerCase()
            )
              return false;
            if (
              ctxRef.current.transPref &&
              v.transmission.toLowerCase() !== ctxRef.current.transPref.toLowerCase()
            )
              return false;
            return true;
          });

          if (advPool.length > 0) {
            setMode("match");
            setResults(
              advPool.slice(0, 8).map((v) => ({
                ...v,
                reasons: [...new Set([...v.reasons, ...advisorReasons(v, ctxRef.current)])],
              })),
            );
            setAssistantLine(advisorIntro(ctxRef.current));
          } else {
            // Exact requirement not available in stock
            setMode("none");
            setModelRequest(false);
            setRequirement(requirementSummary(advParsed, "", ""));
            const id = await recordDemand({
              source: "ai_advisor",
              rawRequirement: q,
              brand: "",
              model: "",
              fuel: ctxRef.current.fuelPref,
              transmission: ctxRef.current.transPref,
              seatingCapacity: ctxRef.current.seats,
              minYear: advParsed.minYear,
              maxPrice: ctxRef.current.budget,
              minPrice: null,
              city: "",
              lat: null,
              lng: null,
              radiusKm: null,
              status: "unmet",
            });
            if (id) setRecordId(id);
            setAlternatives(advScored.slice(0, 6));
            setResults([]);
          }
        } else {
          // 4. Conversational guidance step (e.g. "Mujhe family ke liye car chahiye", "Petrol ya diesel?", "Meri income 1 lakh hai")
          setAdvisorActive(true);
          setAdvisorChips(contextSummary(ctxRef.current));
          setResults([]);
          setMode("general");
          const guidance = advisorGuidance(q, ctxRef.current);
          setAssistantLine(guidance);
          const nextQ = pickQuestion(ctxRef.current);
          setQuestionUI(nextQ);
        }
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
    setOptInMsg("Matching stock milte hi aapko bata denge.");
    setOptInStatus("on");
  }

  function declineNotify() {
    setOptInStatus("off");
  }

  function showRelatedCars() {
    setRelatedChoice("yes");
  }

  function declineRelatedCars() {
    setRelatedChoice("no");
  }

  const hero = variant === "hero";

  return (
    <section
      id="ai-assistant"
      className={hero ? "scroll-mt-24" : "mx-auto max-w-4xl scroll-mt-24 px-4"}
    >
      <div
        className={
          hero
            ? "mx-auto max-w-3xl"
            : "overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-xl shadow-stone-900/5"
        }
      >
        {!hero && (
          <div className="border-b border-stone-100 bg-gradient-to-r from-red-50 to-stone-50 px-5 py-4 sm:px-7">
            <p className="text-xs font-bold uppercase tracking-wide text-brand">Conversational car discovery</p>
            <h2 className="mt-0.5 text-xl font-extrabold text-stone-900 sm:text-2xl">AI Car Advisor</h2>
            <p className="mt-1 text-sm text-stone-500">
              Budget, family size, usage aur preferences batao. AI live Car Connect inventory se suitable cars dhoondhta hai.
            </p>
          </div>
        )}

        <div className={hero ? "" : "p-5 sm:p-7"}>
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
              placeholder={placeholder}
              className={
                hero
                  ? "h-14 min-h-12 flex-1 rounded-xl border border-white/15 bg-white px-4 py-3 text-sm text-stone-900 shadow-lg shadow-stone-950/40 placeholder:text-stone-400 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
                  : "h-13 min-h-12 flex-1 rounded-lg border border-stone-300 bg-white px-4 py-3 text-sm text-stone-900 placeholder:text-stone-400 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
              }
              aria-label="Describe the car you need"
            />
            <Button
              type="submit"
              size="lg"
              loading={loading}
              className={hero ? "h-14 shrink-0 rounded-xl px-8" : "h-12 shrink-0"}
            >
              {buttonLabel}
            </Button>
          </form>

          <div
            className={
              hero
                ? "mt-3 flex flex-wrap items-center gap-2"
                : "no-scrollbar -mx-1 mt-4 flex gap-2 overflow-x-auto px-1 pb-1"
            }
          >
            {hero && (
              <span className="text-xs font-medium text-stone-300">Quick tries:</span>
            )}
            {(hero ? HERO_HINTS : SUGGESTIONS).map((s) => (
              <button
                key={s}
                onClick={() => run(s)}
                className={
                  hero
                    ? "shrink-0 rounded-full border border-white/20 bg-white/10 px-3.5 py-1.5 text-xs font-medium text-stone-200 backdrop-blur transition-colors hover:bg-white/20 hover:text-white"
                    : "shrink-0 rounded-full border border-stone-200 bg-white px-3.5 py-1.5 text-xs font-medium text-stone-700 transition-colors hover:border-brand hover:text-brand"
                }
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
            <div
              data-testid="ai-results"
              className={
                hero
                  ? "mt-5 rounded-2xl border border-stone-200 bg-white p-5 shadow-xl shadow-stone-900/10 sm:p-6"
                  : "mt-6"
              }
            >
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
                          : advisorActive
                            ? question
                              ? "Ek chhota sa sawaal, phir suggest karunga"
                              : "Aapki requirements ke hisaab se relevant options live inventory se"
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
                  <>
                    <CompareTable cars={results} />
                    {verdict && (
                      <div className="mt-4 rounded-xl border border-brand/15 bg-brand/5 px-4 py-3 text-sm text-stone-700">
                        <span className="font-semibold text-brand">Car Advisor: </span>
                        {verdict}
                      </div>
                    )}
                  </>
                )
              ) : mode === "none" ? (
                <div className="mt-4 rounded-xl border border-stone-200 bg-white p-5 shadow-sm sm:p-6">
                  {modelRequest ? (
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">❌</span>
                      <div>
                        <p className="text-base font-bold text-stone-900">Exact match nahi mila</p>
                        <p className="mt-1 text-sm text-stone-500">
                          {recordId
                            ? "Abhi aapki requirement ke hisaab se koi matching car stock mein nahi hai. Aapki requirement save kar li hai — jaise hi matching car stock mein aayegi, aapko bata denge."
                            : "Abhi aapki requirement ke hisaab se koi matching car stock mein nahi hai. Hum aisi car stock mein add karne ki koshish karenge."}
                        </p>
                      </div>
                    </div>
                  ) : (
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
                  )}
                  {requirement && (
                    <p className="mt-3 inline-block rounded-lg bg-stone-100 px-3 py-1.5 text-sm font-semibold text-stone-700">
                      {requirement}
                    </p>
                  )}
                  {recordId && (
                    <div className="mt-4 rounded-lg border border-stone-200 bg-stone-50 p-3.5">
                      {optInStatus === "ask" ? (
                        <>
                          <p className="text-sm font-semibold text-stone-800">
                            🔔 Stock mein matching car aane par aapko bata dein?
                          </p>
                          <div className="mt-2.5 flex flex-wrap items-center gap-2">
                            <Button size="sm" onClick={enableNotify}>Haan, batao</Button>
                            <Button variant="outline" size="sm" onClick={declineNotify}>Nahi, thanks</Button>
                          </div>
                        </>
                      ) : optInStatus === "on" ? (
                        <p className="text-sm font-medium text-emerald-700">Done 👍 {optInMsg}</p>
                      ) : (
                        <p className="text-sm font-medium text-stone-600">Requirement save kar li hai.</p>
                      )}
                    </div>
                  )}
                  {modelRequest && recordId && relatedChoice === "ask" && (
                    <div className="mt-3 rounded-lg border border-stone-200 bg-stone-50 p-3.5">
                      <p className="text-sm font-semibold text-stone-800">
                        Kya aap iske related cars bhi dekhna chahenge?
                      </p>
                      <div className="mt-2.5 flex flex-wrap items-center gap-2">
                        <Button size="sm" onClick={showRelatedCars}>Haan, related cars dikhao</Button>
                        <Button variant="outline" size="sm" onClick={declineRelatedCars}>Nahi, thanks</Button>
                      </div>
                    </div>
                  )}
                  {modelRequest && relatedChoice === "yes" ? (
                    <div className="mt-5 border-t border-stone-100 pt-4">
                      <p className="font-semibold text-stone-800">
                        Exact {modelLabel} available nahi hai, lekin ye related options hain.
                      </p>
                      <p className="mt-0.5 text-sm text-stone-500">
                        Budget, fuel aur use ke hisaab se matching aas-paas ke options.
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
                  ) : !modelRequest ? (
                    <>
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
                    </>
                  ) : null}
                </div>
              ) : (
                <>
                  {advisorActive && (
                    <>
                      {assistantLine && (
                        <p className="mt-4 w-fit max-w-full rounded-2xl rounded-ss-sm bg-stone-900 px-4 py-2.5 text-sm leading-relaxed text-white">
                          {assistantLine}
                        </p>
                      )}
                      {advisorChips.length > 0 && (
                        <div className="mt-2 flex items-center gap-1.5">
                          <span className="text-xs font-medium text-stone-400">Yaad rakha:</span>
                          <span className="flex flex-wrap gap-1.5">
                            {advisorChips.map((c) => (
                              <span
                                key={c}
                                className="rounded-full bg-stone-100 px-2.5 py-1 text-xs font-medium text-stone-600"
                              >
                                {c}
                              </span>
                            ))}
                          </span>
                        </div>
                      )}
                      {question ? (
                        <div className="mt-4 rounded-2xl border border-brand/20 bg-white p-4 shadow-sm">
                          <p className="text-sm font-semibold text-stone-800">{question.text}</p>
                          <div className="mt-3 flex flex-wrap gap-2">
                            {question.replies.map((r) => (
                              <button
                                key={r}
                                onClick={() => run(r)}
                                className="rounded-full border border-brand/30 bg-brand/5 px-3.5 py-1.5 text-sm font-medium text-brand transition-colors hover:bg-brand hover:text-white"
                              >
                                {r}
                              </button>
                            ))}
                          </div>
                        </div>
                      ) : null}
                    </>
                  )}
                  {mode === "close" && (
                    <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800">
                      Exact match nahi mila, lekin ye close options available hain.
                    </p>
                  )}
                  {results.length === 0 && !question ? (
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
                  ) : results.length > 0 ? (
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
                  ) : null}
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