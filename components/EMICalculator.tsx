"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Button, Card, Input, Label } from "@/components/ui";
import { formatLakh } from "@/lib/format";

interface EMICalculatorProps {
  amount?: number;
  downPayment?: number;
  defaultRate?: number;
  compact?: boolean;
}

const DEFAULT_RATE = 10.5;

function parseNumber(value: string, fallback: number): number {
  const n = parseFloat(value);
  return Number.isFinite(n) && value.trim() !== "" ? n : fallback;
}

function fmtMoney(value: number): string {
  return `₹${Math.round(value).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

// When a down payment exists, the EMI principal MUST be the finance amount
// (price - down payment), never the full vehicle price.
function initialPrincipal(amount?: number, downPayment?: number): number {
  const base = amount && Number.isFinite(amount) ? Math.round(amount) : 500000;
  const down = downPayment != null && Number.isFinite(downPayment) ? Math.round(downPayment) : 0;
  return Math.max(1, base - down);
}

export function EMICalculator({ amount, downPayment, defaultRate, compact }: EMICalculatorProps) {
  const hasFinance = downPayment != null && Number.isFinite(downPayment);
  const principalLabel = hasFinance ? "Finance Amount" : "Car Price";

  const [principal, setPrincipal] = useState(() => String(initialPrincipal(amount, downPayment)));
  const [rate, setRate] = useState(() =>
    defaultRate != null && Number.isFinite(defaultRate) ? String(defaultRate) : String(DEFAULT_RATE),
  );
  const [years, setYears] = useState("5");

  const P = parseNumber(principal, 0);
  const R = parseNumber(rate, 0);
  const Y = parseNumber(years, 0);

  const principalValid = P > 0 && P <= 100000000;
  const rateValid = R >= 0 && R <= 30;
  const yearsValid = Y > 0 && Y <= 15;

  const valid = principalValid && rateValid && yearsValid;

  const result = useMemo(() => {
    if (!valid) return null;
    const n = Math.max(1, Math.round(Y * 12));
    const r = R / 100 / 12;
    const monthly = R === 0 ? P / n : (P * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
    const total = monthly * n;
    return { monthly, total, interest: total - P, n };
  }, [P, R, Y, valid]);

  const error =
    !principalValid && principal !== "" && P > 100000000
      ? "Amount 10 Cr se zyada nahi ho sakta."
      : !yearsValid && years !== "" && Y > 15
        ? "Tenure max 15 saal."
        : "";

  return (
    <Card className={compact ? "p-4" : "p-6"}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="text-base font-bold text-stone-900">EMI Calculator</h2>
          {!compact && (
            <p className="mt-1 text-xs text-stone-500">
              Loan ka monthly installment nikalna hai? Reducing balance formula se turant result.
            </p>
          )}
        </div>
        <span className="rounded-full bg-brand-light px-2 py-0.5 text-xs font-bold text-brand-dark">0% Interest handled</span>
      </div>

      <div className={compact ? "mt-3 space-y-2.5" : "mt-5 grid gap-4 sm:grid-cols-3"}>
        <div>
          <Label htmlFor={compact ? "emi-price-c" : "emi-price"} hint="₹">{principalLabel}</Label>
          <Input
            id={compact ? "emi-price-c" : "emi-price"}
            type="number"
            min={0}
            step={10000}
            value={principal}
            onChange={(e) => setPrincipal(e.target.value)}
            placeholder="500000"
          />
          {hasFinance && (
            <p className="mt-1 text-[11px] leading-snug text-stone-400">
              {formatLakh(amount)} Price − {formatLakh(downPayment)} Down Payment
            </p>
          )}
        </div>
        <div>
          <Label htmlFor={compact ? "emi-rate-c" : "emi-rate"} hint="%/yr">Interest Rate</Label>
          <Input
            id={compact ? "emi-rate-c" : "emi-rate"}
            type="number"
            min={0}
            max={30}
            step={0.05}
            value={rate}
            onChange={(e) => setRate(e.target.value)}
            placeholder="10.5"
          />
          {hasFinance && defaultRate != null && (
            <p className="mt-1 text-[11px] text-stone-400">Dealer rate — change kar sakte ho.</p>
          )}
        </div>
        <div>
          <Label htmlFor={compact ? "emi-years-c" : "emi-years"} hint="yr">Tenure</Label>
          <Input
            id={compact ? "emi-years-c" : "emi-years"}
            type="number"
            min={0.5}
            max={15}
            step={0.5}
            value={years}
            onChange={(e) => setYears(e.target.value)}
            placeholder="5"
          />
        </div>
      </div>

      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}

      {result && (
        <div className="mt-4 rounded-xl bg-stone-900 p-4 text-white">
          <p className="text-xs uppercase tracking-wide text-stone-400">Monthly EMI</p>
          <p className="text-3xl font-extrabold text-white">{fmtMoney(result.monthly)}</p>
          <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-lg bg-stone-800 px-3 py-2">
              <p className="text-xs text-stone-400">Total Payable</p>
              <p className="font-bold">{fmtMoney(result.total)}</p>
            </div>
            <div className="rounded-lg bg-stone-800 px-3 py-2">
              <p className="text-xs text-stone-400">Total Interest</p>
              <p className="font-bold">{fmtMoney(result.interest)}</p>
            </div>
          </div>
        </div>
      )}

      {!result && (
        <p className="mt-4 rounded-lg bg-stone-50 px-3 py-2 text-xs text-stone-500">
          Values daalne pe EMI automatically calculate ho jayegi.
        </p>
      )}

      <div className={compact ? "mt-3 flex flex-wrap gap-2" : "mt-4 flex flex-wrap items-center justify-between gap-3"}>
        {compact ? (
          <Link href="/emi-calculator" className="text-xs font-semibold text-brand hover:underline">
            Full EMI Calculator →
          </Link>
        ) : (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setPrincipal(String(initialPrincipal(amount, downPayment)));
              setRate(String(defaultRate != null && Number.isFinite(defaultRate) ? defaultRate : DEFAULT_RATE));
              setYears("5");
            }}
          >
            Reset
          </Button>
        )}
      </div>

      <p className="mt-3 text-[11px] leading-relaxed text-stone-400">
        Disclaimer: shown EMI is an estimate. Actual EMI may vary based on lender, rate, fees, and
        eligibility — bank se final terms confirm karein.
      </p>
    </Card>
  );
}