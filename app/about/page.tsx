import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "About" };

const pillars = [
  {
    icon: "🛡️",
    title: "Verified local dealers",
    text: "Dealers submit their business details and documents; our team approves them before they get the Verified badge. No verification detail, no badge — it all comes from the database.",
  },
  {
    icon: "🤖",
    title: "AI that explains itself",
    text: "The AI Car Advisor matches your requirements against the real inventory and tells you why each car fits. It never invents prices, KM, features or availability.",
  },
  {
    icon: "📍",
    title: "Built around your location",
    text: "Set your city once and we surface the cars and dealers closest to you — sorted by real distance.",
  },
  {
    icon: "🤝",
    title: "Customer ↔ Dealer, nothing else",
    text: "Buyers connect with dealers. Sellers list their car and get offers from nearby verified dealers. There is no dealer-to-dealer marketplace on Car Connect.",
  },
];

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <p className="text-xs font-bold uppercase tracking-wide text-brand">About Car Connect</p>
      <h1 className="mt-1 text-3xl font-extrabold text-stone-900 sm:text-4xl">
        Drive Your Next Story
      </h1>
      <p className="mt-4 max-w-2xl text-stone-600">
        Car Connect is an AI-powered used-car marketplace built for India. We connect everyday buyers
        with trusted local dealers, and help customers sell their own car to nearby verified dealers —
        simple, transparent and without any dealer-to-dealer clutter.
      </p>

      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        {pillars.map((p) => (
          <div key={p.title} className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
            <span className="text-3xl">{p.icon}</span>
            <h2 className="mt-3 text-lg font-bold text-stone-900">{p.title}</h2>
            <p className="mt-1.5 text-sm text-stone-500">{p.text}</p>
          </div>
        ))}
      </div>

      <div className="mt-10 rounded-2xl bg-brand-light p-8 text-center">
        <h2 className="text-xl font-extrabold text-stone-900">Ready to find your next car?</h2>
        <div className="mt-4 flex flex-wrap justify-center gap-3">
          <Link
            href="/marketplace"
            className="inline-flex h-11 items-center justify-center rounded-lg bg-brand px-6 text-sm font-semibold text-white transition-colors hover:bg-brand-dark"
          >
            Search Cars
          </Link>
          <Link
            href="/sell"
            className="inline-flex h-11 items-center justify-center rounded-lg border border-stone-300 bg-white px-6 text-sm font-semibold text-stone-800 transition-colors hover:bg-stone-50"
          >
            Sell Your Car
          </Link>
        </div>
      </div>
    </div>
  );
}