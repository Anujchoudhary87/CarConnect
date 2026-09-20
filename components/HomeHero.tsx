import Link from "next/link";

const HERO_IMG =
  "https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=1800&q=80";

const TRUST = [
  { icon: "✓", label: "Verified Dealers" },
  { icon: "🔎", label: "Wide Selection" },
  { icon: "✨", label: "AI Recommendations" },
  { icon: "📍", label: "Local Cars" },
];

export function HomeHero() {
  return (
    <section className="relative overflow-hidden bg-stone-900">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={HERO_IMG}
        alt=""
        aria-hidden
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-stone-950/95 via-stone-900/80 to-stone-900/40" />
      <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-stone-950/80 to-transparent" />

      <div className="relative mx-auto max-w-6xl px-4 py-20 sm:py-28 lg:py-32">
        <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold text-white backdrop-blur">
          🚘 India&apos;s AI-powered used-car marketplace
        </span>

        <h1 className="mt-5 max-w-2xl text-4xl font-extrabold leading-tight tracking-tight text-white sm:text-6xl">
          Better Cars.
          <br />
          <span className="bg-gradient-to-r from-red-400 to-red-600 bg-clip-text text-transparent">
            Brighter Journeys.
          </span>
        </h1>

        <p className="mt-4 max-w-xl text-lg text-stone-200">
          Find verified used cars from trusted local dealers. Smarter search. Better deals. All in one
          place.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/marketplace"
            className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-brand px-6 text-base font-semibold text-white shadow-lg shadow-red-900/30 transition-colors hover:bg-brand-dark"
          >
            🔍 Search Cars
          </Link>
          <Link
            href="/sell"
            className="inline-flex h-12 items-center justify-center gap-2 rounded-lg border border-white/30 bg-white/10 px-6 text-base font-semibold text-white backdrop-blur transition-colors hover:bg-white/20"
          >
            💸 Sell Your Car
          </Link>
        </div>

        <div className="mt-10 grid max-w-2xl grid-cols-2 gap-3 sm:grid-cols-4">
          {TRUST.map((t) => (
            <div
              key={t.label}
              className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm font-medium text-white backdrop-blur"
            >
              <span aria-hidden>{t.icon}</span>
              <span>{t.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}