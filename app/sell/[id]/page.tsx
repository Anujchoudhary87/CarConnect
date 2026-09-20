import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SellListingDetail } from "@/components/SellListingDetail";
import type { CustomerSellListing, DealerOffer } from "@/lib/types";

export const metadata: Metadata = { title: "Sell Listing" };

export default async function SellListingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login?next=/sell/" + id);

  const { data: listing } = await supabase
    .from("customer_sell_listings")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!listing) notFound();
  const l = listing as CustomerSellListing;

  const isOwner = l.user_id === user.id;

  const { data: myDealer } = await supabase
    .from("dealers")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  let offers: DealerOffer[] = [];
  let myOffer: DealerOffer | null = null;

  if (isOwner) {
    const { data } = await supabase
      .from("dealer_offers")
      .select("*, dealer:dealers(*)")
      .eq("listing_id", id)
      .order("created_at", { ascending: false });
    offers = (data ?? []) as DealerOffer[];
  } else if (myDealer) {
    const { data } = await supabase
      .from("dealer_offers")
      .select("*, dealer:dealers(*)")
      .eq("listing_id", id)
      .eq("dealer_id", myDealer.id)
      .maybeSingle();
    myOffer = (data as DealerOffer) ?? null;
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <SellListingDetail
        listing={l}
        isOwner={isOwner}
        viewerDealerId={myDealer?.id ?? null}
        offers={offers}
        myOffer={myOffer}
      />
    </div>
  );
}