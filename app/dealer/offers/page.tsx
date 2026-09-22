import type { Metadata } from "next";
import { requireDealer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { DealerOffers } from "./DealerOffers";

export const metadata: Metadata = { title: "Mere Offers" };

export default async function DealerOffersPage() {
  const { dealer } = await requireDealer();
  const supabase = await createClient();

  const { data: offers } = await supabase
    .from("dealer_offers")
    .select("*, listing:customer_sell_listings(*)")
    .eq("dealer_id", dealer.id)
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <div>
      <h2 className="mb-1 text-lg font-bold text-stone-900">Customer Car Offers 💰</h2>
      <p className="mb-4 text-sm text-stone-500">
        &apos;Sell My Car&apos; customers pe aapke bheje offers yahan dikhte hain.
      </p>
      <DealerOffers offers={offers ?? []} />
    </div>
  );
}