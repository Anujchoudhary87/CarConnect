"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { Button, Spinner } from "@/components/ui";
import { useDeviceLocation } from "@/lib/use-device-location";

const LeafletMap = dynamic(() => import("@/components/map/LeafletMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-64 items-center justify-center rounded-lg border border-stone-200 bg-stone-50">
      <Spinner label="Map load ho raha hai…" />
    </div>
  ),
});

// Same map, but a small placeholder so the compact layout does not jump
// when the tile bundle finishes loading.
const LeafletMapCompact = dynamic(() => import("@/components/map/LeafletMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-44 items-center justify-center rounded-lg border border-stone-200 bg-stone-50">
      <Spinner label="Map load ho raha hai…" />
    </div>
  ),
});

const COMPACT_MAP_HEIGHT = 176;

export interface PickedLocation {
  lat: number;
  lng: number;
  label: string;
  city: string;
}

export function LocationPicker({
  lat = null,
  lng = null,
  label = "",
  compact = false,
  onChange,
}: {
  lat?: number | null;
  lng?: number | null;
  label?: string;
  /** Mobile-first layout: full-width search, small collapsible map preview. */
  compact?: boolean;
  onChange: (loc: PickedLocation) => void;
}) {
  const [query, setQuery] = useState(label);
  const [suggestions, setSuggestions] = useState<PickedLocation[]>([]);
  const [searching, setSearching] = useState(false);
  const { locating, error: locateError, locate } = useDeviceLocation();
  const [showMap, setShowMap] = useState(!compact);
  const [picked, setPicked] = useState<PickedLocation | null>(
    lat && lng ? { lat, lng, label, city: "" } : null,
  );

  async function search(q: string) {
    setQuery(q);
    if (q.trim().length < 3) {
      setSuggestions([]);
      return;
    }
    setSearching(true);
    try {
      const res = await fetch(`/api/geocode?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setSuggestions(Array.isArray(data.results) ? data.results : []);
    } catch {
      setSuggestions([]);
    } finally {
      setSearching(false);
    }
  }

  function handlePick(s: PickedLocation) {
    setPicked(s);
    setQuery(s.label);
    setSuggestions([]);
    onChange(s);
  }

  async function useMyLocation() {
    const point = await locate();
    if (!point) return;
    handlePick({
      lat: point.lat,
      lng: point.lng,
      // Without a reverse-geocode hit the point still has to be visible.
      label: point.label || "My current location",
      city: point.city,
    });
  }

  const mapLat = picked?.lat ?? lat;
  const mapLng = picked?.lng ?? lng;
  const hasPoint = Boolean(mapLat && mapLng);

  return (
    <div className="space-y-3">
      <div className={compact ? "space-y-2" : "flex gap-2"}>
        <div className="relative flex-1">
          <input
            type="text"
            value={query}
            onChange={(e) => search(e.target.value)}
            placeholder="Area, city, pincode dhoondo… (e.g. 'Jaipur')"
            className="h-11 w-full rounded-lg border border-stone-300 bg-white px-3 text-sm text-stone-900 placeholder:text-stone-400 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
          />
          {searching && (
            <span className="absolute right-3 top-3">
              <Spinner className="size-5" />
            </span>
          )}
          {suggestions.length > 0 && (
            <ul className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-stone-200 bg-white shadow-lg">
              {suggestions.map((s, i) => (
                <li key={i}>
                  <button
                    type="button"
                    onClick={() => handlePick(s)}
                    className="block w-full px-3 py-2.5 text-left text-sm hover:bg-stone-50"
                  >
                    <span className="font-medium text-stone-800">{s.city || "Location"}</span>
                    <span className="block truncate text-xs text-stone-400">{s.label}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={useMyLocation}
          loading={locating}
          className={compact ? "w-full" : undefined}
        >
          📍 {compact ? "Use My Location" : "Meri Location"}
        </Button>
      </div>

      {compact && (
        <button
          type="button"
          onClick={() => setShowMap((s) => !s)}
          aria-expanded={showMap}
          className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs font-semibold text-stone-600 transition-colors hover:bg-stone-50"
        >
          🗺 {showMap ? "Map chhupao" : "Map pe pin adjust karo"}
          {!hasPoint && <span className="font-normal text-stone-400">(pehle location chuno)</span>}
        </button>
      )}

      {(!compact || showMap) && (
        <div className="overflow-hidden rounded-lg border border-stone-200">
          {compact ? (
            <LeafletMapCompact
              lat={mapLat}
              lng={mapLng}
              onDrag={handlePick}
              height={COMPACT_MAP_HEIGHT}
            />
          ) : (
            <LeafletMap lat={mapLat} lng={mapLng} onDrag={handlePick} />
          )}
        </div>
      )}

      {picked?.label && <p className="text-xs text-stone-500">📍 {picked.label}</p>}
      {locateError && <p className="text-xs text-amber-700">{locateError}</p>}
      <p className="text-[11px] text-stone-400">
        Map data © <a className="underline" href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors
      </p>
    </div>
  );
}