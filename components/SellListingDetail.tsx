"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { CustomerSellListing, DealerOffer } from "@/lib/types";
import { Badge, Button, Card, FieldError, Input, Label, Textarea } from "@/components/ui";
import { formatINR, formatKm, ownerLabel, telLink, timeAgo, whatsappLink } from "@/lib/format";

export function SellListingDetail({
  listing,
  isOwner,
  viewerDealerId,
  offers,
  myOffer,
}: {
  listing: CustomerSellListing;
  isOwner: boolean;
  viewerDealerId: string | null;
  offers: DealerOffer[];
  myOffer: DealerOffer | null;
}) {
  const router = useRouter();
  const [offerPrice, setOfferPrice] = useState("");
  const [offerMsg, setOfferMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  const open = listing.status === "open";

  async function submitOffer(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const res = await fetch("/api/offers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listing_id: listing.id, offer_price: Number(offerPrice), message: offerMsg }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Offer bhej nahi paye");
      setSent(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Offer bhej nahi paye");
    } finally {
      setBusy(false);
    }
  }

  async function changeOfferStatus(offerId: string, status: string) {
    setBusy(true);
    try {
      const res = await fetch(`/api/offers/${offerId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error ?? "Fail ho gaya");
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fail ho gaya");
    } finally {
      setBusy(false);
    }
  }

  async function closeListing(action: "sold" | "closed") {
    setBusy(true);
    try {
      await fetch(`/api/sell-listings/${listing.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  const specs = [
    ["Year", String(listing.year)],
    ["KM", formatKm(listing.km)],
    ["Fuel", listing.fuel],
    ["Owner", ownerLabel(listing.owner)],
    ["Transmission", listing.transmission],
    ["Variant", listing.variant || "—"],
  ];

  return (
    <div className="space-y-5">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-extrabold text-stone-900">
            {listing.brand} {listing.model} {listing.variant}
          </h1>
          <Badge status={listing.status}>{listing.status}</Badge>
        </div>
        <p className="mt-1 text-sm text-stone-500">
          Listed {timeAgo(listing.created_at)} · {listing.city || "Location set nahi"}
        </p>
      </div>

      {!open && (
        <p className="rounded-lg bg-stone-100 px-3 py-2 text-sm text-stone-600">
          {listing.status === "sold" ? "🎉 Ye gaadi bech di gayi hai." : "Ye listing band kar di gayi hai."}
        </p>
      )}

      {listing.photos && listing.photos.length > 0 && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {listing.photos.map((url) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={url} src={url} alt="listing" className="aspect-video w-full rounded-lg bg-stone-100 object-contain" />
          ))}
        </div>
      )}

      <div className="grid gap-5 md:grid-cols-[1fr_320px]">
        <Card className="p-5">
          <h2 className="font-semibold text-stone-900">Car Details</h2>
          <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
            {specs.map(([label, value]) => (
              <div key={label} className="rounded-lg bg-stone-50 p-3">
                <dt className="text-xs font-medium text-stone-400">{label}</dt>
                <dd className="mt-0.5 font-semibold text-stone-800">{value}</dd>
              </div>
            ))}
          </dl>
          {listing.description && (
            <p className="mt-4 whitespace-pre-line text-sm text-stone-600">{listing.description}</p>
          )}
        </Card>

        <aside className="space-y-4">
          <Card className="p-5">
            <p className="text-2xl font-extrabold text-brand-dark">{formatINR(listing.expected_price)}</p>
            <p className="text-xs text-stone-400">Expected price (bargainable)</p>

            {isOwner ? (
              <div className="mt-3 space-y-2">
                <a
                  href={whatsappLink(listing.contact_phone, `Hi ${listing.contact_name}, maine aapki ${listing.brand} ${listing.model} listing Car Connect pe dekhi.`)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block rounded-lg bg-emerald-600 px-3 py-2.5 text-center text-sm font-semibold text-white hover:bg-emerald-700"
                >
                  💬 Apne WhatsApp pe
                </a>
                {open && (
                  <div className="flex gap-2">
                    <Button variant="success" className="flex-1" onClick={() => closeListing("sold")} loading={busy}>
                      Bech Di Gayi
                    </Button>
                    <Button variant="outline" className="flex-1" onClick={() => closeListing("closed")} loading={busy}>
                      Band Karo
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="mt-3 text-sm text-stone-600">
                <p className="font-medium">Owner se contact:</p>
                <p>{listing.contact_name} · {listing.contact_phone}</p>
                <div className="mt-2 flex gap-2">
                  <a href={telLink(listing.contact_phone)} className="flex-1 rounded-lg bg-stone-900 px-3 py-2 text-center text-sm font-semibold text-white">
                    📞 Call
                  </a>
                  <a
                    href={whatsappLink(listing.contact_phone, `Hi ${listing.contact_name}, main ${listing.brand} ${listing.model} mein interested hoon.`)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 rounded-lg bg-emerald-600 px-3 py-2 text-center text-sm font-semibold text-white"
                  >
                    💬 WhatsApp
                  </a>
                </div>
              </div>
            )}
          </Card>

          {isOwner && (
            <Card className="p-5">
              <h3 className="font-semibold text-stone-900">Dealer Offers ({offers.length})</h3>
              <div className="mt-3 space-y-3">
                {offers.length === 0 && (
                  <p className="text-sm text-stone-400">Abhi koi offer nahi aaya. Kuch din ruko.</p>
                )}
                {offers.map((o) => (
                  <div key={o.id} className="rounded-lg border border-stone-200 p-3">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-stone-900">{formatINR(o.offer_price)}</span>
                      <Badge status={o.status}>{o.status}</Badge>
                    </div>
                    <p className="mt-1 text-sm text-stone-600">
                      {o.dealer?.dealership_name || "Dealer"}
                      {o.dealer?.verified ? " ✓" : ""}
                    </p>
                    {o.message && <p className="mt-1 text-xs text-stone-500">“{o.message}”</p>}
                    {o.status === "pending" && (
                      <div className="mt-2 flex gap-2">
                        <Button size="sm" variant="success" onClick={() => changeOfferStatus(o.id, "accepted")} loading={busy}>
                          Accept
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => changeOfferStatus(o.id, "rejected")} loading={busy}>
                          Reject
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          )}
        </aside>
      </div>

      {!isOwner && viewerDealerId && open && (
        <Card className="p-5">
          <h3 className="font-semibold text-stone-900">Apna Offer Bhejo 💰</h3>
          {myOffer ? (
            <div className="mt-3">
              <p className="rounded-lg bg-brand-light px-3 py-2 text-sm text-brand-dark">
                Aapka offer: <strong>{formatINR(myOffer.offer_price)}</strong> · {myOffer.status}
              </p>
              {myOffer.status === "pending" && (
                <Button size="sm" variant="outline" className="mt-2" onClick={() => changeOfferStatus(myOffer.id, "withdrawn")} loading={busy}>
                  Offer wapas lo
                </Button>
              )}
            </div>
          ) : (
            <form onSubmit={submitOffer} className="mt-3 space-y-3">
              <div>
                <Label htmlFor="offer-price">Offer Price (₹) *</Label>
                <Input id="offer-price" type="number" required min={0} step={1000} value={offerPrice} onChange={(e) => setOfferPrice(e.target.value)} placeholder="e.g. 350000" />
              </div>
              <div>
                <Label htmlFor="offer-msg">Message (optional)</Label>
                <Textarea id="offer-msg" rows={2} value={offerMsg} onChange={(e) => setOfferMsg(e.target.value)} placeholder="e.g. Cash deal karke le sakte hain" />
              </div>
              <FieldError message={error} />
              {sent && <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">Offer bhej diya! 🎉</p>}
              <Button type="submit" loading={busy}>Offer Bhejo</Button>
            </form>
          )}
        </Card>
      )}
    </div>
  );
}