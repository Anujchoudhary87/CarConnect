"use client";

import Link from "next/link";
import { useState } from "react";
import type { VehicleWithInfo } from "@/lib/types";
import { formatKm, formatPriceShort, ownerLabel } from "@/lib/format";
import { distanceLabel } from "@/lib/geo";

export function CarCard({
  car,
  onToggleFavorite,
}: {
  car: VehicleWithInfo;
  onToggleFavorite?: (car: VehicleWithInfo, favorite: boolean) => void;
}) {
  const [busy, setBusy] = useState(false);
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
        window.location.href = `/auth/login?next=/cars/${car.id}`;
        return;
      }
      const data = await res.json();
      onToggleFavorite(car, data.favorite);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Link
      href={`/cars/${car.id}`}
      className="group flex flex-col overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-stone-100">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={image}
            alt={`${car.brand} ${car.model}`}
            className="h-full w-full object-cover transition-transform group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-4xl">🚗</div>
        )}
        {car.distance_km != null && (
          <span className="absolute bottom-2 left-2 rounded-full bg-stone-900/80 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur">
            📍 {distanceLabel(car.distance_km)}
          </span>
        )}
        {onToggleFavorite && car.is_favorite !== undefined && (
          <button
            onClick={toggleFavorite}
            disabled={busy}
            className="absolute right-2 top-2 rounded-full bg-white/90 p-2 shadow transition-transform hover:scale-110"
            aria-label="Save car"
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

      <div className="flex flex-1 flex-col p-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold leading-tight text-stone-900">
            {car.brand} {car.model}
            {car.variant && <span className="text-sm font-normal text-stone-500"> {car.variant}</span>}
          </h3>
        </div>
        <p className="mt-1 text-lg font-extrabold text-brand-dark">{formatPriceShort(car.price)}</p>
        <p className="mt-1 truncate text-xs text-stone-500">
          {car.year} · {formatKm(car.km)} · {car.fuel} · {ownerLabel(car.owner)}
        </p>
        <div className="mt-2 flex items-center justify-between gap-2 border-t border-stone-100 pt-2 text-xs text-stone-500">
          <span className="flex items-center gap-1 truncate">
            {car.dealer?.verified && <span className="text-emerald-600">✓</span>}
            <span className="truncate">{car.dealer?.dealership_name ?? "Dealer"}</span>
          </span>
          <span className="shrink-0">{car.city || ""}</span>
        </div>
      </div>
    </Link>
  );
}