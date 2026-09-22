"use client";

import { useEffect, useRef, useState } from "react";
import {
  AREA_CITIES,
  getStoredLocation,
  geocodeCity,
  locateFromBrowser,
  setStoredLocation,
  type HomeLocation,
} from "@/components/location-store";

export function LocationSelector() {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [location, setLocation] = useState<HomeLocation | null>(() => getStoredLocation());
  const [error, setError] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  async function pick(city: string) {
    setBusy(true);
    setError("");
    try {
      const loc = await geocodeCity(city);
      if (!loc) {
        setError(`"${city}" find nahi hua`);
        return;
      }
      setStoredLocation(loc);
      setLocation(loc);
      setOpen(false);
    } finally {
      setBusy(false);
    }
  }

  async function useMyLocation() {
    setBusy(true);
    setError("");
    try {
      const loc = await locateFromBrowser();
      if (!loc) {
        setError("Location nahi mili — koi city chuno.");
        return;
      }
      setStoredLocation(loc);
      setLocation(loc);
      setOpen(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50"
        aria-haspopup="listbox"
      >
        <span aria-hidden>📍</span>
        <span className="max-w-28 truncate">{location ? location.label : "All India"}</span>
        <span className="text-stone-400" aria-hidden>▾</span>
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-72 overflow-hidden rounded-xl border border-stone-200 bg-white shadow-lg">
          <div className="border-b border-stone-100 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-stone-400">Nearby cars ke liye location chunein</p>
            {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
            <button
              onClick={useMyLocation}
              disabled={busy}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-stone-900 px-3 py-2 text-sm font-semibold text-white hover:bg-stone-800 disabled:opacity-60"
            >
              {busy ? "Dhoond rahe hain…" : "📡 Meri location use karo"}
            </button>
            <button
              onClick={() => { setStoredLocation({ lat: 0, lng: 0, label: "" }); setLocation(null); setOpen(false); }}
              className="mt-1.5 w-full rounded-lg border border-stone-200 px-3 py-1.5 text-xs text-stone-500 hover:bg-stone-50"
            >
              Hatao — all India dikhao
            </button>
          </div>
          <div className="flex flex-col gap-1 px-2 py-2">
            <p className="px-2 pt-1 text-xs font-semibold text-stone-400">Popular cities</p>
            {AREA_CITIES.map((c) => (
              <button
                key={c}
                onClick={() => pick(c)}
                disabled={busy}
                className="flex items-center justify-between rounded-lg px-3 py-2 text-left text-sm text-stone-700 hover:bg-stone-100 disabled:opacity-60"
              >
                <span>{c}</span>
                {location?.label === c && <span className="text-brand">✓</span>}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}