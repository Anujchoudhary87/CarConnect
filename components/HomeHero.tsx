import Link from "next/link";

const HERO_IMG =
  "https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=1800&q=80";

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="size-4 sm:size-5" aria-hidden="true">
      <circle cx="10.8" cy="10.8" r="6.8" />
      <path strokeLinecap="round" d="m16 16 5 5" />
    </svg>
  );
}

function AdvisorIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="size-4 sm:size-5" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3 5 6v5c0 4.6 2.9 8 7 10 4.1-2 7-5.4 7-10V6l-7-3Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.5 12h5M12 9.5v5" />
    </svg>
  );
}

function SellIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="size-4 sm:size-5" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8V6m0 8v2m9-4A9 9 0 1 1 3 12a9 9 0 0 1 18 0Z" />
    </svg>
  );
}

export function HomeHero() {
  return (
    <section className="relative overflow-hidden bg-stone-950">
      <div
        className="hero-zoom absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url("${HERO_IMG}")` }}
        aria-hidden="true"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-stone-950/98 via-stone-950/90 to-stone-900/75" />
      <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-stone-950/80 to-transparent" />

      <div className="relative mx-auto max-w-6xl px-4 py-3 sm:py-4 lg:py-5">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-0.5 text-xs font-semibold text-white backdrop-blur">
          <span className="size-1.5 rounded-full bg-emerald-400" aria-hidden="true" />
          Car Connect · Real Dealer Inventory
        </span>

        <h1 className="mt-2 max-w-2xl text-xl font-extrabold leading-tight tracking-tight text-white sm:text-2xl lg:text-3xl">
          Apni next car dhoondhna ab aur easy hai
        </h1>
        <p className="mt-1.5 max-w-xl text-xs leading-relaxed text-stone-300 sm:text-sm">
          Do raaste chuno — khud live dealer inventory search karo, ya AI Car Advisor ko apni
          requirement bata kar shortlist pao.
        </p>

        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3 max-w-4xl">
          <Link
            href="/marketplace"
            className="group flex items-center gap-2.5 rounded-xl border border-white/15 bg-white/10 px-3 py-2 backdrop-blur transition hover:border-white/35 hover:bg-white/20"
          >
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-white text-stone-950 shadow-sm">
              <SearchIcon />
            </span>
            <div className="min-w-0 flex-1">
              <span className="block text-sm font-bold text-white">Search Cars</span>
              <span className="block truncate text-xs text-stone-300">
                Khud search &amp; filter — brand, model, budget
              </span>
            </div>
            <span className="text-sm font-semibold text-red-300 transition group-hover:translate-x-0.5 group-hover:text-red-200">
              →
            </span>
          </Link>

          <Link
            href="/ai-advisor"
            className="group flex items-center gap-2.5 rounded-xl border border-white/15 bg-white/10 px-3 py-2 backdrop-blur transition hover:border-white/35 hover:bg-white/20"
          >
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-red-500 text-white shadow-sm">
              <AdvisorIcon />
            </span>
            <div className="min-w-0 flex-1">
              <span className="block text-sm font-bold text-white">AI Car Advisor</span>
              <span className="block truncate text-xs text-stone-300">
                Apni requirement batao — AI shortlist banayega
              </span>
            </div>
            <span className="text-sm font-semibold text-red-300 transition group-hover:translate-x-0.5 group-hover:text-red-200">
              →
            </span>
          </Link>

          <Link
            href="/sell"
            className="group flex items-center gap-2.5 rounded-xl border border-white/15 bg-white/10 px-3 py-2 backdrop-blur transition hover:border-white/35 hover:bg-white/20"
          >
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-white/25 bg-white/10 text-white shadow-sm">
              <SellIcon />
            </span>
            <div className="min-w-0 flex-1">
              <span className="block text-sm font-bold text-white">Sell Your Car</span>
              <span className="block truncate text-xs text-stone-300">
                Free listing · Dealer offers
              </span>
            </div>
            <span className="text-sm font-semibold text-stone-300 transition group-hover:translate-x-0.5 group-hover:text-white">
              →
            </span>
          </Link>
        </div>
      </div>
    </section>
  );
}
