"use client";

import dynamic from "next/dynamic";
import { Spinner } from "@/components/ui";

const LeafletMap = dynamic(() => import("@/components/map/LeafletMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-48 items-center justify-center rounded-lg border border-stone-200 bg-stone-50">
      <Spinner label="Map load ho raha hai…" />
    </div>
  ),
});

export function StaticMap({ lat, lng }: { lat: number; lng: number }) {
  return (
    <div className="overflow-hidden rounded-lg border border-stone-200">
      <LeafletMap lat={lat} lng={lng} interactive={false} />
    </div>
  );
}