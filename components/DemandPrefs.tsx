"use client";

import { useEffect, useState } from "react";
import { Card, EmptyState } from "@/components/ui";
import { priceBucket, priceBucketLabel } from "@/lib/demand";

interface DemandPref {
  id: string;
  brand: string;
  model: string;
  fuel: string;
  min_year: number | null;
  max_price: number | null;
  city: string;
  status: string;
  notify: boolean;
  created_at: string;
}

function labelOf(d: DemandPref): string {
  const name = `${d.brand} ${d.model}`.trim();
  const parts = [name || (d.fuel ? `${d.fuel} car` : "Koi specific car")];
  if (d.min_year) parts.push(`${d.min_year}+`);
  const bucket = priceBucket(d.max_price ? d.max_price / 100000 : null);
  const bl = priceBucketLabel(bucket);
  if (bl) parts.push(bl);
  return parts.join(" • ");
}

// Per-demand stock-notification toggle. Turning a toggle off only flips the
// notify flag — the demand itself is never deleted.
export function DemandPrefs() {
  const [demands, setDemands] = useState<DemandPref[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/demands")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (active && Array.isArray(data?.demands)) setDemands(data.demands as DemandPref[]);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  async function toggle(d: DemandPref, next: boolean) {
    setBusy(d.id);
    const res = await fetch(`/api/demands/${d.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notify: next }),
    }).catch(() => null);
    if (res?.ok) setDemands((prev) => (prev ?? []).map((x) => (x.id === d.id ? { ...x, notify: next } : x)));
    setBusy(null);
  }

  if (demands === null) return null;
  if (demands.length === 0) {
    return (
      <EmptyState
        icon="🔔"
        title="Koi demand record nahi"
        description="Marketplace search ya AI Advisor mein requirement poori na hone par demand record hoti hai — phir yahan notifications control kar paoge."
      />
    );
  }

  return (
    <Card className="divide-y divide-stone-100">
      <div className="px-4 py-3.5">
        <p className="font-bold text-stone-900">🔔 Stock milne par mujhe batana</p>
        <p className="mt-0.5 text-sm text-stone-500">
          Jo demand phir bhi active hai, unke liye stock match hone par in-app notification bhejenge.
        </p>
      </div>
      {demands.map((d) => (
        <div key={d.id} className="flex items-center justify-between gap-3 px-4 py-3.5">
          <div className="min-w-0">
            <p className="truncate font-semibold text-stone-900">{labelOf(d)}</p>
            <p className="text-xs text-stone-500">
              {d.status} · {d.city || "All India"}
            </p>
          </div>
          <label className="flex shrink-0 cursor-pointer items-center gap-2 text-sm font-medium text-stone-700">
            <input
              type="checkbox"
              className="size-4 accent-brand"
              checked={d.notify}
              disabled={busy === d.id}
              onChange={(e) => toggle(d, e.target.checked)}
            />
            {d.notify ? "Haan, batao" : "Nahi, thanks"}
          </label>
        </div>
      ))}
    </Card>
  );
}