import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "About" };

const pillars = [
  {
    icon: "🛡️",
    title: "Verified local dealers",
    text: "Dealers apne business details aur documents submit karte hain; humari team approve karne ke baad hi Verified badge milta hai. Verification ka detail nahi, badge nahi — sab database se aata hai.",
  },
  {
    icon: "🤖",
    title: "AI jo khud explain karti hai",
    text: "AI Car Advisor aapki requirements ko asli inventory se match karta hai aur batata hai ki har car kyun fit hai. Wo kabhi prices, KM, features ya availability invent nahi karta.",
  },
  {
    icon: "📍",
    title: "Aapki location ke around built",
    text: "City ek baar set karo aur hum aapke sabse paas wali cars aur dealers dikhate hain — asli distance se sorted.",
  },
  {
    icon: "🤝",
    title: "Customer ↔ Dealer, aur kuch nahi",
    text: "Buyers dealers se judte hain. Sellers apni car list karte hain aur paas ke verified dealers se offers paate hain. Car Connect pe koi dealer-to-dealer marketplace nahi.",
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
        Car Connect India ke liye bana ek AI-powered used-car marketplace hai. Hum everyday buyers ko
        trusted local dealers se jodte hain, aur customers apni car paas ke verified dealers ko bechte
        hain — simple, transparent, aur kisi dealer-to-dealer clutter ke bina.
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
        <h2 className="text-xl font-extrabold text-stone-900">Apni agli car dhoondhne ke liye taiyar?</h2>
        <div className="mt-4 flex flex-wrap justify-center gap-3">
          <Link
            href="/marketplace"
            className="inline-flex h-11 items-center justify-center rounded-lg bg-brand px-6 text-sm font-semibold text-white transition-colors hover:bg-brand-dark"
          >
            Cars Dhoondho
          </Link>
          <Link
            href="/sell"
            className="inline-flex h-11 items-center justify-center rounded-lg border border-stone-300 bg-white px-6 text-sm font-semibold text-stone-800 transition-colors hover:bg-stone-50"
          >
            Apni Car Becho
          </Link>
        </div>
      </div>
    </div>
  );
}