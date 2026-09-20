import { DealerNav } from "@/components/DealerNav";
import { requireDealer } from "@/lib/auth";

export default async function DealerLayout({ children }: { children: React.ReactNode }) {
  const { dealer } = await requireDealer();

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <div className="mb-5 flex flex-col gap-1.5">
        <h1 className="text-xl font-bold text-stone-900">{dealer.dealership_name}</h1>
        <p className="text-sm text-stone-500">
          {dealer.verified ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">
              ✓ Verified Dealer
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
              ⏳ Verification pending
            </span>
          )}{" "}
          · {dealer.city || "Location not set"}
        </p>
      </div>

      <div className="lg:grid lg:grid-cols-[220px_1fr] lg:gap-6">
        <DealerNav />
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}