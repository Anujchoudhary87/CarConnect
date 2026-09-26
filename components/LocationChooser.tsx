"use client";

import { useEffect, useRef, useState } from "react";
import {
  buildLabel,
  getStoredLocation,
  geocodeQuery,
  locateFromBrowser,
  setStoredLocation,
  LOCATION_EVENT,
  type HomeLocation,
} from "@/components/location-store";
import { searchDistricts, searchLocalities, searchStates } from "@/lib/locations";

interface LocationChooserProps {
  variant?: "header" | "hero";
  /** Denser trigger for the mobile header row. */
  compact?: boolean;
}

function buildParts(locality: string, district: string, state: string): string[] {
  return buildLabel([locality, district, state]).split(", ").filter(Boolean);
}

export function LocationChooser({ variant = "header", compact = false }: LocationChooserProps) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [location, setLocation] = useState<HomeLocation | null>(() => getStoredLocation());

  const [state, setState] = useState("");
  const [district, setDistrict] = useState("");
  const [locality, setLocality] = useState("");

  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  // Keep the label in sync when another instance (or another tab view of the
  // header) changes the stored location.
  useEffect(() => {
    const onLoc = (e: Event) => {
      const d = (e as CustomEvent<HomeLocation | null>).detail;
      setLocation(d && typeof d.lat === "number" ? d : null);
    };
    window.addEventListener(LOCATION_EVENT, onLoc);
    return () => window.removeEventListener(LOCATION_EVENT, onLoc);
  }, []);

  async function apply(parts: string[]) {
    const clean = parts.map((p) => p.trim()).filter(Boolean);
    if (clean.length === 0) return;
    setBusy(true);
    setError("");
    try {
      // Fall back to coarser queries if the full combination isn't resolvable.
      let loc: HomeLocation | null = null;
      for (let i = 0; i < clean.length && !loc; i++) {
        loc = await geocodeQuery(clean.slice(i).join(", "));
      }
      if (!loc) {
        setError("Location resolve nahi hui — thoda aur detail likh kar try karo.");
        return;
      }
      const withLabel = { ...loc, label: buildLabel([clean.join(", ")]) } as HomeLocation;
      setStoredLocation(withLabel);
      setLocation(withLabel);
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
        setError("Location nahi mili — GPS on karo ya neeche se city chuno.");
        return;
      }
      setStoredLocation(loc);
      setLocation(loc);
      setOpen(false);
    } finally {
      setBusy(false);
    }
  }

  function clearLocation() {
    setStoredLocation(null);
    setLocation(null);
    setState("");
    setDistrict("");
    setLocality("");
    setError("");
    setOpen(false);
  }

  const hero = variant === "hero";
  const stateSuggestions = searchStates(state);
  const districtSuggestions = state ? searchDistricts(state, district) : [];
  const localitySuggestions = state && district ? searchLocalities(state, district, locality) : [];

  const triggerClass = hero
    ? "flex h-[52px] w-full items-center justify-between gap-2 rounded-xl border border-white/20 bg-white/10 px-4 text-sm font-medium text-white backdrop-blur transition-colors hover:bg-white/20 sm:w-auto sm:justify-start"
    : compact
      ? "flex w-full min-w-0 items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-2.5 py-1.5 text-[13px] font-medium text-stone-700 transition-colors hover:bg-stone-50"
      : "flex items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50";

  const inputClass =
    "h-10 w-full rounded-lg border border-stone-200 bg-white px-3 text-sm text-stone-800 placeholder:text-stone-400 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20";

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={triggerClass}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label="Set your location"
      >
        <span aria-hidden>📍</span>
        <span className={hero ? "max-w-44 truncate" : compact ? "min-w-0 truncate" : "max-w-28 truncate"}>
          {location?.label || "All India"}
        </span>
        <span className={hero ? "text-white/70" : "text-stone-400"} aria-hidden>▾</span>
      </button>

      {open && (
        <div
          className={`absolute z-50 mt-2 w-80 overflow-hidden rounded-xl border border-stone-200 bg-white shadow-lg ${
            compact ? "left-0" : "right-0"
          }`}
        >
          <div className="border-b border-stone-100 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-stone-400">
              Cars near you ke liye location
            </p>
            {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
            <button
              type="button"
              onClick={useMyLocation}
              disabled={busy}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-stone-900 px-3 py-2 text-sm font-semibold text-white hover:bg-stone-800 disabled:opacity-60"
            >
              {busy ? "Finding…" : "📡 Use My Location"}
            </button>
          </div>

          <div className="space-y-2.5 px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-stone-400">
              Ya manual search: State → District → Locality
            </p>

            <div>
              <input
                value={state}
                onChange={(e) => {
                  setState(e.target.value);
                  setDistrict("");
                  setLocality("");
                }}
                placeholder="State — e.g. Rajasthan"
                className={inputClass}
                aria-label="State"
              />
              {stateSuggestions.length > 0 && (
                <div className="mt-1 max-h-40 overflow-auto rounded-lg border border-stone-100 bg-white">
                  {stateSuggestions.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => {
                        setState(s);
                        setDistrict("");
                        setLocality("");
                      }}
                      className="block w-full px-3 py-2 text-left text-sm text-stone-700 hover:bg-stone-100"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div>
              <input
                value={district}
                onChange={(e) => {
                  setDistrict(e.target.value);
                  setLocality("");
                }}
                placeholder={state ? "District — e.g. Jhunjhunu" : "Pehle state chuno"}
                disabled={!state}
                className={`${inputClass} disabled:bg-stone-50 disabled:text-stone-400`}
                aria-label="District"
              />
              {districtSuggestions.length > 0 && (
                <div className="mt-1 max-h-40 overflow-auto rounded-lg border border-stone-100 bg-white">
                  {districtSuggestions.map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => {
                        setDistrict(d);
                        setLocality("");
                      }}
                      className="block w-full px-3 py-2 text-left text-sm text-stone-700 hover:bg-stone-100"
                    >
                      {d}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div>
              <input
                value={locality}
                onChange={(e) => setLocality(e.target.value)}
                placeholder={
                  district ? "City / Town / Locality — e.g. Pilani" : "Pehle district chuno"
                }
                disabled={!district}
                className={`${inputClass} disabled:bg-stone-50 disabled:text-stone-400`}
                aria-label="City, town or locality"
              />
              {localitySuggestions.length > 0 && (
                <div className="mt-1 max-h-40 overflow-auto rounded-lg border border-stone-100 bg-white">
                  {localitySuggestions.map((l) => (
                    <button
                      key={l}
                      type="button"
                      onClick={() => setLocality(l)}
                      className="block w-full px-3 py-2 text-left text-sm text-stone-700 hover:bg-stone-100"
                    >
                      {l}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => apply(buildParts(locality, district, state))}
                disabled={busy || !(state || district || locality)}
                className="flex-1 rounded-lg bg-brand px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-dark disabled:opacity-50"
              >
                {busy ? "Setting…" : "Set This Location"}
              </button>
              <button
                type="button"
                onClick={clearLocation}
                className="rounded-lg border border-stone-200 px-3 py-2 text-xs font-medium text-stone-500 hover:bg-stone-50"
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}