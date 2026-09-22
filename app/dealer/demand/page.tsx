import type { Metadata } from "next";
import { requireDealer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { fetchDemandClusters } from "@/lib/demand-api";
import type { DemandCluster } from "@/lib/types";
import { DemandList } from "./DemandList";

export const metadata: Metadata = { title: "Customer Demand" };

export const dynamic = "force-dynamic";

export default async function DealerDemandPage() {
  await requireDealer();
  const supabase = await createClient();

  let clusters: DemandCluster[] = [];
  try {
    clusters = await fetchDemandClusters(supabase);
  } catch {
    clusters = [];
  }

  return (
    <div>
      <div className="mb-4">
        <h2 className="text-lg font-bold text-stone-900">🔥 Customer Demand</h2>
        <p className="mt-0.5 text-sm text-stone-500">
          Customers kaise cars dhoondh rahe hain — aggregated aur anonymous. Koi name, phone ya email
          nahi dikhta; sirf demand.
        </p>
      </div>
      <DemandList clusters={clusters} />
    </div>
  );
}