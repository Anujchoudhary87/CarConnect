"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { VehicleWithInfo } from "@/lib/types";
import type { HomeLocation } from "@/components/location-store";
import {
  getStoredLocation,
  LOCATION_EVENT,
} from "@/components/location-store";
import { CarCard } from "@/components/CarCard";
import { Carousel, type CarouselColumn } from "@/components/Carousel";

const RADII = ["5", "20", "50", "100", "150", "200", "200+"];
const NEARBY_RADIUS = "100";

// Compact cards on phones (1.7 per view ≈ one full car + a peek at the next),
// widening to the existing desktop density.
const RAIL_BREAKPOINTS = [
  { max: 639, perView: 1.7 },
  { max: 1023, perView: 2.3 },
  { max: 1279, perView: 3.3 },
  { max: Number.POSITIVE_INFINITY, perView: 4.25 },
];

export function HomeSections({
  newest,
  recentlyAdded,
  initialFavorites,
}: {
  /** Featured / all active vehicles — first carousel. */
  newest: VehicleWithInfo[];
  /** Recently added (last 14 days) — second carousel. Falls back to newest if short. */
  recentlyAdded?: VehicleWithInfo[];
  initialFavorites?: Record<string, boolean>;
}) {
  const [favState, setFavState] = useState<Record<string, boolean>>(initialFavorites ?? {});

  function onToggleFavorite(car: VehicleWithInfo, favorite: boolean) {
    setFavState((f) => ({ ...f, [car.id]: favorite }));
  }

  const toColumns = (
    cars: VehicleWithInfo[],
    badges?: Record<string, string>,
  ): CarouselColumn[] =>
    cars.map((car) => ({
      id: car.id,
      node: (
        <CarCard
          car={{
            ...car,
            is_favorite: favState[car.id] ?? car.is_favorite,
          }}
          onToggleFavorite={onToggleFavorite}
          badge={badges?.[car.id]}
          compact
        />
      ),
    }));

  return (
    <>
      {/* Cars near you */}
      <NearbySection
        sectionId="nearby-cars"
        favState={favState}
        onToggleFavorite={onToggleFavorite}
        allIndiaCars={newest}
      />

      {/* Recently Added */}
      {(recentlyAdded ?? newest).length > 0 && (
        <section id="newly-added-cars" className="scroll-mt-24">
          <SectionHeader
            eyebrow="Fresh stock"
            title="Recently Added Cars"
            subtitle="Dealers ki sabse nayi active listings."
            seeAllHref="/marketplace"
          />
          <div className="mt-3 sm:mt-5">
            <Carousel
              ariaLabel="recently added cars"
              autoMs={1000}
              breakpoints={RAIL_BREAKPOINTS}
              columns={toColumns(recentlyAdded ?? newest)}
            />
          </div>
        </section>
      )}
    </>
  );

function SectionHeader({
  eyebrow,
  title,
  subtitle,
  seeAllHref,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
  seeAllHref: string;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <p className="hidden text-xs font-bold uppercase tracking-widest text-brand sm:block">
          {eyebrow}
        </p>
        <h2 className="mt-1 text-xl font-extrabold tracking-tight text-stone-900 sm:text-2xl lg:text-3xl">
          {title}
        </h2>
        {subtitle && <p className="mt-1 hidden text-sm text-stone-500 sm:block">{subtitle}</p>}
      </div>
      <Link
        href={seeAllHref}
        className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm font-semibold text-brand transition-colors hover:text-brand-dark"
      >
        View All →
      </Link>
    </div>
  );
}

function NearbySection({
  sectionId,
  favState,
  onToggleFavorite,
  allIndiaCars,
}: {
  sectionId: string;
  favState: Record<string, boolean>;
  onToggleFavorite: (car: VehicleWithInfo, favorite: boolean) => void;
  allIndiaCars: VehicleWithInfo[];
}) {
  const [location, setLocation] = useState<HomeLocation | null>(() => getStoredLocation());
  const [radius, setRadius] = useState<string | null>(location ? NEARBY_RADIUS : null);
  const [cars, setCars] = useState<VehicleWithInfo[] | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!location) {
      setCars(allIndiaCars.slice(0, 12));
      return;
    }

    setError("");
    try {
      const params = new URLSearchParams();
      params.set("lat", String(location.lat));
      params.set("lng", String(location.lng));
      params.set("sort", "distance");
      if (radius) params.set("radius_km", radius);

      const res = await fetch(`/api/marketplace?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Cars could not be loaded");
      setCars((data.vehicles ?? []).slice(0, 12));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Cars could not be loaded");
      setCars([]);
    }
  }, [location, radius, allIndiaCars]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!cancelled) await load();
    })();
    return () => {
      cancelled = true;
    };
  }, [load]);

  useEffect(() => {
    const onLoc = (e: Event) => {
      const d = (e as CustomEvent<HomeLocation | null>).detail;
      if (d && typeof d.lat === "number") {
        setLocation(d);
        setRadius((r) => r || "100");
      } else {
        setLocation(null);
        setRadius(null);
      }
    };
    window.addEventListener(LOCATION_EVENT, onLoc);
    return () => window.removeEventListener(LOCATION_EVENT, onLoc);
  }, []);

  const subtitle = "Live dealer stock around you";

  return (
    <section id={sectionId} className="scroll-mt-24">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-extrabold tracking-tight text-stone-900 sm:text-2xl lg:text-3xl">
          Cars Near You
        </h2>
        <Link
          href="/marketplace"
          className="inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-1.5 text-sm font-semibold text-brand transition-colors hover:text-brand-dark"
        >
          View All →
        </Link>
      </div>
      <p className="mt-1 hidden text-sm text-stone-500 sm:block">{subtitle}</p>

      <div className="no-scrollbar mt-3 flex items-center gap-2 overflow-x-auto pb-1">
        <span className="shrink-0 py-1.5 text-xs font-semibold text-stone-400">Radius:</span>
        <button
          onClick={() => setRadius(null)}
          className={`shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors ${
            radius === null || !location
              ? "border-brand bg-brand text-white"
              : "border-stone-200 bg-white text-stone-600 hover:border-brand"
          }`}
        >
          All India
        </button>
        {RADII.map((r) => (
          <button
            key={r}
            onClick={() => {
              if (!location) {
                // If no location, we can't really do a radius, but let's keep the UI state
                setRadius(r);
              } else {
                setRadius(r);
              }
            }}
            disabled={!location}
            className={`shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors ${
              radius === r && location
                ? "border-brand bg-brand text-white"
                : !location
                  ? "border-stone-100 bg-stone-50 text-stone-300 cursor-not-allowed"
                  : "border-stone-200 bg-white text-stone-600 hover:border-brand"
            }`}
            title={!location ? "Pehle header mein location select karein" : ""}
          >
            {r} km
          </button>
        ))}
      </div>

      <div className="mt-2.5 sm:mt-4">
        {cars === null && !error ? (
          <CarouselSkeleton />
        ) : cars && cars.length === 0 ? (
          <div className="flex flex-col items-center rounded-2xl border border-dashed border-stone-300 bg-white px-6 py-9 text-center sm:py-14">
            <span className="text-4xl">🛻</span>
            <h3 className="mt-3 text-lg font-bold text-stone-900">Abhi aas-paas cars nahi mili</h3>
            <p className="mt-1 max-w-sm text-sm text-stone-500">
              {error ??
                `Abhi ${radius ? `${radius} km` : "aapke area"} mein koi active listing nahi. Wider radius try karo ya saari cars dekho.`}
            </p>
            <Link
              href="/marketplace"
              className="mt-5 inline-flex h-11 items-center justify-center rounded-lg bg-brand px-6 text-sm font-semibold text-white transition-colors hover:bg-brand-dark"
            >
              Browse All Cars
            </Link>
          </div>
        ) : (
          <Carousel
            ariaLabel="cars near you"
            autoMs={1000}
            breakpoints={RAIL_BREAKPOINTS}
            columns={(cars ?? []).map((car) => ({
              id: car.id,
              node: (
                <CarCard
                  car={{
                    ...car,
                    is_favorite: favState[car.id] ?? car.is_favorite,
                  }}
                  onToggleFavorite={onToggleFavorite}
                  compact
                />
              ),
            }))}
          />
        )}
      </div>
    </section>
  );
}

function CarouselSkeleton() {
  // Mirrors the rail card width (RAIL_BREAKPOINTS) so the first screen stays
  // compact and the swap to real cards does not jump.
  return (
    <div className="no-scrollbar flex gap-4 overflow-x-auto pb-1">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="w-[57%] shrink-0 overflow-hidden rounded-xl border border-stone-200 bg-white sm:w-[42%] lg:w-[29%] xl:w-[22%]"
        >
          <div className="skeleton aspect-[16/9]" />
          <div className="space-y-2 p-2.5">
            <div className="skeleton h-3.5 w-3/4 rounded" />
            <div className="skeleton h-4 w-1/2 rounded" />
            <div className="skeleton h-3 w-2/3 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}
}
