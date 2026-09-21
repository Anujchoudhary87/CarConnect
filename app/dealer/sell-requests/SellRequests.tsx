"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { CustomerSellListing } from "@/lib/types";
import { Badge, Button, EmptyState, FieldError, Input, Label, Textarea } from "@/components/ui";
import { formatINR, formatKm, ownerLabel, timeAgo } from "@/lib/format";

interface MyOffer {
  listing_id: string;
  offer_price: number;
  status: string;
}

export function SellRequests({
  listings,
  myOffers,
  verified,
}: {
  listings: CustomerSellListing[];
  myOffers: MyOffer[];
  verified: boolean;
}) {
  const offerMap = new Map(myOffers.map((o) => [o.listing_id, o]));

  if (listings.length === 0) {
    return (
      <EmptyState
        icon="💰"
        title={verified ? "Abhi koi sell request nahi" : "Sirf verified dealers ko dikhti hain"}
        description={
          verified
            ? "Jab customers apni gaadi bechne ke liye list karenge, unki requests yahan dikhengi."
            : "'Sell My Car' customers ki requests sirf verified dealers ko dikhti hain. Apna dealer verification complete karo."
        }
        action={
          !verified ? (
            <Link
              href="/dealer/profile"
              className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark"
            >
              Verification complete karo
            </Link>
          ) : (
            <Link
              href="/marketplace"
              className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark"
            >
              Marketplace dekho
            </Link>
          )
        }
      />
    );
  }

  return (
    <div className="space-y-3">
      {listings.map((l) => (
        <SellRequestCard key={l.id} listing={l} offer={offerMap.get(l.id) ?? null} />
      ))}
    </div>
  );
}

function SellRequestCard({ listing, offer }: { listing: CustomerSellListing; offer: MyOffer | null }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [price, setPrice] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  const activeOffer = offer && offer.status !== "withdrawn" ? offer : null;
  const canOffer = listing.status === "open";

  async function submitOffer(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const res = await fetch("/api/offers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listing_id: listing.id, offer_price: Number(price), message: msg }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Offer bhejna fail hua");
      setSent(true);
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Offer bhejna fail hua");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={listing.photos && listing.photos.length > 0 ? listing.photos[0] : "/car-placeholder.svg"}
          alt={`${listing.brand} ${listing.model}`}
          className="h-24 w-full rounded-lg bg-stone-100 object-contain sm:w-36"
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Link href={`/sell/${listing.id}`} className="font-semibold text-stone-900 hover:text-brand-dark">
              {listing.brand} {listing.model} {listing.variant}
            </Link>
            <Badge status={listing.status}>{listing.status}</Badge>
          </div>
          <p className="mt-0.5 text-sm text-stone-500">
            {listing.year} · {formatKm(listing.km)} · {listing.fuel} · {ownerLabel(listing.owner)}
          </p>
          <p className="mt-0.5 text-sm text-stone-500">
            📍 {listing.city || "Location not set"} · {timeAgo(listing.created_at)}
          </p>
        </div>
        <div className="flex w-full flex-col items-start gap-2 sm:w-auto sm:items-end">
          <p className="text-lg font-extrabold text-brand-dark">{formatINR(listing.expected_price)}</p>
          <span className="text-xs text-stone-400">Expected price (bargainable)</span>
          {activeOffer ? (
            <div className="flex flex-wrap items-center gap-2">
              <Badge status={activeOffer.status}>
                Offer sent · {formatINR(activeOffer.offer_price)}
              </Badge>
              <Link
                href="/dealer/offers"
                className="rounded-lg border border-stone-300 px-3 py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-50"
              >
                My Offers
              </Link>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href={`/sell/${listing.id}`}
                className="rounded-lg border border-stone-300 px-3 py-1.5 text-sm font-semibold text-stone-700 hover:bg-stone-50"
              >
                View Details
              </Link>
              {canOffer && (
                <Button size="sm" variant="outline" onClick={() => setOpen((v) => !v)}>
                  {open ? "Cancel" : offer ? "Re-send Offer" : "Make Offer"}
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      {open && !activeOffer && canOffer && (
        <form onSubmit={submitOffer} className="mt-3 space-y-3 rounded-xl bg-stone-50 p-4">
          <div>
            <Label htmlFor={`offer-price-${listing.id}`}>Offer Price (₹) *</Label>
            <Input
              id={`offer-price-${listing.id}`}
              type="number"
              required
              min={0}
              step={1000}
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="e.g. 350000"
            />
          </div>
          <div>
            <Label htmlFor={`offer-msg-${listing.id}`}>Message (optional)</Label>
            <Textarea
              id={`offer-msg-${listing.id}`}
              rows={2}
              value={msg}
              onChange={(e) => setMsg(e.target.value)}
              placeholder="e.g. Cash deal karke le sakte hain"
            />
          </div>
          {error && <FieldError message={error} />}
          {sent && (
            <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              Offer bhej diya! 🎉
            </p>
          )}
          <Button type="submit" loading={busy}>
            Send Offer
          </Button>
        </form>
      )}
    </div>
  );
}