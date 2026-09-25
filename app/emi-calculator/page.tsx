import type { Metadata } from "next";
import { EMICalculator } from "@/components/EMICalculator";

export const metadata: Metadata = {
  title: "EMI Calculator",
  description:
    "Car loan EMI calculator. Instant monthly installment, total payable aur total interest with Indian lakh/crore formatting. 0% loan bhi supported.",
};

export default async function EMICalculatorPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  // Optional deep link from a car card / AI journey: ?amount=<price>&down=<down>
  const sp = await searchParams;
  const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const amount = Number(first(sp.amount));
  const down = Number(first(sp.down));
  const startAmount = Number.isFinite(amount) && amount > 0 ? amount : 500000;
  const startDown = Number.isFinite(down) && down > 0 ? down : undefined;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-2xl font-extrabold text-stone-900">EMI Calculator</h1>
      <p className="mt-1 max-w-2xl text-sm text-stone-500">
        Car loan ke liye monthly installment (EMI) nikaalo — reducing balance method se. Values
        badalte hi result turant update hota hai, koi button press nahi.
      </p>
      {startDown != null && (
        <p className="mt-2 inline-flex rounded-full bg-brand-light px-3 py-1 text-xs font-semibold text-brand-dark">
          Aapki shortlist car ke liye pre-filled — amount aur down payment adjust kar lein.
        </p>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_340px]">
        <div>
          <EMICalculator amount={startAmount} downPayment={startDown} />
        </div>

        <aside className="space-y-4">
          <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
            <h2 className="font-semibold text-stone-900">Formula samjho</h2>
            <p className="mt-2 font-mono text-xs text-stone-600">
              EMI = P × r × (1+r)ⁿ / ((1+r)ⁿ − 1)
            </p>
            <ul className="mt-3 space-y-1.5 text-sm text-stone-600">
              <li>• <strong>P</strong> — Loan principal (finance amount = car price − down payment)</li>
              <li>• <strong>r</strong> — Monthly interest rate (annual ÷ 12 ÷ 100)</li>
              <li>• <strong>n</strong> — Total months (years × 12)</li>
            </ul>
            <p className="mt-3 text-xs text-stone-400">
              Rate 0% daalne pe simple installment bante hai (P ÷ n) — full shop saab.
            </p>
          </div>

          <div className="rounded-xl border border-stone-200 bg-stone-50 p-5">
            <h2 className="font-semibold text-stone-900">Ek nazar me</h2>
            <ul className="mt-2 space-y-1.5 text-sm text-stone-600">
              <li>• Decimal rates supported (8.5%, 9.25%…)</li>
              <li>• Indian formatting: ₹5,00,000</li>
              <li>• Max tenure 15 saal, max price 10 Cr</li>
              <li>• Pure client-side — data kahin upload nahi hota</li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}