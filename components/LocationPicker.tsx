"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { Button, Spinner } from "@/components/ui";

const LeafletMap = dynamic(() => import("@/components/map/LeafletMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-64 items-center justify-center rounded-lg border border-stone-200 bg-stone-50">
      <Spinner label="Loading map…" />
    </div>
  ),
});

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
  onChange,
}: {
  lat?: number | null;
  lng?: number | null;
  label?: string;
  onChange: (loc: PickedLocation) => void;
}) {
  const [query, setQuery] = useState(label);
  const [suggestions, setSuggestions] = useState<PickedLocation[]>([]);
  const [searching, setSearching] = useState(false);
  const [locating, setLocating] = useState(false);
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
    if (!navigator.geolocation) return;
    setLocating(true);
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 }),
      );
      const { latitude, longitude } = pos.coords;
      let result: PickedLocation = { lat: latitude, lng: longitude, label: "My location", city: "" };
      try {
        const res = await fetch(`/api/geocode/reverse?lat=${latitude}&lng=${longitude}`);
        const data = await res.json();
        if (data.label) result = { lat: latitude, lng: longitude, label: data.label, city: data.city ?? "" };
      } catch {}
      handlePick(result);
    } catch {
      console.warn("Location permission denied");
    } finally {
      setLocating(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            value={query}
            onChange={(e) => search(e.target.value)}
            placeholder="Search area, city, pincode… (e.g. 'Jaipur')"
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
        <Button type="button" variant="outline" onClick={useMyLocation} loading={locating}>
          📍 My Location
        </Button>
      </div>

      <div className="overflow-hidden rounded-lg border border-stone-200">
        <LeafletMap lat={picked?.lat ?? lat} lng={picked?.lng ?? lng} onDrag={handlePick} />
      </div>

      {picked?.label && <p className="text-xs text-stone-500">📍 {picked.label}</p>}
      <p className="text-[11px] text-stone-400">
        Map data © <a className="underline" href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors
      </p>
    </div>
  );
}