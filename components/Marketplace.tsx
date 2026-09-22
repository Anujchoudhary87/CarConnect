"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { VehicleWithInfo } from "@/lib/types";
import { CarCard } from "@/components/CarCard";
import { Button, Input, Select, Spinner } from "@/components/ui";
import { BRANDS, FUELS, TRANSMISSIONS, OWNERS, DISTANCE_OPTIONS, yearOptions } from "@/lib/constants";
import { cn } from "@/components/ui";
import { getStoredLocation, LOCATION_EVENT, locateFromBrowser } from "@/components/location-store";
import { parseBrandModel, recordDemand } from "@/lib/demand";

const MAX_KM_OPTIONS = [
  { value: "", label: "Any KM" },
  { value: "30000", label: "30,000 km tak" },
  { value: "50000", label: "50,000 km tak" },
  { value: "100000", label: "1,00,000 km tak" },
  { value: "150000", label: "1,50,000 km tak" },
  { value: "200000", label: "2,00,000 km tak" },
];

const years = yearOptions();

export function Marketplace({ initial }: { initial?: Record<string, string> }) {
  const [q, setQ] = useState(initial?.q ?? "");
  const [brand, setBrand] = useState(initial?.brand ?? "");
  const [fuel, setFuel] = useState(initial?.fuel ?? "");
  const [transmission, setTransmission] = useState(initial?.transmission ?? "");
  const [owner, setOwner] = useState(initial?.owner ?? "");
  const [minLakh, setMinLakh] = useState(
    initial?.min_price ? String(parseFloat(initial.min_price) / 100000) : "",
  );
  const [maxLakh, setMaxLakh] = useState(
    initial?.max_price ? String(parseFloat(initial.max_price) / 100000) : "",
  );
  const [minYear, setMinYear] = useState(initial?.min_year ?? "");
  const [maxYear, setMaxYear] = useState(initial?.max_year ?? "");
  const [maxKm, setMaxKm] = useState(initial?.max_km ?? "");
  const [radius, setRadius] = useState(initial?.radius_km ?? "");
  const [sort, setSort] = useState(initial?.sort ?? "distance");
  const [loc, setLoc] = useState<{ lat: number; lng: number; label: string } | null>(() =>
    initial?.lat && initial?.lng
      ? { lat: parseFloat(initial.lat), lng: parseFloat(initial.lng), label: "Your search location" }
      : getStoredLocation(),
  );
  const [locating, setLocating] = useState(false);

  const [vehicles, setVehicles] = useState<VehicleWithInfo[]>([]);
  const [brands, setBrands] = useState<string[]>(BRANDS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const buildUrl = useCallback(() => {
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (brand) params.set("brand", brand);
    if (fuel) params.set("fuel", fuel);
    if (transmission) params.set("transmission", transmission);
    if (owner) params.set("owner", owner);
    if (minLakh) params.set("min_price", String(Math.round(parseFloat(minLakh) * 100000)));
    if (maxLakh) params.set("max_price", String(Math.round(parseFloat(maxLakh) * 100000)));
    if (minYear) params.set("min_year", minYear);
    if (maxYear) params.set("max_year", maxYear);
    if (maxKm) params.set("max_km", maxKm);
    if (loc) {
      params.set("lat", String(loc.lat));
      params.set("lng", String(loc.lng));
      if (radius) params.set("radius_km", radius);
    }
    params.set("sort", sort);
    return params.toString();
  }, [q, brand, fuel, transmission, owner, minLakh, maxLakh, minYear, maxYear, maxKm, loc, radius, sort]);

  const getLocation = useCallback(() => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude, label: "My location" });
        setLocating(false);
      },
      () => setLocating(false),
      { timeout: 8000 },
    );
  }, []);

  // Try to get location once on load (use the header location if the user set it).
  const locRef = useRef(loc?.label ?? "");
  useEffect(() => {
    locRef.current = loc?.label ?? "";
    if (!loc) {
      (async () => {
        const located = await locateFromBrowser();
        if (located) setLoc(located);
      })();
    }

    const onLoc = (e: Event) => {
      const d = (e as CustomEvent<{ lat: number; lng: number; label: string }>).detail;
      if (d && typeof d.lat === "number" && typeof d.lng === "number") setLoc(d);
    };
    window.addEventListener(LOCATION_EVENT, onLoc);
    return () => window.removeEventListener(LOCATION_EVENT, onLoc);
  }, [loc]);

  // Debounced fetch.
  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(`/api/marketplace?${buildUrl()}`);
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) throw new Error(data.error ?? "Cars load nahi hui");
        const fresh = data.vehicles ?? [];
        setVehicles(fresh);
        if (Array.isArray(data.brands) && data.brands.length > 0) setBrands(data.brands);

        // Record anonymous demand when a brand-specific search returns nothing.
        if (fresh.length === 0) {
          const params = new URLSearchParams(buildUrl());
          const num = (k: string) => {
            const v = params.get(k);
            return v ? parseFloat(v) : null;
          };
          const int = (k: string) => {
            const v = params.get(k);
            return v ? parseInt(v, 10) : null;
          };
          const qRaw = params.get("q") ?? "";
          const { brand: qBrand, model: qModel } = parseBrandModel(qRaw);
          const effBrand = qBrand || (params.get("brand") ?? "");
          if (effBrand) {
            const label = locRef.current;
            const cityLabel =
              label && label !== "My location" && label !== "Your search location" ? label : "";
            void recordDemand({
              source: "marketplace",
              rawRequirement: `${qRaw} ${effBrand}`.trim(),
              brand: effBrand,
              model: qModel || "",
              fuel: params.get("fuel") ?? "",
              transmission: params.get("transmission") ?? "",
              minYear: int("min_year"),
              maxPrice: num("max_price"),
              minPrice: num("min_price"),
              city: cityLabel,
              lat: num("lat"),
              lng: num("lng"),
              radiusKm: int("radius_km"),
              status: "unmet",
            });
          }
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Cars load nahi hui");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [buildUrl]);

  function updateFavorite(car: VehicleWithInfo, favorite: boolean) {
    setVehicles((prev) => prev.map((v) => (v.id === car.id ? { ...v, is_favorite: favorite } : v)));
  }

  const hasFilters = q || brand || fuel || transmission || owner || minLakh || maxLakh || minYear || maxYear || maxKm;

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="🔍 Search brand, model or city... (e.g. Swift, Jaipur)"
              className="pl-8 h-12"
            />
          </div>
          <Button onClick={getLocation} loading={locating} variant={loc ? "outline" : "secondary"} className="h-12">
            📍 {loc ? "Location set hai" : "Meri location use karo"}
          </Button>
        </div>

        <details className="group rounded-xl border border-stone-200 bg-white shadow-sm">
          <summary className="flex cursor-pointer items-center justify-between px-4 py-3 text-sm font-semibold text-stone-800">
            <span>
              Filters{" "}
              {hasFilters && (
                <span className="ml-1 rounded-full bg-brand px-2 py-0.5 text-xs font-bold text-white">ON</span>
              )}
            </span>
            <span className="text-stone-400 transition-transform group-open:rotate-180">▾</span>
          </summary>
          <div className="grid gap-3 border-t border-stone-100 px-4 py-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-stone-500">Brand</label>
              <Select value={brand} onChange={(e) => setBrand(e.target.value)}>
                <option value="">All Brands</option>
                {brands.map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-stone-500">Fuel</label>
              <Select value={fuel} onChange={(e) => setFuel(e.target.value)}>
                <option value="">All Fuels</option>
                {FUELS.map((f) => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-stone-500">Transmission</label>
              <Select value={transmission} onChange={(e) => setTransmission(e.target.value)}>
                <option value="">Any</option>
                {TRANSMISSIONS.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-stone-500">Owner</label>
              <Select value={owner} onChange={(e) => setOwner(e.target.value)}>
                <option value="">Any</option>
                {OWNERS.map((o) => (
                  <option key={o} value={o}>{o} Owner</option>
                ))}
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-stone-500">Odometer (KM)</label>
              <Select value={maxKm} onChange={(e) => setMaxKm(e.target.value)}>
                {MAX_KM_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-stone-500">Year From</label>
              <Select value={minYear} onChange={(e) => setMinYear(e.target.value)}>
                <option value="">Any Year</option>
                {years.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-stone-500">Year To</label>
              <Select value={maxYear} onChange={(e) => setMaxYear(e.target.value)}>
                <option value="">Any Year</option>
                {years.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-stone-500">Min Price (₹ Lakh)</label>
              <Input type="number" min={0} step={0.5} value={minLakh} onChange={(e) => setMinLakh(e.target.value)} placeholder="e.g. 3" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-stone-500">Max Price (₹ Lakh)</label>
              <Input type="number" min={0} step={0.5} value={maxLakh} onChange={(e) => setMaxLakh(e.target.value)} placeholder="e.g. 8" />
            </div>
            {loc && (
              <div>
                <label className="mb-1 block text-xs font-medium text-stone-500">Radius (from my location)</label>
                <Select value={radius} onChange={(e) => setRadius(e.target.value)}>
                  <option value="">All India</option>
                  {DISTANCE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </Select>
              </div>
            )}
          </div>
        </details>

        <div className="flex items-center justify-between">
          <p className="text-sm text-stone-500">
            {loading ? "Cars load ho rahi hain…" : `${vehicles.length} cars${loc ? " sorted by distance" : ""}`}
          </p>
          <Select value={sort} onChange={(e) => setSort(e.target.value)} className="w-40">
            <option value="distance">Nearest First</option>
            <option value="newest">Newest First</option>
            <option value="price_asc">Price: Low to High</option>
            <option value="price_desc">Price: High to Low</option>
          </Select>
        </div>
      </div>

      <div className="mt-5">
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
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
        ) : vehicles.length === 0 ? (
          <div className="flex flex-col items-center rounded-xl border border-dashed border-stone-300 bg-white px-6 py-14 text-center">
            <span className="text-4xl">🛻</span>
            <h3 className="mt-3 font-semibold text-stone-900">Koi gaadi nahi mili</h3>
            <p className="mt-1 max-w-sm text-sm text-stone-500">
              Try karo: filters hatao, radius badhao, ya location on karo. Naye listings roz aati hain.
            </p>
            <Button variant="outline" className="mt-4" onClick={() => {
              setQ(""); setBrand(""); setFuel(""); setTransmission(""); setMinLakh(""); setMaxLakh(""); setMinYear(""); setMaxYear(""); setMaxKm(""); setRadius("");
            }}>
              Clear All Filters
            </Button>
          </div>
        ) : (
          <div className={cn("grid gap-4 sm:grid-cols-2 lg:grid-cols-3")}>
            {vehicles.map((car) => (
              <CarCard key={car.id} car={car} onToggleFavorite={updateFavorite} />
            ))}
          </div>
        )}
      </div>

      {loading && (
        <p className="mt-6 text-center"><Spinner label="Cars dhoond rahe hain…" /></p>
      )}
    </div>
  );
}