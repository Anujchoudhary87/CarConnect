"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { VehicleWithInfo } from "@/lib/types";
import { formatKm, formatPriceShort, ownerLabel } from "@/lib/format";
import { distanceLabel } from "@/lib/geo";
import { cn } from "@/components/ui";

export function CarCard({
  car,
  onToggleFavorite,
  badge,
  compact = false,
}: {
  car: VehicleWithInfo;
  onToggleFavorite?: (car: VehicleWithInfo, favorite: boolean) => void;
  badge?: string;
  /** Denser card for the homepage rails — same data and links. */
  compact?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const image = car.vehicle_images?.[0]?.url;

  // Favorite toggle (top-right of image).
  async function toggleFavorite(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!onToggleFavorite || busy) return;
    const url = `/api/favorites`;
    // If not logged in, the caller handles the 401 prompt.
    setBusy(true);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vehicle_id: car.id }),
      });
      if (res.status === 401) {
        router.push(`/auth/login?next=/cars/${car.id}`);
        return;
      }
      const data = await res.json();
      onToggleFavorite(car, data.favorite);
    } finally {
      setBusy(false);
    }
  }

  const specs = [
    String(car.year),
    car.fuel,
    formatKm(car.km),
    car.transmission,
    ownerLabel(car.owner),
  ].filter(Boolean);

  return (
    <Link
      href={`/cars/${car.id}`}
      className={cn(
        "group flex h-full flex-col overflow-hidden border border-stone-200 bg-white shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg",
        compact ? "rounded-xl" : "rounded-2xl",
      )}
    >
      <div
        className={cn(
          "relative overflow-hidden bg-gradient-to-br from-stone-100 to-stone-200",
          compact ? "aspect-[16/9]" : "aspect-[16/10]",
        )}
      >
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={image}
            alt={`${car.brand} ${car.model}`}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/car-placeholder.svg"
              alt=""
              aria-hidden
              className="size-16 opacity-50"
            />
          </div>
        )}
        {badge && (
          <span className="absolute left-2 top-2 rounded-full bg-brand px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-white shadow">
            {badge}
          </span>
        )}
        {car.distance_km != null && (
          <span className="absolute bottom-2 left-2 rounded-full bg-stone-900/80 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur">
            📍 {distanceLabel(car.distance_km)} away
          </span>
        )}
        {onToggleFavorite && car.is_favorite !== undefined && (
          <button
            onClick={toggleFavorite}
            disabled={busy}
            className="absolute right-2 top-2 rounded-full bg-white/90 p-2 shadow transition-transform hover:scale-110"
            aria-label={car.is_favorite ? "Remove from saved cars" : "Save car"}
          >
            <svg
              viewBox="0 0 24 24"
              className={`size-5 ${car.is_favorite ? "fill-red-500 text-red-500" : "fill-none text-stone-500"}`}
              stroke="currentColor"
              strokeWidth="2"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.5c0 3.5-4.5 7-9 10.5-4.5-3.5-9-7-9-10.5A4.6 4.6 0 017.5 4c1.5 0 3 .7 4 2 .9-1.3 2.4-2 4-2a4.6 4.6 0 015.5 4.5z" />
            </svg>
          </button>
        )}
      </div>

      <div className={cn("flex flex-1 flex-col p-3.5", compact && "p-2.5 sm:p-3")}>
        <div className="flex items-start justify-between gap-2">
          <h3
            className={cn(
              "line-clamp-1 font-bold leading-snug text-stone-900",
              compact && "text-sm",
            )}
          >
            {car.brand} {car.model}
            {car.variant && (
              <span className="font-normal text-stone-500"> {car.variant}</span>
            )}
          </h3>
        </div>
        <p
          className={cn(
            "mt-1 text-lg font-extrabold tracking-tight text-brand-dark",
            compact && "text-base",
          )}
        >
          {formatPriceShort(car.price)}
        </p>
        <p
          className={cn(
            "mt-1 line-clamp-1 text-xs text-stone-500",
            compact && "text-[11px]",
          )}
        >
          {specs.join(" • ")}
        </p>

        <div className="min-h-3 flex-1" />

        <div
          className={cn(
            "flex items-center justify-between gap-2 border-t border-stone-100 pt-2.5",
            compact && "pt-2",
          )}
        >
          <span className="flex min-w-0 items-center gap-1 text-xs text-stone-600">
            <span aria-hidden>📍</span>
            <span className="truncate">{car.city || "India"}</span>
            {car.dealer?.verified && (
              <span
                className="ml-1 shrink-0 rounded-full bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700"
                title="Verified dealer"
              >
                ✓ Verified
              </span>
            )}
          </span>
          <span
            className={cn(
              "shrink-0 text-xs font-bold text-brand transition-colors group-hover:text-brand-dark",
              compact && "hidden lg:inline",
            )}
          >
            View Car →
          </span>
        </div>
      </div>
    </Link>
  );
}