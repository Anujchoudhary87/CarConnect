"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import type { VehicleWithInfo } from "@/lib/types";
import { CarCard } from "@/components/CarCard";
import { Carousel } from "@/components/Carousel";
import { formatPriceShort } from "@/lib/format";
import {
  clearRecentlyViewed,
  getRecentlyViewedServerSnapshot,
  getRecentlyViewedSnapshot,
  isPriceDrop,
  RECENTLY_VIEWED_SHOWN,
  subscribeRecentlyViewed,
} from "@/lib/recently-viewed";

/**
 * Homepage "Recently Viewed" rail. Reads the anonymous local history, then
 * resolves those ids against live active inventory so sold / withdrawn cars are
 * never shown, and marks cars whose price dropped since the customer last saw
 * them. Renders nothing for first-time visitors.
 */
export function RecentlyViewedSection({
  favState,
  onToggleFavorite,
}: {
  favState: Record<string, boolean>;
  onToggleFavorite: (car: VehicleWithInfo, favorite: boolean) => void;
}) {
  const history = useSyncExternalStore(
    subscribeRecentlyViewed,
    getRecentlyViewedSnapshot,
    getRecentlyViewedServerSnapshot,
  );

  const key = useMemo(() => history.map((v) => v.id).join(","), [history]);
  const [resolved, setResolved] = useState<{ key: string; cars: VehicleWithInfo[] } | null>(null);

  useEffect(() => {
    if (!key) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/marketplace?sort=newest");
        const data = res.ok ? await res.json() : { vehicles: [] };
        const live = (Array.isArray(data.vehicles) ? data.vehicles : []) as VehicleWithInfo[];
        const byId = new Map(live.map((c) => [c.id, c]));
        const cars = key
          .split(",")
          .map((id) => byId.get(id))
          .filter((c): c is VehicleWithInfo => Boolean(c))
          .slice(0, RECENTLY_VIEWED_SHOWN);
        if (!cancelled) setResolved({ key, cars });
      } catch {
        if (!cancelled) setResolved({ key, cars: [] });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [key]);

  const cars = resolved && resolved.key === key ? resolved.cars : null;
  if (!cars || cars.length === 0) return null;

  const seenPrice = (id: string) => history.find((v) => v.id === id)?.price ?? null;

  return (
    <section id="recently-viewed" className="scroll-mt-24">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-brand">Pick up where you left</p>
          <h2 className="mt-1 text-2xl font-extrabold tracking-tight text-stone-900 sm:text-3xl">
            Recently Viewed
          </h2>
          <p className="mt-1 text-sm text-stone-500">
            Aapne haal hi mein dekhi hui live cars — jinme price girya hai un par alert.
          </p>
        </div>
        <button
          type="button"
          onClick={clearRecentlyViewed}
          className="text-xs font-semibold text-stone-400 transition-colors hover:text-stone-600"
        >
          Clear history
        </button>
      </div>

      <div className="mt-5">
        <Carousel
          ariaLabel="recently viewed cars"
          autoMs={1400}
          columns={cars.map((car) => {
            const seen = seenPrice(car.id);
            const dropped = isPriceDrop(seen, Number(car.price));
            return {
              id: car.id,
              node: (
                <CarCard
                  car={{ ...car, is_favorite: favState[car.id] ?? car.is_favorite }}
                  onToggleFavorite={onToggleFavorite}
                  badge={dropped ? `Price dropped ${formatPriceShort(Number(seen))}` : undefined}
                />
              ),
            };
          })}
        />
      </div>
    </section>
  );
}
