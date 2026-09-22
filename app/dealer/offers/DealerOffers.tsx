"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Badge, Button, EmptyState } from "@/components/ui";
import { formatINR, telLink, timeAgo, whatsappLink } from "@/lib/format";
import type { DealerOffer } from "@/lib/types";

interface OfferRow extends DealerOffer {
  listing?: {
    id: string;
    brand: string;
    model: string;
    variant?: string;
    expected_price: number;
    status: string;
    contact_name?: string;
    contact_phone?: string;
  } | null;
}

export function DealerOffers({ offers }: { offers: OfferRow[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function withdraw(id: string) {
    setBusy(true);
    try {
      await fetch(`/api/offers/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "withdrawn" }),
      });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  if (offers.length === 0) {
    return (
      <EmptyState
        icon="🤝"
        title="Koi offer nahi bheja"
        description="'Sell My Car' listings pe offer bhej kar apna inventory badhao."
        action={
          <Link href="/sell" className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark">
            Sellers Dekho
          </Link>
        }
      />
    );
  }

  return (
    <div className="space-y-3">
      {offers.map((o) => (
        <div key={o.id} className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Link href={`/sell/${o.listing?.id}`} className="font-semibold text-stone-900 hover:text-brand-dark">
              {o.listing?.brand} {o.listing?.model} {o.listing?.variant}
            </Link>
            <Badge status={o.status}>{o.status}</Badge>
          </div>
          <p className="mt-0.5 text-xs text-stone-400">{timeAgo(o.created_at)}</p>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
            <span className="font-bold text-brand-dark">{formatINR(o.offer_price)}</span>
            {o.listing && (
              <>
                <span className="text-stone-400">
                  Owner ki price: <strong className="text-stone-700">{formatINR(o.listing.expected_price)}</strong>
                </span>
                <Badge status={o.listing.status}>{o.listing.status}</Badge>
              </>
            )}
          </div>
          {o.status === "accepted" && o.listing?.contact_phone && (
            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-stone-600">
              <span>🎉 Offer accept ho gaya — owner se baat karo:</span>
              <span className="font-medium">{o.listing.contact_name} · {o.listing.contact_phone}</span>
              <a href={telLink(o.listing.contact_phone)} className="rounded-lg bg-stone-900 px-3 py-1 text-xs font-semibold text-white">📞 Call</a>
              <a href={whatsappLink(o.listing.contact_phone, `Hi ${o.listing.contact_name}, main aapke ${o.listing.brand} ${o.listing.model} pe cash offer dene wala hoon.`)} target="_blank" rel="noopener noreferrer" className="rounded-lg bg-emerald-600 px-3 py-1 text-xs font-semibold text-white">💬 WhatsApp</a>
            </div>
          )}
          {o.status === "pending" && (
            <div className="mt-2 flex gap-2">
              <Button size="sm" variant="outline" onClick={() => withdraw(o.id)} loading={busy}>Offer Wapas Lo</Button>
              <Button size="sm" variant="outline">
                <Link href={`/sell/${o.listing?.id}`}>Listing Dekho</Link>
              </Button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}