"use client";

import Link from "next/link";
import { useMemo } from "react";
import type { VehicleWithInfo } from "@/lib/types";
import { computeEmi, EMI_DEFAULT_RATE, EMI_DEFAULT_YEARS, financeAmount, formatEmi } from "@/lib/emi";
import { formatPriceShort } from "@/lib/format";

/**
 * Guided path that turns the advisor's shortlist into an actual purchase:
 * Requirement → Top 3 cars → Compare → EMI → Dealer contact → Test drive → Buy.
 *
 * It only ever links to the existing systems (car page contact/test-drive,
 * EMI calculator, marketplace) — no duplicate enquiry, EMI or booking flow.
 */

const STEPS = [
  { key: "requirement", label: "Requirement", hint: "Budget, family, usage" },
  { key: "shortlist", label: "Top 3 Cars", hint: "Live stock se" },
  { key: "compare", label: "Compare", hint: "Specs side-by-side" },
  { key: "emi", label: "EMI", hint: "Monthly instalment" },
  { key: "contact", label: "Dealer Contact", hint: "Call / WhatsApp / enquiry" },
  { key: "testdrive", label: "Test Drive", hint: "Slot book karein" },
  { key: "buy", label: "Buy", hint: "Deal confirm karein" },
] as const;

export type JourneyStage =
  | "start"
  | "requirement"
  | "shortlist"
  | "compare"
  | "emi"
  | "contact"
  | "testdrive"
  | "buy";

const STAGE_INDEX: Record<JourneyStage, number> = {
  start: -1,
  requirement: 0,
  shortlist: 1,
  compare: 2,
  emi: 3,
  contact: 4,
  testdrive: 5,
  buy: 6,
};

/** Ordered stages — the advisor derives one automatically, the customer can walk forward. */
export const JOURNEY_STAGE_ORDER: JourneyStage[] = [
  "start",
  "requirement",
  "shortlist",
  "compare",
  "emi",
  "contact",
  "testdrive",
  "buy",
];

export function journeyStageAt(index: number): JourneyStage {
  return JOURNEY_STAGE_ORDER[Math.min(Math.max(index, 0), JOURNEY_STAGE_ORDER.length - 1)];
}

const STAGE_LABELS: Record<JourneyStage, string> = {
  start: STEPS[0].label,
  requirement: STEPS[0].label,
  shortlist: STEPS[1].label,
  compare: STEPS[2].label,
  emi: STEPS[3].label,
  contact: STEPS[4].label,
  testdrive: STEPS[5].label,
  buy: STEPS[6].label,
};

export function journeyStageLabel(stage: JourneyStage): string {
  return STAGE_LABELS[stage];
}

function CarJourneyCard({ car, rank }: { car: VehicleWithInfo; rank: number }) {
  const principal = financeAmount(Number(car.price), car.down_payment);
  const rate =
    car.finance_interest_rate != null && Number.isFinite(Number(car.finance_interest_rate))
      ? Number(car.finance_interest_rate)
      : EMI_DEFAULT_RATE;
  const emi = computeEmi(principal, rate, EMI_DEFAULT_YEARS);

  return (
    <li className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-stone-900 text-xs font-bold text-white">
          {rank}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-bold text-stone-900">
            {car.brand} {car.model}
          </p>
          <p className="text-xs text-stone-500">
            {car.year} • {car.fuel} • {car.transmission} • {formatPriceShort(car.price)}
            {car.city ? ` • ${car.city}` : ""}
          </p>
          <p className="mt-1.5 text-sm">
            {emi ? (
              <>
                <span className="font-extrabold text-emerald-700">{formatEmi(emi.monthly)}/month</span>{" "}
                <span className="text-xs text-stone-400">
                  ({EMI_DEFAULT_YEARS} yr @ {rate}%)
                </span>
              </>
            ) : (
              <span className="text-xs text-stone-400">EMI estimate unavailable</span>
            )}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link
              href={`/cars/${car.id}`}
              className="rounded-lg bg-stone-900 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-stone-700"
            >
              View car & contact dealer
            </Link>
            <Link
              href={`/emi-calculator?amount=${car.price}${car.down_payment != null ? `&down=${car.down_payment}` : ""}`}
              className="rounded-lg border border-stone-200 px-3 py-1.5 text-xs font-semibold text-stone-700 transition-colors hover:border-brand hover:text-brand"
            >
              Full EMI breakdown
            </Link>
          </div>
        </div>
      </div>
    </li>
  );
}

export function BuyingJourney({
  stage,
  cars,
  requirement,
  onAsk,
}: {
  stage: JourneyStage;
  cars: VehicleWithInfo[];
  requirement?: string;
  onAsk?: (q: string) => void;
}) {
  const current = STAGE_INDEX[stage];
  // De-duplicate near-identical listings so the "top 3" stays meaningful.
  const shortlist = useMemo(() => {
    const seen = new Set<string>();
    const out: VehicleWithInfo[] = [];
    for (const car of cars) {
      // Normalised so listing duplicates ("Venue" vs "Venue ") collapse into one.
      const key = [
        String(car.brand).trim().toLowerCase(),
        String(car.model).trim().toLowerCase(),
        String(car.year),
        Number(car.price),
      ].join("|");
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(car);
      if (out.length === 3) break;
    }
    return out;
  }, [cars]);
  const top = shortlist[0] ?? null;
  const canCompare = shortlist.length >= 2;

  return (
    <div className="rounded-2xl border border-stone-200 bg-gradient-to-b from-stone-50 to-white p-4 sm:p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-sm font-extrabold text-stone-900">Aapki Car Buying Journey</h3>
        <p className="text-xs text-stone-500">
          {stage === "start"
            ? "Requirement se lekar test drive tak — ek hi flow."
            : `Step ${Math.min(current + 1, STEPS.length)} of ${STEPS.length}`}
        </p>
      </div>

      {requirement && (
        <p className="mt-2 inline-flex rounded-full bg-white px-3 py-1 text-xs font-semibold text-stone-700 ring-1 ring-stone-200">
          {requirement}
        </p>
      )}

      {/* Stepper */}
      <ol className="no-scrollbar mt-4 flex gap-2 overflow-x-auto pb-1">
        {STEPS.map((s, i) => {
          const done = i < current;
          const active = i === current;
          return (
            <li
              key={s.key}
              className={`flex shrink-0 items-center gap-2 rounded-xl border px-3 py-2 ${
                active
                  ? "border-brand bg-brand text-white"
                  : done
                    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                    : "border-stone-200 bg-white text-stone-400"
              }`}
            >
              <span
                className={`flex size-5 items-center justify-center rounded-full text-[11px] font-bold ${
                  active ? "bg-white text-brand" : done ? "bg-emerald-500 text-white" : "bg-stone-100 text-stone-500"
                }`}
              >
                {done ? "✓" : i + 1}
              </span>
              <span className="leading-tight">
                <span className="block text-xs font-bold">{s.label}</span>
                <span className={`block text-[10px] ${active ? "text-white/80" : "opacity-70"}`}>
                  {s.hint}
                </span>
              </span>
            </li>
          );
        })}
      </ol>

      {/* Contextual next step */}
      <div className="mt-4 rounded-xl bg-white p-4 ring-1 ring-stone-200">
        {stage === "start" && (
          <>
            <p className="text-sm font-bold text-stone-900">Step 1 — Requirement batao</p>
            <p className="mt-1 text-xs text-stone-500">
              Budget, family size, fuel aur daily usage. Uske baad AI live dealer stock se sirf matching
              cars dikhayega.
            </p>
          </>
        )}

        {stage === "requirement" && (
          <>
            <p className="text-sm font-bold text-stone-900">Requirement poori karein</p>
            <p className="mt-1 text-xs text-stone-500">
              Upar diye gaye sawaal ka jawab dein — budget, seats aur preference. Jaise hi requirement
              ready hogi, top 3 cars aa jayenge.
            </p>
          </>
        )}

        {stage === "shortlist" && (
          <>
            <p className="text-sm font-bold text-stone-900">
              {shortlist.length > 0 ? "Step 2 — Aapke top 3 cars" : "Step 2 — Shortlist ke liye live stock chahiye"}
            </p>
            <p className="mt-1 text-xs text-stone-500">
              {shortlist.length > 0
                ? "Ye sirf wahi cars hain jo abhi live dealer stock mein available hain. Price girne par notification bhi milta hai."
                : "Abhi aapki requirement ke hisaab se koi live car nahi mili. Login karke requirement save kar sakte hain — matching stock aate hi notification milega, ya filters thode relax karke dobara poochhein."}
            </p>
          </>
        )}

        {stage === "compare" && (
          <>
            <p className="text-sm font-bold text-stone-900">Step 3 — Compare karein</p>
            <p className="mt-1 text-xs text-stone-500">
              {canCompare
                ? "Chat mein do cars ka naam likhein (e.g. “Creta vs Thar”) — price, KM, fuel aur dealer side-by-side compare ho jayega."
                : "Compare karne ke liye kam se kam 2 cars chahiye — budget ya filters thode relax karein."}
            </p>
          </>
        )}

        {stage === "emi" && top && (
          <>
            <p className="text-sm font-bold text-stone-900">Step 4 — EMI plan</p>
            <p className="mt-1 text-xs text-stone-500">
              Neeche har car ka estimated monthly EMI hai (reducing balance). Exact terms lender se confirm
              karein.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link
                href={`/emi-calculator?amount=${top.price}${top.down_payment != null ? `&down=${top.down_payment}` : ""}`}
                className="rounded-lg bg-stone-900 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-stone-700"
              >
                Open EMI Calculator
              </Link>
            </div>
          </>
        )}

        {stage === "contact" && top && (
          <>
            <p className="text-sm font-bold text-stone-900">Step 5 — Dealer se baat karein</p>
            <p className="mt-1 text-xs text-stone-500">
              Car page par seedhe verified dealer ko call, WhatsApp ya enquiry bhej sakte hain — koi
              middleman nahi.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link
                href={`/cars/${top.id}#contact-dealer`}
                className="rounded-lg bg-stone-900 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-stone-700"
              >
                Contact dealer
              </Link>
              {top.dealer?.phone && (
                <a
                  href={`tel:${top.dealer.phone}`}
                  className="rounded-lg border border-stone-200 px-3 py-1.5 text-xs font-semibold text-stone-700 transition-colors hover:border-brand hover:text-brand"
                >
                  📞 {top.dealer.dealership_name || "Dealer"}
                </a>
              )}
            </div>
          </>
        )}

        {stage === "testdrive" && top && (
          <>
            <p className="text-sm font-bold text-stone-900">Step 6 — Test drive book karein</p>
            <p className="mt-1 text-xs text-stone-500">
              Car page se preferred date aur time bjkar test drive request bhejein — dealer aapse call
              karke confirm karega.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link
                href={`/cars/${top.id}#contact-dealer`}
                className="rounded-lg bg-stone-900 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-stone-700"
              >
                Book test drive
              </Link>
            </div>
          </>
        )}

        {stage === "buy" && (
          <>
            <p className="text-sm font-bold text-stone-900">Step 7 — Purchase confirm karein</p>
            <ul className="mt-2 space-y-1 text-xs text-stone-600">
              <li>✓ Dealer se final price aur payment mode confirm karein</li>
              <li>✓ RC transfer, insurance aur fitness paperwork dekhein</li>
              <li>✓ Car Connect par seller ko bhi verify karein</li>
            </ul>
            <div className="mt-3 flex flex-wrap gap-2">
              {top && (
                <Link
                  href={`/cars/${top.id}#contact-dealer`}
                  className="rounded-lg bg-stone-900 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-stone-700"
                >
                  Final dealer talk
                </Link>
              )}
              {onAsk && (
                <button
                  type="button"
                  onClick={() => onAsk("Meri requirement ke liye 3 aur options dikhao")}
                  className="rounded-lg border border-stone-200 px-3 py-1.5 text-xs font-semibold text-stone-700 transition-colors hover:border-brand hover:text-brand"
                >
                  3 aur options dekhein
                </button>
              )}
            </div>
          </>
        )}
      </div>

      {shortlist.length > 0 && (
        <ul className="mt-4 space-y-2">
          {shortlist.map((car, i) => (
            <CarJourneyCard key={car.id} car={car} rank={i + 1} />
          ))}
        </ul>
      )}
    </div>
  );
}
