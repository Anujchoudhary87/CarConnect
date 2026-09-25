import type { VehicleWithInfo } from "@/lib/types";
import { matchesPhrase, normalizePhrase } from "@/lib/demand";
import { formatPriceShort } from "@/lib/format";

// Shared, client-safe helper for the unified "AI Car Advisor" flow.
// This module provides conversational context, intent detection, proactive guidance,
// single follow-up questions, personalized comparison, and live inventory scoring.

export interface AdvisorCtx {
  income: number | null;        // monthly income (₹)
  emi: number | null;           // monthly EMI target (₹)
  budget: number | null;        // total budget (₹)
  down: number | null;          // down payment (₹)
  family: boolean;
  seats: number | null;         // positive whole number (e.g. 5, 7, 13, 15)
  running: number | null;       // monthly running (km)
  dailyKm: number | null;       // daily running (km)
  usage: "city" | "highway" | "mixed" | "";
  fuelPref: string;
  transPref: string;
  brandPref: string;
  modelPref: string;
  offroad: boolean;
  newUsed: "new" | "used" | "";
  asked: string[];
}

export function emptyCtx(): AdvisorCtx {
  return {
    income: null,
    emi: null,
    budget: null,
    down: null,
    family: false,
    seats: null,
    running: null,
    dailyKm: null,
    usage: "",
    fuelPref: "",
    transPref: "",
    brandPref: "",
    modelPref: "",
    offroad: false,
    newUsed: "",
    asked: [],
  };
}

export type AdvisorField =
  | "emi"
  | "budget"
  | "seats"
  | "use"
  | "fuel"
  | "transmission"
  | "running";

export interface AdvisorQuestion {
  field: AdvisorField;
  text: string;
  replies: string[];
}

// Finance helpers — clearly labelled estimates, never invented dealer rates.
const DEFAULT_RATE_PCT = 10.5;
export const EMI_YEARS = 5;

export function emiEstimate(
  price: number,
  down: number | null,
  ratePct: number | null,
  years = EMI_YEARS,
): number {
  const principal = Math.max(1, price - (down ?? 0));
  const r = (ratePct ?? DEFAULT_RATE_PCT) / 100 / 12;
  const n = Math.max(1, Math.round(years * 12));
  if (r === 0) return principal / n;
  const f = Math.pow(1 + r, n);
  return (principal * r * f) / (f - 1);
}

function amountToRupees(n: number, unit: string): number {
  const u = unit.toLowerCase();
  if (u.startsWith("cr")) return Math.round(n * 1e7);
  if (u.startsWith("lakh") || u.startsWith("lac") || u === "l" || u === "lakhs") return Math.round(n * 1e5);
  if (u === "k") return Math.round(n * 1e3);
  return Math.round(n);
}

interface AmountToken {
  value: number; // ₹
  raw: string;
}

function findAmounts(s: string): AmountToken[] {
  const re = /(?:₹)?\s*(\d+(?:\.\d+)?)\s*(lakh|lac|lakhs|l|cr|crore|k)?\b/g;
  const out: AmountToken[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(s))) {
    const n = parseFloat(m[1]);
    if (!Number.isFinite(n)) continue;
    out.push({ value: amountToRupees(n, m[2] ?? ""), raw: m[0] });
  }
  return out;
}

// "Meri income 1 lakh", "I earn 1 lakh/month", "salary 80k"
function incomeOf(s: string): number | null {
  const m = s.match(
    /(?:income|salary|kamaata|kamaate|kmaata|earn|earning|kama[t]?)[^\d₹]*(?:₹)?\s*(\d+(?:\.\d+)?)\s*(lakh|lac|lakhs|l|cr|crore|k)?/i,
  );
  if (!m) return null;
  const v = amountToRupees(parseFloat(m[1]), m[2] ?? "");
  if (v <= 0 || v > 10e7) return null;
  return v;
}

// "20k emi", "emi 20 thousand", "monthly ki installment 15k"
function emiOf(s: string): number | null {
  const m = s.match(/(?:emi|installment|instalment|monthly)[^\d₹]*(?:₹)?\s*(\d+(?:\.\d+)?)\s*(lakh|lac|lakhs|l|cr|crore|k)?/i);
  if (!m) return null;
  const v = amountToRupees(parseFloat(m[1]), m[2] ?? "");
  if (v <= 0 || v > 1e7) return null;
  return v;
}

// "8 lakh budget", "budget 8 lakh", "under 8 lakh", "8 lakh tak", "max 10 lakh", "10 lakh ke under"
function budgetOf(s: string): number | null {
  const byWord = s.match(
    /(?:under|below|less ?than|up to|max|tak|ke under|budget)[^\d₹]*(?:₹)?\s*(\d+(?:\.\d+)?)\s*(lakh|lac|lakhs|l|cr|crore|k)?/i,
  );
  if (byWord) {
    const v = amountToRupees(parseFloat(byWord[1]), byWord[2] ?? "");
    if (v > 0 && v <= 1e9) return v;
  }
  const afterBudget = s.match(/budget\s+(?:hai\s+)?(?:₹)?\s*(\d+(?:\.\d+)?)\s*(lakh|lac|lakhs|l|cr|crore|k)?/i);
  if (afterBudget) {
    const v = amountToRupees(parseFloat(afterBudget[1]), afterBudget[2] ?? "");
    if (v > 0 && v <= 1e9) return v;
  }
  return null;
}

function downOf(s: string): number | null {
  const m = s.match(/(?:down ?payment|downpayment|down|advance)[^\d₹]*(?:₹)?\s*(\d+(?:\.\d+)?)\s*(lakh|lac|lakhs|l|cr|crore|k)?/i);
  if (!m) return null;
  const v = amountToRupees(parseFloat(m[1]), m[2] ?? "");
  return v > 0 && v <= 1e9 ? v : null;
}

export type TurnResult = { ctx: AdvisorCtx; answeredField: AdvisorField | null };

// Merge one user turn into the conversation context.
// Never forgets previously extracted attributes.
export function applyTurn(q: string, prev: AdvisorCtx, pending: AdvisorField | null): TurnResult {
  const s = normalizePhrase(q);
  const next: AdvisorCtx = { ...prev, asked: [...prev.asked] };
  let answeredField: AdvisorField | null = null;
  const amounts = findAmounts(s);
  const bareAmount = amounts.length === 1 && s.replace(/[^a-z0-9₹\s.]/gi, "").trim().split(/\s+/).length <= 2;

  const income = incomeOf(s);
  if (income != null) {
    next.income = income;
    answeredField = "emi";
  }

  const emi = emiOf(s);
  if (emi != null) {
    next.emi = emi;
    answeredField = "emi";
  }

  const budget = budgetOf(s);
  if (budget != null) {
    next.budget = budget;
    answeredField = answeredField ?? "budget";
  }

  const down = downOf(s);
  if (down != null) next.down = down;

  if (/family|parivaar|parivar|ghar ke|bache|kids/.test(s)) {
    next.family = true;
    if (answeredField == null) answeredField = "use";
  }

  // Seating capacity: Any positive integer (5, 7, 8, 13, 15, etc.)
  const seatMatch = s.match(/\b(\d+)\s*(?:seater|seat|sitting)\b/);
  const seatWordMatch = s.match(/\b(five|seven|eight|thirteen|fifteen)[\s-]*(?:seater|seat|sitting)\b/);
  const wordSeats: Record<string, number> = { five: 5, seven: 7, eight: 8, thirteen: 13, fifteen: 15 };
  const seats = seatMatch ? Number(seatMatch[1]) : seatWordMatch ? wordSeats[seatWordMatch[1]] : null;
  if (seats != null && Number.isInteger(seats) && seats > 0) {
    next.seats = seats;
    if (answeredField == null) answeredField = "seats";
  }

  // Daily running or monthly running
  const dailyMatch = s.match(/(?:daily|roz|har roz|every day)\s*(\d+)\s*(?:km|kilo)/i);
  if (dailyMatch) {
    const km = parseInt(dailyMatch[1], 10);
    if (Number.isFinite(km) && km > 0) {
      next.dailyKm = km;
      next.running = km * 30;
      if (answeredField == null) answeredField = "running";
    }
  }

  const monthlyMatch = s.match(/(?:monthly|mahina|mahine mein)\s*(\d+)\s*(?:km|kilo)/i);
  if (monthlyMatch) {
    const km = parseInt(monthlyMatch[1], 10);
    if (Number.isFinite(km) && km > 0) {
      next.running = km;
      if (answeredField == null) answeredField = "running";
    }
  }

  // Usage: city, highway, mixed
  if (/mostly city|daily office|office ke|city traffic|city use|city drive/.test(s)) {
    next.usage = "city";
    if (answeredField == null) answeredField = "use";
  } else if (/mostly highway|highway drive|long drive|tour|trips/.test(s)) {
    next.usage = "highway";
    if (answeredField == null) answeredField = "use";
  } else if (/dono|city aur highway|mixed|both/.test(s)) {
    next.usage = "mixed";
    if (answeredField == null) answeredField = "use";
  }

  if (/off[- ]?road|adventure|mountain|jungle|rough road/.test(s)) next.offroad = true;
  if (/new car|nayi car|brand new/.test(s)) next.newUsed = "new";
  else if (/used car|second ?hand|purani/.test(s)) next.newUsed = "used";

  // Fuel preference
  if (/cng/.test(s)) {
    next.fuelPref = "CNG";
    if (answeredField == null) answeredField = "fuel";
  } else if (/electric|\bev\b/.test(s)) {
    next.fuelPref = "Electric";
    if (answeredField == null) answeredField = "fuel";
  } else if (/hybrid/.test(s)) {
    next.fuelPref = "Hybrid";
    if (answeredField == null) answeredField = "fuel";
  } else if (/petrol/.test(s) && !/diesel/.test(s)) {
    next.fuelPref = "Petrol";
    if (answeredField == null) answeredField = "fuel";
  } else if (/diesel/.test(s) && !/petrol/.test(s)) {
    next.fuelPref = "Diesel";
    if (answeredField == null) answeredField = "fuel";
  }

  // Transmission preference
  if (/automatic|auto\b|amt|cvt|dct/.test(s)) {
    next.transPref = "Automatic";
    if (answeredField == null) answeredField = "transmission";
  } else if (/manual/.test(s)) {
    next.transPref = "Manual";
    if (answeredField == null) answeredField = "transmission";
  }

  // Direct quick-reply resolution if pending question was set
  if (pending && answeredField == null) {
    if (pending === "use" && /city|highway|dono|office|family/.test(s)) {
      answeredField = "use";
    } else if (pending === "fuel" && /petrol|diesel|cng|electric/.test(s)) {
      answeredField = "fuel";
    } else if (pending === "transmission" && /automatic|manual|koi bhi/.test(s)) {
      answeredField = "transmission";
    } else if (bareAmount && amounts.length === 1) {
      const v = amounts[0].value;
      if (v > 0) {
        if (pending === "emi") next.emi = v;
        else if (pending === "budget") next.budget = v;
        else if (pending === "seats") next.seats = v;
        answeredField = pending;
      }
    }
  }

  if (answeredField && !next.asked.includes(answeredField)) {
    next.asked.push(answeredField);
  }

  return { ctx: next, answeredField };
}

// Ready to recommend actual CarConnect inventory once sufficient budget/scope is known
export function advisorReady(ctx: AdvisorCtx): boolean {
  const money = ctx.budget != null || (ctx.income != null && ctx.emi != null);
  const scope =
    ctx.seats != null ||
    ctx.fuelPref !== "" ||
    ctx.transPref !== "" ||
    ctx.usage !== "" ||
    ctx.running != null ||
    ctx.family;
  return Boolean(money && scope);
}

// Pick the single most useful missing question. Never asks for already-provided information!
export function pickQuestion(ctx: AdvisorCtx): AdvisorQuestion {
  const asked = new Set(ctx.asked);

  // 1. If user wants family car, ask seating capacity if not known
  if (ctx.family && ctx.seats == null && !asked.has("seats")) {
    return {
      field: "seats",
      text: "Kitni seating capacity chahiye — 5 seater, 7 seater ya 13 seater?",
      replies: ["5 seater", "7 seater", "13 seater"],
    };
  }

  // 2. If usage is unknown, ask about city vs highway
  if (!ctx.usage && ctx.dailyKm == null && ctx.running == null && !asked.has("use")) {
    return {
      field: "use",
      text: "Aapka use mostly city traffic mein rahega ya highway driving zyada hoti hai?",
      replies: ["Mostly City", "Mostly Highway", "Dono (City + Highway)"],
    };
  }

  // 3. If budget/income is totally unknown, ask budget
  if (ctx.budget == null && ctx.income == null && ctx.emi == null && !asked.has("budget")) {
    return {
      field: "budget",
      text: "Approx budget kitna socha hai? (total on-road price)",
      replies: ["₹5-7 Lakh", "₹8-10 Lakh", "₹10-15 Lakh", "₹15 Lakh+"],
    };
  }

  // 4. If income is known but EMI/budget is not, ask EMI
  if (ctx.income != null && ctx.budget == null && ctx.emi == null && !asked.has("emi")) {
    return {
      field: "emi",
      text: "Monthly income ke hisaab se approx monthly EMI kitni comfortable rahegi?",
      replies: ["₹10,000", "₹15,000", "₹20,000", "₹30,000"],
    };
  }

  // 5. If seats unknown
  if (ctx.seats == null && !asked.has("seats")) {
    return {
      field: "seats",
      text: "Kitne seater car dekh rahe hain — 5 seater ya 7 seater?",
      replies: ["5 seater", "7 seater", "13 seater"],
    };
  }

  // 6. If fuel unknown
  if (ctx.fuelPref === "" && !asked.has("fuel")) {
    return {
      field: "fuel",
      text: "Petrol, Diesel, CNG ya Electric mein se koi preference hai?",
      replies: ["Petrol", "Diesel", "CNG", "Electric"],
    };
  }

  // 7. If transmission unknown
  if (ctx.transPref === "" && !asked.has("transmission")) {
    return {
      field: "transmission",
      text: "Transmission mein Automatic pasand karenge ya Manual?",
      replies: ["Automatic", "Manual", "Koi bhi chalega"],
    };
  }

  return {
    field: "budget",
    text: "Kuch aur preference batayein — koi specific brand ya features jo aap chahte hain?",
    replies: ["Under ₹10 Lakh", "Automatic gearbox", "High safety rating"],
  };
}

// Proactive, contextual guidance without absolute claims
export function advisorGuidance(q: string, ctx: AdvisorCtx): string {
  const s = normalizePhrase(q);

  if (/family|parivaar|parivar/.test(s) && ctx.budget == null && ctx.seats == null) {
    return "Family use ke liye Petrol, Diesel, CNG aur EV sab options hain. Agar daily city running zyada hai to CNG/Petrol practical ho sakta hai, aur highway running zyada ho to Diesel bhi consider kar sakte ho.";
  }

  if (/daily \d+|roz \d+|office ke liye/i.test(s) || (ctx.dailyKm != null && ctx.dailyKm >= 40)) {
    const km = ctx.dailyKm ?? 50;
    const monthly = km * 30;
    return `Daily ${km} km chalane par monthly running lagbhag ${monthly.toLocaleString("en-IN")} km aayegi. Is high running par CNG ya Diesel kaafi fuel expenses bachata hai, aur traffic mein Automatic transmission kaafi aaramdayak rehta hai.`;
  }

  if (/petrol ya diesel|diesel ya petrol/i.test(s)) {
    return "Petrol vs Diesel ka decision monthly running par depend karta hai. Agar mahine mein 1,000–1,200 km se kam chalate hain to Petrol car ka initial price aur service cost kam rehta hai. Agar 1,500+ km running ya lambi highway driving hai, to Diesel ka mileage aur punch faydemand hota hai.";
  }

  if (/income|salary|kama/i.test(s) && ctx.income != null) {
    const k = Math.round(ctx.income / 1000);
    return `₹${k}k monthly income ke sath financial safety rule ke mutabiq ₹15,000–₹20,000 tak ki monthly EMI comfortable rehti hai, jisse ₹8–12 lakh tak ki reliable car smoothly plan ho sakti hai.`;
  }

  if (/under 10 lakh|10 lakh ke under|kaunsi car lu|konsi car/i.test(s)) {
    return "₹10 lakh budget used car market mein kaafi solid budget hai. Isme premium hatchbacks (Baleno, i20), reliable compact SUVs (Venue, Brezza, Creta), aur spacious family MPVs (Ertiga) mil sakti hain.";
  }

  if (/highway/i.test(s) && !/city/i.test(s)) {
    return "Highway driving ke liye high-speed stability, safety ratings, comfortable suspension aur overtaking power zaroori features hote hain. Mid-size SUVs aur solid sedans isme kaafi behtar perform karti hain.";
  }

  if (/city/i.test(s) && !/highway/i.test(s)) {
    return "City use ke liye compact dimensions, light steering aur Automatic transmission traffic mein driving ko effortless bana dete hain.";
  }

  return "Aapki requirement samajh kar Car Connect live inventory se best matching options shortlist karunga.";
}

export function advisorIntent(s: string): boolean {
  const norm = normalizePhrase(s);
  return (
    /mere liye|apne liye|mujhe|meri|mera\b|maine|family|parivaar|parivar|ghar ke liye|kids|bache|income|salary|earn|kama|emi\b|installment|instalment|down ?payment|advance|leni chahiye|laina chahiye|lena chahiye|lena hai|leni hai|kaun si|kaunsi|konsi|kya (?:car|laina|lena|recommend)|recommend|advice|suggest|best car|best {0,1}rahegi|petrol ya diesel|diesel ya petrol|difference|compare|comparison|kya difference|office ke liye|daily \d+|roz \d+|highway ke liye|city use|highway use|under \d+ lakh|budget/i.test(
      norm,
    ) ||
    /^(5|7|8|13|15)\s*seater/i.test(norm) ||
    /\b(creta|thar|swift|ertiga|scorpio|seltos|venue|baleno|i20|nexon|brezza)\b.*\b(creta|thar|swift|ertiga|scorpio|seltos|venue|baleno|i20|nexon|brezza)\b/i.test(
      norm,
    )
  );
}

// Two distinct models named in the same query
export function compareModelsIn(q: string, vehicles: VehicleWithInfo[]): string[] | null {
  const norm = normalizePhrase(q);
  const seen = new Set<string>();

  // Check known popular models directly
  const common = ["creta", "thar", "scorpio", "swift", "baleno", "ertiga", "seltos", "venue", "i20", "nexon", "brezza", "city"];
  for (const m of common) {
    if (matchesPhrase(norm, m)) seen.add(m);
  }

  for (const v of vehicles) {
    const m = (v.model ?? "").toLowerCase().replace(/\s+/g, " ").trim();
    if (m && matchesPhrase(norm, m)) seen.add(m);
  }

  const names = [...seen].sort((a, b) => b.length - a.length);
  if (names.length < 2) return null;
  if (!/(compare|comparison|difference|better|kya behtar|mein se|ya |aur .*mein|dono|sahi rahega)/.test(norm)) return null;
  return names.slice(0, 2);
}

// General, factual model characteristics used ONLY to explain "why" a car may fit
const KNOWN_CHAR: Record<string, { tag: string; family: boolean; city: boolean; offroad: boolean }> = {
  thar: { tag: "Off-road / adventure SUV — rugged 4x4", family: false, city: false, offroad: true },
  creta: { tag: "Compact SUV — practical 5-seater family choice", family: true, city: true, offroad: false },
  ertiga: { tag: "Spacious MPV — practical 7-seater family car", family: true, city: true, offroad: false },
  scorpio: { tag: "Rugged SUV — durable body-on-frame", family: true, city: false, offroad: true },
  swift: { tag: "Hatchback — agile & city-friendly", family: true, city: true, offroad: false },
  baleno: { tag: "Premium hatchback — spacious city car", family: true, city: true, offroad: false },
  venue: { tag: "Compact SUV — modern features & city comfort", family: true, city: true, offroad: false },
  i20: { tag: "Premium hatchback — refined & feature-rich", family: true, city: true, offroad: false },
  seltos: { tag: "Feature-packed compact SUV", family: true, city: true, offroad: false },
  brezza: { tag: "Reliable compact SUV with good safety", family: true, city: true, offroad: false },
  nexon: { tag: "High safety rating SUV", family: true, city: true, offroad: false },
  city: { tag: "Comfortable sedan — smooth highway & city ride", family: true, city: true, offroad: false },
  innova: { tag: "Spacious & ultra-reliable 7/8 seater", family: true, city: false, offroad: false },
  fortuner: { tag: "Full-size SUV — commanding presence & 4x4", family: true, city: false, offroad: true },
};

export function knownChar(model: string) {
  const m = (model || "").toLowerCase().replace(/[^a-z]/g, "").split(/\s+/)[0];
  return KNOWN_CHAR[m] ?? null;
}

// Factual explainability: "Why this car?" using ONLY actual vehicle data
export function advisorReasons(v: VehicleWithInfo, ctx: AdvisorCtx): string[] {
  const reasons: string[] = [];
  const c = knownChar(v.model);

  if (ctx.budget != null && v.price <= ctx.budget) {
    reasons.push(`Aapke budget (${formatPriceShort(ctx.budget)}) ke andar fit hai (${formatPriceShort(v.price)})`);
  }

  if (ctx.seats != null && v.seating_capacity != null && v.seating_capacity === ctx.seats) {
    reasons.push(`Exact ${v.seating_capacity}-seater seating capacity (stated requirement)`);
  } else if (ctx.family && v.seating_capacity && v.seating_capacity >= 5) {
    reasons.push(`${v.seating_capacity}-seater configuration family use ke liye comfortable`);
  }

  if (ctx.fuelPref && v.fuel.toLowerCase() === ctx.fuelPref.toLowerCase()) {
    reasons.push(`${v.fuel} engine aapki pasand ke mutabiq`);
  }

  if (ctx.transPref && v.transmission.toLowerCase() === ctx.transPref.toLowerCase()) {
    reasons.push(`${v.transmission} transmission for driving ease`);
  }

  if (ctx.usage === "city" && (c?.city || v.fuel === "CNG" || v.fuel === "Petrol")) {
    reasons.push("City driving ke liye economical aur easy to maneuver");
  } else if (ctx.usage === "highway" && (v.fuel === "Diesel" || v.year >= 2021)) {
    reasons.push("Highway driving ke liye stability aur mileage punch");
  }

  if (v.km < 40000) {
    reasons.push(`Low running: sirf ${v.km.toLocaleString("en-IN")} km chali hai`);
  }

  if (v.dealer?.verified) {
    reasons.push("Verified local dealer listing");
  }

  if (ctx.emi != null) {
    const down = v.down_payment ?? ctx.down;
    const est = Math.round(emiEstimate(v.price, down, v.finance_interest_rate));
    if (est <= ctx.emi) {
      reasons.push(`Approx EMI ₹${est.toLocaleString("en-IN")}/mo — aapke ₹${ctx.emi.toLocaleString("en-IN")} target ke andar`);
    }
  }

  return reasons;
}

// Personalized comparison verdict based strictly on user context
export function verdictFor(ctx: AdvisorCtx, models: string[]): string {
  if (models.length < 2) return "";
  const [m1, m2] = models;
  const c1 = knownChar(m1);
  const c2 = knownChar(m2);

  // Example: Creta vs Thar
  if ((m1.includes("creta") && m2.includes("thar")) || (m1.includes("thar") && m2.includes("creta"))) {
    if (ctx.family || ctx.usage === "city" || (ctx.seats != null && ctx.seats >= 5)) {
      return "Aapki family aur daily use priorities ke hisaab se Hyundai Creta zyada practical choice hai — isme monocoque comfort, bada boot space aur smooth city suspension milta hai. Mahindra Thar unke liye best hai jo rugged 4x4 capability aur rough-terrain adventures prioritize karte hain.";
    }
    if (ctx.offroad || ctx.usage === "highway") {
      return "Agar aap off-roading, tough terrains aur solid road presence chahte hain to Mahindra Thar unmatched hai. Agar comfortable daily driving aur practical boot space chahiye to Creta better balance provide karti hai.";
    }
    return "Creta daily comfort aur family practicality ke liye strong hai, jabki Thar commanding road presence aur 4x4 capability ke liye bani hai. Dono cars ke live stock options neeche dekhein.";
  }

  const hasContext = ctx.family || ctx.seats != null || ctx.emi != null || ctx.budget != null || ctx.offroad;
  if (!hasContext) {
    return `${m1.toUpperCase()} (${c1?.tag ?? "option"}) aur ${m2.toUpperCase()} (${c2?.tag ?? "option"}) dono apne segment mein strong options hain. Apni family size, budget ya usage batao to personalized recommendation bata paunga.`;
  }

  return `Aapki batayi requirements ke hisaab se ${m1} (${c1?.tag ?? "choice"}) aur ${m2} (${c2?.tag ?? "choice"}) dono ke trade-offs compare kiye gaye hain. Real inventory specs upar table mein hain.`;
}

// Context badges for currently remembered preferences
export function contextSummary(ctx: AdvisorCtx): string[] {
  const parts: string[] = [];
  if (ctx.budget != null) parts.push(`Budget ₹${Math.round(ctx.budget / 100000)}L`);
  if (ctx.income != null) parts.push(`Income ₹${Math.round(ctx.income / 1000)}k/mo`);
  if (ctx.emi != null) parts.push(`EMI ~₹${Math.round(ctx.emi / 1000)}k`);
  if (ctx.seats != null) parts.push(`${ctx.seats}-seater`);
  if (ctx.family) parts.push("Family use");
  if (ctx.fuelPref) parts.push(ctx.fuelPref);
  if (ctx.transPref) parts.push(ctx.transPref);
  if (ctx.usage === "city") parts.push("City use");
  else if (ctx.usage === "highway") parts.push("Highway use");
  else if (ctx.usage === "mixed") parts.push("City + Highway");
  if (ctx.dailyKm != null) parts.push(`Daily ${ctx.dailyKm}km`);
  if (ctx.offroad) parts.push("Off-road");
  return parts;
}

// Friendly acknowledgement when recommendations are ready
export function advisorIntro(ctx: AdvisorCtx): string {
  const bits: string[] = [];
  if (ctx.budget != null) bits.push(`aapka budget ₹${Math.round(ctx.budget / 100000)} lakh`);
  if (ctx.seats != null) bits.push(`${ctx.seats}-seater`);
  if (ctx.fuelPref) bits.push(`${ctx.fuelPref} fuel`);
  if (ctx.transPref) bits.push(ctx.transPref.toLowerCase());
  if (ctx.family) bits.push("family use");

  const intro = bits.length ? `Samajh gaya — ${bits.join(", ")}. ` : "Samajh gaya. ";
  return `${intro}Car Connect live dealer inventory se ye verified options aapki situation ke hisaab se best match karte hain:`;
}