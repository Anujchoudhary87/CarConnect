"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BRANDS, FUELS, TRANSMISSIONS, OWNERS, DISTANCE_OPTIONS, yearOptions } from "@/lib/constants";
import { getStoredLocation } from "@/components/location-store";

const years = yearOptions();

const PRICE_SLOTS = [
  { value: "5", label: "₹5 lakh tak" },
  { value: "8", label: "₹8 lakh tak" },
  { value: "10", label: "₹10 lakh tak" },
  { value: "15", label: "₹15 lakh tak" },
  { value: "20", label: "₹20 lakh tak" },
  { value: "30", label: "₹30 lakh tak" },
];

export function HomeSearch() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [brand, setBrand] = useState("");
  const [fuel, setFuel] = useState("");
  const [transmission, setTransmission] = useState("");
  const [maxLakh, setMaxLakh] = useState("");
  const [minYear, setMinYear] = useState("");
  const [maxKm, setMaxKm] = useState("");
  const [owner, setOwner] = useState("");
  const [radius, setRadius] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const loc = getStoredLocation();
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (brand) params.set("brand", brand);
    if (fuel) params.set("fuel", fuel);
    if (transmission) params.set("transmission", transmission);
    if (owner) params.set("owner", owner);
    if (maxLakh) params.set("max_price", String(Math.round(parseFloat(maxLakh) * 100000)));
    if (minYear) params.set("min_year", minYear);
    if (maxKm) params.set("max_km", maxKm);
    if (loc && radius) {
      params.set("lat", String(loc.lat));
      params.set("lng", String(loc.lng));
      params.set("radius_km", radius);
      params.set("sort", "distance");
    }
    router.push(`/marketplace?${params.toString()}`);
  }

  const selectClass =
    "h-11 w-full rounded-lg border border-stone-200 bg-white px-2.5 text-sm text-stone-800 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20";

  return (
    <section className="mx-auto max-w-6xl px-4">
      <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm sm:p-5">
        <form onSubmit={submit}>
          <div className="flex flex-col gap-3 lg:flex-row">
            <div className="relative flex-1">
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="🔍 Search by brand, model ya city… e.g. Swift, Jaipur, Nexon"
                className="h-11 w-full rounded-lg border border-stone-200 bg-stone-50 px-3 pl-9 text-sm text-stone-900 placeholder:text-stone-400 focus:border-brand focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand/20"
                aria-label="Search cars"
              />
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:flex">
              <select value={brand} onChange={(e) => setBrand(e.target.value)} className={selectClass} aria-label="Brand">
                <option value="">All Brands</option>
                {BRANDS.map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
              <select value={fuel} onChange={(e) => setFuel(e.target.value)} className={selectClass} aria-label="Fuel type">
                <option value="">All Fuels</option>
                {FUELS.map((f) => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
              <select value={transmission} onChange={(e) => setTransmission(e.target.value)} className={selectClass} aria-label="Transmission">
                <option value="">Any Transmission</option>
                {TRANSMISSIONS.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
              <select value={maxLakh} onChange={(e) => setMaxLakh(e.target.value)} className={selectClass} aria-label="Max price">
                <option value="">Any Price</option>
                {PRICE_SLOTS.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
              <select value={minYear} onChange={(e) => setMinYear(e.target.value)} className={selectClass} aria-label="Minimum year">
                <option value="">Any Year</option>
                {years.map((y) => (
                  <option key={y} value={y}>{y}+</option>
                ))}
              </select>
              <select value={maxKm} onChange={(e) => setMaxKm(e.target.value)} className={selectClass} aria-label="Maximum km">
                <option value="">Any KM</option>
                <option value="30000">30,000 km tak</option>
                <option value="50000">50,000 km tak</option>
                <option value="100000">1,00,000 km tak</option>
                <option value="150000">1,50,000 km tak</option>
              </select>
              <select value={owner} onChange={(e) => setOwner(e.target.value)} className={selectClass} aria-label="Ownership">
                <option value="">Any Owner</option>
                {OWNERS.map((o) => (
                  <option key={o} value={o}>{o} Owner</option>
                ))}
              </select>
              <select value={radius} onChange={(e) => setRadius(e.target.value)} className={selectClass} aria-label="Distance radius">
                <option value="">All India</option>
                {DISTANCE_OPTIONS.map((d) => (
                  <option key={d.value} value={d.value}>{d.label} ke andar</option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              className="h-11 shrink-0 rounded-lg bg-brand px-6 text-sm font-semibold text-white transition-colors hover:bg-brand-dark"
            >
              Search
            </button>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-stone-400">
            <p>
              {radius ? "Distance searches header mein set ki gayi location use karte hain." : "Set your location from the header to enable 'Cars Near You' filters."}
            </p>
            <button
              type="button"
              onClick={() => router.push("/marketplace")}
              className="font-semibold text-brand hover:underline"
            >
              All Cars & More Filters →
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}