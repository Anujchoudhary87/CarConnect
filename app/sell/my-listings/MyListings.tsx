"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { CustomerSellListing } from "@/lib/types";
import { Badge, Spinner } from "@/components/ui";
import { formatKm, formatPriceShort } from "@/lib/format";
import { EmptyState } from "@/components/ui";

type Listing = CustomerSellListing & { offer_count?: number };

export function MyListings() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/sell-listings")
      .then((r) => r.json())
      .then((d) => setListings(d.listings ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="flex justify-center py-12"><Spinner label="Load ho raha hai…" /></div>;
  }

  if (listings.length === 0) {
    return (
      <EmptyState
        icon="🚗"
        title="Abhi koi listing nahi"
        description="Apni gaadi bechne ke liye upar 'Apni Gaadi Becho' form bharo."
        action={
          <Link href="/sell" className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark">
            Apni Gaadi Becho
          </Link>
        }
      />
    );
  }

  return (
    <div className="space-y-3">
      {listings.map((l) => (
        <Link
          key={l.id}
          href={`/sell/${l.id}`}
          className="flex flex-col gap-2 rounded-xl border border-stone-200 bg-white p-4 shadow-sm transition-colors hover:border-brand/40 sm:flex-row sm:items-center sm:justify-between"
        >
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-stone-900">
                {l.brand} {l.model} {l.variant}
              </span>
              <Badge status={l.status}>{l.status}</Badge>
            </div>
            <p className="mt-0.5 text-sm text-stone-500">
              {l.year} · {formatKm(l.km)} · {l.fuel}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="font-bold text-stone-900">{formatPriceShort(l.expected_price)}</p>
              <p className="text-xs text-stone-400">{l.offer_count ?? 0} offers</p>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}