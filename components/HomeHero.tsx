"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const HERO_IMG =
  "https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=1800&q=80";

function SearchIcon({ className = "size-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden="true">
      <circle cx="10.8" cy="10.8" r="6.8" />
      <path strokeLinecap="round" d="m16 16 5 5" />
    </svg>
  );
}

export function HomeHero() {
  const router = useRouter();
  const [q, setQ] = useState("");

  // Reuses the existing marketplace search (?q=) — no new search logic.
  function submit(e: React.FormEvent) {
    e.preventDefault();
    const term = q.trim();
    router.push(term ? `/marketplace?q=${encodeURIComponent(term)}` : "/marketplace");
  }

  return (
    <section className="relative overflow-hidden bg-stone-950 pb-4 lg:pb-8">
      <div
        className="hero-zoom absolute inset-0 bg-cover bg-[position:72%_center] sm:bg-center"
        style={{ backgroundImage: `url("${HERO_IMG}")` }}
        aria-hidden="true"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-stone-950 via-stone-950/92 to-stone-950/55" />
      <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-stone-950 to-transparent" />

      <div className="relative mx-auto max-w-6xl px-4 pb-12 pt-3 lg:pb-24 lg:pt-10">
        <div className="flex items-center gap-2 lg:hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/Logo.png" alt="Car Connect" className="h-6 w-auto object-contain" />
          <span className="text-sm font-extrabold tracking-tight text-white">
            Car <span className="text-brand">Connect</span>
          </span>
        </div>

        <span className="mt-2 hidden w-fit items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-0.5 text-xs font-semibold text-white backdrop-blur lg:inline-flex">
          <span className="size-1.5 rounded-full bg-emerald-400" aria-hidden="true" />
          Car Connect · Real Dealer Inventory
        </span>

        <h1 className="mt-1.5 max-w-md text-[26px] font-extrabold leading-[1.1] tracking-tight text-white lg:mt-3 lg:max-w-2xl lg:text-4xl">
          Find your next car
        </h1>
        <p className="mt-1 max-w-sm text-xs font-medium text-stone-300 sm:text-sm lg:mt-2 lg:max-w-xl lg:text-base">
          Verified dealers. Real cars. Best deals.
        </p>
        <p className="mt-2 hidden max-w-xl text-sm text-stone-400 lg:block">
          Real dealer inventory mein search karo ya AI Advisor se apne liye suitable
          car choose karo.
        </p>
      </div>

      {/* Search sits on the hero edge so it stays the primary mobile action. */}
      <div className="relative mx-auto -mt-9 max-w-6xl px-4 lg:-mt-16">
        <form
          onSubmit={submit}
          role="search"
          className="flex items-center gap-1.5 rounded-2xl border border-stone-200 bg-white p-1.5 shadow-lg shadow-stone-950/30"
        >
          <span className="pl-2 text-stone-400">
            <SearchIcon className="size-[18px]" />
          </span>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search brand, model or car"
            aria-label="Search brand, model or car"
            enterKeyHint="search"
            className="h-10 min-w-0 flex-1 bg-transparent text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none"
          />
          <button
            type="submit"
            className="flex h-10 shrink-0 items-center gap-1.5 rounded-xl bg-brand px-3.5 text-sm font-bold text-white transition-colors hover:bg-brand-dark lg:px-5"
          >
            <SearchIcon className="size-4 lg:hidden" />
            <span>Search</span>
          </button>
        </form>
      </div>
    </section>
  );
}
