import type { Metadata } from "next";
import { requireDealer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { SellRequests } from "./SellRequests";

export const metadata: Metadata = { title: "Customer Sell Requests" };

export default async function DealerSellRequestsPage() {
  const { dealer } = await requireDealer();
  const supabase = await createClient();

  const [{ data: listings }, { data: myOffers }] = await Promise.all([
    supabase
      .from("customer_sell_listings")
      .select("*")
      .eq("status", "open")
      .order("created_at", { ascending: false })
      .limit(200),
    supabase
      .from("dealer_offers")
      .select("listing_id, offer_price, status")
      .eq("dealer_id", dealer.id),
  ]);

  return (
    <div>
      <h2 className="mb-1 text-lg font-bold text-stone-900">Customer Sell Requests 💰</h2>
      <p className="mb-4 text-sm text-stone-500">
        &apos;Sell My Car&apos; customers jo apni gaadi bechna chahte hain — unse offer bhej kar deal karo.
      </p>
      <SellRequests
        listings={listings ?? []}
        myOffers={myOffers ?? []}
        verified={dealer.verified}
      />
    </div>
  );
}