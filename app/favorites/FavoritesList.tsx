"use client";

import { useCallback, useEffect, useState } from "react";
import type { VehicleWithInfo } from "@/lib/types";
import { ButtonLink, EmptyState, Spinner } from "@/components/ui";
import { CarCard } from "@/components/CarCard";

export function FavoritesList() {
  const [cars, setCars] = useState<VehicleWithInfo[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/favorites");
      const data = await res.json();
      setCars((data.vehicles ?? []) as VehicleWithInfo[]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      void load();
    }, 0);
    return () => clearTimeout(t);
  }, [load]);

  function onToggleFavorite(car: VehicleWithInfo, favorite: boolean) {
    setCars((prev) => (favorite ? prev : prev.filter((c) => c.id !== car.id)));
  }

  if (loading) {
    return <div className="flex justify-center py-12"><Spinner label="Load ho raha hai…" /></div>;
  }

  if (cars.length === 0) {
    return (
      <EmptyState
        icon="♥️"
        title="Koi saved gaadi nahi"
        description="Marketplace se gaadiyon pe heart icon dabao aur yahan save karo."
        action={
          <ButtonLink href="/marketplace">Cars Dekho</ButtonLink>
        }
      />
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {cars.map((c) => (
        <CarCard key={c.id} car={{ ...c, is_favorite: true }} onToggleFavorite={onToggleFavorite} />
      ))}
    </div>
  );
}