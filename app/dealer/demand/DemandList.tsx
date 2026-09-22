"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { EmptyState } from "@/components/ui";
import { timeAgo } from "@/lib/format";
import { priceBucket, priceBucketLabel } from "@/lib/demand";
import type { DemandCluster } from "@/lib/types";

type SortKey = "highest" | "newest" | "location" | "brand" | "fuel" | "budget";

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "highest", label: "Highest Demand" },
  { value: "newest", label: "Newest Requests" },
  { value: "location", label: "Location" },
  { value: "brand", label: "Brand" },
  { value: "fuel", label: "Fuel" },
  { value: "budget", label: "Budget" },
];

function titleOf(c: DemandCluster): string {
  const name = `${c.brand} ${c.model}`.trim();
  if (name) return name;
  if (c.fuel) return `${c.fuel} cars`;
  return "Any car";
}

function metaOf(c: DemandCluster): string[] {
  const parts: string[] = [];
  if (c.fuel) parts.push(c.fuel);
  if (c.min_year) parts.push(`${c.min_year}+`);
  if (!parts.length) parts.push("Koi specific criteria nahi");
  return parts;
}

function sortClusters(list: DemandCluster[], key: SortKey): DemandCluster[] {
  const arr = [...list];
  switch (key) {
    case "highest":
      return arr.sort((a, b) => b.customers - a.customers || b.signals - a.signals || (a.brand < b.brand ? -1 : 1));
    case "newest":
      return arr.sort((a, b) => new Date(b.last_requested).getTime() - new Date(a.last_requested).getTime());
    case "location":
      return arr.sort((a, b) => (a.city || "zz").localeCompare(b.city || "zz"));
    case "brand":
      return arr.sort((a, b) => (a.brand || "zz").localeCompare(b.brand || "zz") || (a.model < b.model ? -1 : 1));
    case "fuel":
      return arr.sort((a, b) => (a.fuel || "zz").localeCompare(b.fuel || "zz"));
    case "budget": {
      const rank = (c: DemandCluster) => {
        const b = priceBucket(c.max_price ? c.max_price / 100000 : null);
        return (b.low ?? 0) * 1000 + (b.high ?? 100);
      };
      return arr.sort((a, b) => rank(a) - rank(b));
    }
  }
}

export function DemandList({ clusters }: { clusters: DemandCluster[] }) {
  const [sort, setSort] = useState<SortKey>("highest");
  const [showAvailableOnly, setShowAvailableOnly] = useState(false);

  const list = useMemo(() => {
    const filtered = showAvailableOnly
      ? clusters.filter((c) => (c.matching_available ?? 0) > 0)
      : clusters;
    return sortClusters(filtered, sort);
  }, [clusters, sort, showAvailableOnly]);

  const totalCustomers = useMemo(
    () => clusters.reduce((acc, c) => acc + c.customers, 0),
    [clusters],
  );

  if (clusters.length === 0) {
    return (
      <EmptyState
        icon="🔥"
        title="Abhi koi demand nahi"
        description="Jab customers ki searches Car Connect inventory mein match na kar saken, to unki demand yahan aggregate ho kar dikhegi. Sabkuch anonymous rehta hai."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-stone-500">
          {clusters.length} demand cluster{clusters.length === 1 ? "" : "s"} ·{" "}
          {totalCustomers.toLocaleString("en-IN")} customers pehle se looking
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setShowAvailableOnly((v) => !v)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
              showAvailableOnly
                ? "bg-brand text-white"
                : "bg-stone-100 text-stone-600 hover:bg-stone-200"
            }`}
          >
            Available now
          </button>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            className="h-9 w-44 rounded-lg border border-stone-300 bg-white px-2.5 text-sm text-stone-800 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
            aria-label="Sort demands"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {list.map((c) => {
          const bucket = priceBucket(c.max_price ? c.max_price / 100000 : null);
          const available = c.matching_available ?? 0;
          const searchQ = encodeURIComponent(`${c.brand} ${c.model}`.trim() || (c.fuel || ""));
          return (
            <div key={c.cluster_key} className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-bold text-stone-900">🔥 {titleOf(c)}</h3>
                    {c.customers >= 3 && (
                      <span className="rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-bold text-red-600 ring-1 ring-inset ring-red-100">
                        🔥 High Demand
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-sm text-stone-500">{metaOf(c).join(" • ")}</p>
                </div>
                {priceBucketLabel(bucket) && (
                  <span className="rounded-full bg-stone-100 px-2.5 py-1 text-xs font-bold text-stone-700">
                    {priceBucketLabel(bucket)}
                  </span>
                )}
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm">
                <span className="font-extrabold text-brand-dark">
                  {c.customers.toLocaleString("en-IN")} customer{c.customers === 1 ? "" : "s"} looking
                </span>
                <span className="text-stone-400">
                  {c.city ? `${c.city} / Nearby` : "All India"}
                </span>
                <span className="text-stone-400" title={new Date(c.last_requested).toLocaleString("en-IN")}>
                  Last request {timeAgo(c.last_requested)}
                </span>
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-2">
                {available > 0 ? (
                  <>
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                      🟢 Demand Covered
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                      ✓ Matching cars available: {available}
                    </span>
                  </>
                ) : (
                  <>
                    <span className="inline-flex items-center gap-1 rounded-full bg-stone-100 px-2.5 py-1 text-xs font-semibold text-stone-500">
                      🔔 Demand active
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
                      Abhi matching inventory nahi
                    </span>
                  </>
                )}
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Link
                  href={`/marketplace?q=${searchQ}`}
                  className="inline-flex h-9 items-center justify-center rounded-lg bg-brand px-4 text-sm font-semibold text-white transition-colors hover:bg-brand-dark"
                >
                  Cars Dekho
                </Link>
                <Link
                  href="/dealer/cars/new"
                  className="inline-flex h-9 items-center justify-center rounded-lg border border-stone-300 bg-white px-4 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-50"
                >
                  Apni inventory mein dalo
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}