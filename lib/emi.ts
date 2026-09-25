// Single source of truth for the reducing-balance EMI maths.
// Used by the EMI calculator and the AI buying journey so the numbers can
// never drift apart.

export interface EmiResult {
  /** Principal actually financed. */
  principal: number;
  months: number;
  monthly: number;
  total: number;
  interest: number;
}

export const EMI_DEFAULT_RATE = 10.5;
export const EMI_DEFAULT_YEARS = 5;

/** Finance amount = price − down payment (never the full price when a down payment exists). */
export function financeAmount(price: number, downPayment?: number | null): number {
  const p = Number.isFinite(price) ? Math.round(price) : 0;
  const down =
    downPayment != null && Number.isFinite(Number(downPayment)) ? Math.round(Number(downPayment)) : 0;
  return Math.max(0, p - down);
}

/**
 * Reducing-balance EMI. Returns null for out-of-range / invalid input so
 * callers can show a validation message instead of a fake number.
 */
export function computeEmi(
  principal: number,
  annualRate: number = EMI_DEFAULT_RATE,
  years: number = EMI_DEFAULT_YEARS,
): EmiResult | null {
  const P = Number(principal);
  const R = Number(annualRate);
  const Y = Number(years);

  if (!Number.isFinite(P) || !Number.isFinite(R) || !Number.isFinite(Y)) return null;
  if (P <= 0 || P > 100000000) return null;
  if (R < 0 || R > 30) return null;
  if (Y <= 0 || Y > 15) return null;

  const n = Math.max(1, Math.round(Y * 12));
  const r = R / 100 / 12;
  const monthly = R === 0 ? P / n : (P * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
  const total = monthly * n;

  return { principal: P, months: n, monthly, total, interest: total - P };
}

export function formatEmi(value: number): string {
  return `₹${Math.round(value).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}
