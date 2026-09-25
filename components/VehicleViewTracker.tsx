"use client";

import { useEffect, useSyncExternalStore } from "react";
import { formatINR } from "@/lib/format";
import { priceDropSnapshot, recordVehicleView, subscribeRecentlyViewed } from "@/lib/recently-viewed";

const NO_DROP = "";

/**
 * Mounted on the car detail page. It records the anonymous view locally and,
 * when the dealer has reduced the price since the customer last looked, renders
 * a "Price dropped" banner with the real previous price. No login, no fake data.
 */
export function VehicleViewTracker({
  vehicle,
}: {
  vehicle: {
    id: string;
    brand: string;
    model: string;
    variant?: string | null;
    city?: string | null;
    image?: string | null;
    price: number;
  };
}) {
  // Writing to the local history is an external-system update, so it belongs in
  // an effect; the visible price-drop state comes from the store subscription.
  useEffect(() => {
    recordVehicleView(vehicle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vehicle.id, vehicle.price, vehicle.brand, vehicle.model, vehicle.variant, vehicle.city, vehicle.image]);

  const drop = useSyncExternalStore(
    subscribeRecentlyViewed,
    () => priceDropSnapshot(vehicle.id, vehicle.price),
    () => NO_DROP,
  );

  if (!drop) return null;

  const [from, to] = drop.split(":").map(Number);
  const saved = from - to;
  const savedPct = from > 0 ? Math.round((saved / from) * 100) : 0;

  return (
    <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3">
      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-bold text-emerald-800">
        <span aria-hidden>🔻</span> Price dropped
        <span className="font-semibold text-emerald-700/80 line-through">{formatINR(from)}</span>
        <span aria-hidden>→</span>
        <span>{formatINR(to)}</span>
      </p>
      <p className="mt-1 text-xs text-emerald-700">
        Aapne is car ko {formatINR(from)} par dekha tha. Dealer ne price {formatINR(saved)} ({savedPct}%)
        kam kiya hai.
      </p>
    </div>
  );
}
