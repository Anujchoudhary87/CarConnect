"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { VehicleWithInfo } from "@/lib/types";
import { CarCard } from "@/components/CarCard";
import { Button } from "@/components/ui";
import { getStoredLocation, LOCATION_EVENT } from "@/components/location-store";

const RADII = ["5", "10", "25", "50", "100"];

export function HomeInventory() {
  const [deals, setDeals] = useState<VehicleWithInfo[]>([]);
  const [latest, setLatest] = useState<VehicleWithInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [location, setLocation] = useState(() => getStoredLocation());
  const [radius, setRadius] = useState<string | null>(null);
  const [favState, setFavState] = useState<Record<string, boolean>>({});

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const base = new URLSearchParams({ sort: "newest" });
      const params: Array<[string, string]> = [];
      if (location) {
        params.push(["lat", String(location.lat)], ["lng", String(location.lng)]);
        if (radius) params.push(["radius_km", radius]);
        params.push(["sort", "distance"]);
      }
      const res = await fetch(`/api/marketplace?${base.toString()}&${new URLSearchParams(params)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not load cars");
      const vehicles = (data.vehicles ?? []) as VehicleWithInfo[];
      setDeals(vehicles.slice(0, 6));
      const newest = [...vehicles].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );
      setLatest(newest.slice(0, 6));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load cars");
    } finally {
      setLoading(false);
    }
  }, [location, radius]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await Promise.resolve();
      if (!cancelled) load();
    })();
    return () => {
      cancelled = true;
    };
  }, [load]);

  useEffect(() => {
    const onLoc = (e: Event) => {
      const d = (e as CustomEvent<{ lat: number; lng: number; label: string }>).detail;
      if (d && typeof d.lat === "number") setLocation(d);
    };
    window.addEventListener(LOCATION_EVENT, onLoc);
    return () => window.removeEventListener(LOCATION_EVENT, onLoc);
  }, []);

  function onToggleFavorite(car: VehicleWithInfo, favorite: boolean) {
    setFavState((f) => ({ ...f, [car.id]: favorite }));
  }

  const renderCard = (car: VehicleWithInfo) => (
    <CarCard
      key={car.id}
      car={{ ...car, is_favorite: favState[car.id] ?? car.is_favorite }}
      onToggleFavorite={onToggleFavorite}
    />
  );

  const grid = (cars: VehicleWithInfo[]) => (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {cars.map(renderCard)}
    </div>
  );

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-12 px-4">
      {/* Featured Cars Near You */}
      <section>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-extrabold text-stone-900 sm:text-2xl">
              Featured Cars {location ? "Near You" : ""} 🔥
            </h2>
            <p className="mt-0.5 text-sm text-stone-500">
              {location ? `Showing cars around ${location.label}.` : "Set your location in the header to sort by distance."}
            </p>
          </div>
          <Link href="/marketplace" className="text-sm font-semibold text-brand hover:underline">
            View all →
          </Link>
        </div>

        {location && (
          <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto">
            <span className="shrink-0 py-1.5 text-xs font-semibold text-stone-400">Radius:</span>
            <button
              onClick={() => setRadius(null)}
              className={`shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors ${
                radius === null
                  ? "border-brand bg-brand text-white"
                  : "border-stone-200 bg-white text-stone-600 hover:border-brand"
              }`}
            >
              All India
            </button>
            {RADII.map((r) => (
              <button
                key={r}
                onClick={() => setRadius(r)}
                className={`shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors ${
                  radius === r
                    ? "border-brand bg-brand text-white"
                    : "border-stone-200 bg-white text-stone-600 hover:border-brand"
                }`}
              >
                {r} km
              </button>
            ))}
          </div>
        )}

        <div className="mt-4">
          {loading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="overflow-hidden rounded-xl border border-stone-200 bg-white">
                  <div className="skeleton aspect-[4/3]" />
                  <div className="space-y-2 p-3">
                    <div className="skeleton h-4 w-3/4 rounded" />
                    <div className="skeleton h-5 w-1/3 rounded" />
                    <div className="skeleton h-3 w-2/3 rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            <CardFallback error={error} />
          ) : deals.length === 0 ? (
            <CardEmpty location={location} />
          ) : (
            grid(deals)
          )}
        </div>
      </section>

      {/* Latest Cars */}
      <section>
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-extrabold text-stone-900 sm:text-2xl">Latest Cars 🆕</h2>
            <p className="mt-0.5 text-sm text-stone-500">Newest listings from verified dealers near you.</p>
          </div>
          <Link href="/marketplace" className="text-sm font-semibold text-brand hover:underline">
            View all →
          </Link>
        </div>
        <div className="mt-4">
          {loading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="overflow-hidden rounded-xl border border-stone-200 bg-white">
                  <div className="skeleton aspect-[4/3]" />
                  <div className="space-y-2 p-3">
                    <div className="skeleton h-4 w-3/4 rounded" />
                    <div className="skeleton h-5 w-1/3 rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : error ? null : latest.length === 0 ? null : (
            grid(latest)
          )}
        </div>
      </section>
    </div>
  );
}

function CardEmpty({ location }: { location: { label: string } | null }) {
  return (
    <div className="flex flex-col items-center rounded-xl border border-dashed border-stone-300 bg-white px-6 py-14 text-center">
      <span className="text-4xl">🛻</span>
      <h3 className="mt-3 font-semibold text-stone-900">No cars listed yet</h3>
      <p className="mt-1 max-w-sm text-sm text-stone-500">
        {location
          ? `No cars found near ${location.label}. Try a wider radius.`
          : "Cars from live inventory will appear here. Set your location in the header to see nearby cars first."}
      </p>
      {!location && (
        <a
          href="/marketplace"
          className="mt-4 inline-flex h-11 items-center rounded-lg bg-stone-900 px-5 text-sm font-semibold text-white hover:bg-stone-800"
        >
          Browse the marketplace
        </a>
      )}
    </div>
  );
}

function CardFallback({ error }: { error: string }) {
  return (
    <div className="flex flex-col items-center rounded-xl border border-dashed border-stone-300 bg-white px-6 py-14 text-center">
      <span className="text-4xl">🗄️</span>
      <h3 className="mt-3 font-semibold text-stone-900">Cars are on the way</h3>
      <p className="mt-1 max-w-sm text-sm text-stone-500">
        {error} — Once the database is connected, real car listings will appear here.
      </p>
      <Button variant="outline" className="mt-4" onClick={() => window.location.reload()}>
        Retry
      </Button>
    </div>
  );
}