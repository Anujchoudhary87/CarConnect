import Link from "next/link";
import { HomeHero } from "@/components/HomeHero";
import { AiAssistant } from "@/components/AiAssistant";
import { HomeSearch } from "@/components/HomeSearch";
import { HomeInventory } from "@/components/HomeInventory";
import { ButtonLink } from "@/components/ui";

const STEPS = [
  {
    icon: "📝",
    title: "Apni Requirements Batayein",
    text: "Budget, fuel type, family size, usage aur location — apne shabdon mein simple describe karein.",
  },
  {
    icon: "🧠",
    title: "AI Matching Cars Dhoondhti Hai",
    text: "AI asli Car Connect inventory search karta hai — real cars, prices aur dealers database se.",
  },
  {
    icon: "🎯",
    title: "Personalized Suggestions Paayein",
    text: "Apki needs se milti hui cars dekhein — har ek fit hone ki clear wajah ke saath.",
  },
  {
    icon: "⚖️",
    title: "Compare Karo & Chuno",
    text: "2–3 cars side-by-side compare karo, phir seedhe dealer ko call ya WhatsApp karo.",
  },
];

const POPULAR_BRANDS = [
  { name: "Maruti Suzuki", logo: "/brands/maruti-suzuki.svg" },
  { name: "Hyundai", logo: "/brands/hyundai.svg" },
  { name: "Tata", logo: "/brands/tata.svg" },
  { name: "Mahindra", logo: "/brands/mahindra.svg" },
  { name: "Honda", logo: "/brands/honda.svg" },
  { name: "Toyota", logo: "/brands/toyota.svg" },
  { name: "Kia", logo: "/brands/kia.svg" },
  { name: "MG", logo: "/brands/mg.svg" },
];

const TRUST_POINTS = [
  {
    icon: "🛡️",
    title: "Verified Dealers",
    text: "Verification badges sirf tab dikhte hain jab dealer ki approval database mein store hai — koi fake claim nahi.",
  },
  {
    icon: "🤖",
    title: "AI-Powered Search",
    text: "Apni needs plain language mein batao aur live inventory se honest, explainable recommendations pao.",
  },
  {
    icon: "📍",
    title: "Local & Nearby",
    text: "Location ek baar set karo aur cars ko real distance se sort karo — 5 km se 100 km rings.",
  },
  {
    icon: "🤝",
    title: "Direct Customer↔Dealer",
    text: "Customers dealers se kharidte hain aur apni car verified dealers ko bechte hain. Koi dealer-to-dealer marketplace nahi.",
  },
];

const FAQ = [
  {
    q: "'Verified Dealer' ka matlab kya hai?",
    a: "Dealer sirf tab badge kamata hai jab wo verification documents submit karta hai jo humari team approve karti hai — database se dikhta hai, automatically nahi.",
  },
  {
    q: "AI recommendations kaise kaam karti hain?",
    a: "AI aapki requirement padhti hai — budget, fuel, year, transmission, location — aur real Car Connect inventory filter karti hai. Wo kabhi prices, KM ya features invent nahi karti; jab koi detail (jaise seating) stored nahi hai, to wo bata deti hai.",
  },
  {
    q: "Apni car kaise bechun?",
    a: "Ek baar car ke details aur photos submit karo. Paas ke verified dealers dekhte hain aur aapko offers bhejte hain — aap accept, reject ya compare karte ho.",
  },
  {
    q: "Kya ye dealer-to-dealer marketplace hai?",
    a: "Nahi. Car Connect customers ko unke aas-paas ke dealers se jodta hai. Dealer-to-dealer bidding, auctions aur dealer marketplaces product ka hissa nahi hain.",
  },
];

export default function Home() {
  return (
    <div>
      <HomeHero />
      <AiAssistant />

      {/* 4-step AI flow */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="text-center">
          <p className="text-xs font-bold uppercase tracking-wide text-brand">Kaise kaam karta hai</p>
          <h2 className="mt-1 text-2xl font-extrabold text-stone-900 sm:text-3xl">
            Car Recommendation Aapki Requirements Ke Hisaab Se
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-sm text-stone-500">
            Aapke shabdon se real cars ki shortlist tak — sirf chaar simple steps.
          </p>
        </div>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s, i) => (
            <div key={s.title} className="relative rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
              <span className="absolute -top-3 left-5 rounded-full bg-brand px-2.5 py-0.5 text-xs font-extrabold text-white">
                Step {i + 1}
              </span>
              <span className="text-3xl">{s.icon}</span>
              <h3 className="mt-3 font-bold text-stone-900">{s.title}</h3>
              <p className="mt-1.5 text-sm text-stone-500">{s.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Search & filters */}
      <section className="pb-2">
        <HomeSearch />
      </section>

      {/* Real inventory */}
      <section className="py-12">
        <HomeInventory />
      </section>

      {/* Popular brands */}
      <section className="mx-auto max-w-6xl px-4 py-12">
        <h2 className="text-xl font-extrabold text-stone-900 sm:text-2xl">Popular Brands</h2>
        <p className="mt-0.5 text-sm text-stone-500">Seedhe un cars pe jao jo aapko pasand hain.</p>
        <div className="no-scrollbar mt-4 flex gap-3 overflow-x-auto pb-1 sm:grid sm:grid-cols-4 sm:overflow-visible">
          {POPULAR_BRANDS.map((b) => (
            <Link
              key={b.name}
              href={`/marketplace?brand=${encodeURIComponent(b.name)}`}
              className="shrink-0 rounded-2xl border border-stone-200 bg-white px-6 py-5 text-center shadow-sm transition-all hover:-translate-y-0.5 hover:border-brand hover:shadow-md"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={b.logo} alt={`${b.name} logo`} className="mx-auto h-8 w-[110px] object-contain" />
              <p className="mt-2 text-sm font-bold text-stone-800">{b.name}</p>
              <p className="text-xs text-brand">Gaadiyan dekho →</p>
            </Link>
          ))}
        </div>
      </section>

      {/* AI Car Advisor CTA */}
      <section className="bg-gradient-to-r from-stone-950 via-stone-900 to-red-950 py-16">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 px-4 text-center">
          <span className="text-4xl">🤖</span>
          <h2 className="max-w-2xl text-2xl font-extrabold text-white sm:text-3xl">
            Not sure which car fits your life?
          </h2>
          <p className="max-w-xl text-sm text-stone-300">
            AI Car Advisor se poochho. Apna budget, family size aur driving habits batao — wo real
            inventory scan karta hai aur har match samjhata hai.
          </p>
          <a
            href="#ai-assistant"
            className="inline-flex h-12 items-center justify-center rounded-lg bg-brand px-8 text-base font-semibold text-white transition-colors hover:bg-red-700"
          >
            💬 AI Car Advisor se Poochho
          </a>
        </div>
      </section>

      {/* Sell Your Car CTA */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="grid items-center gap-8 rounded-3xl bg-brand-light p-8 sm:p-12 lg:grid-cols-2">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-brand">Apni gaadi becho</p>
            <h2 className="mt-1 text-2xl font-extrabold text-stone-900 sm:text-3xl">Sell Your Car</h2>
            <p className="mt-3 max-w-lg text-sm text-stone-600">
              Ek baar car ke details aur photos bharo. Paas ke <strong>verified dealers</strong> aapki
              listing dekhte hain aur offers bhejte hain — aap best chunte ho. Free, koi commission nahi,
              seedha dealer-to-customer.
            </p>
            <ul className="mt-4 space-y-2 text-sm text-stone-700">
              <li className="flex items-center gap-2">✓ 2-minute listing form</li>
              <li className="flex items-center gap-2">✓ Paas ke verified dealers se offers</li>
              <li className="flex items-center gap-2">✓ Offers accept, reject ya compare karo</li>
            </ul>
            <div className="mt-6 flex flex-wrap gap-3">
              <ButtonLink href="/sell" size="lg">
                💸 Sell Your Car
              </ButtonLink>
              <ButtonLink href="/sell/my-listings" size="lg" variant="outline">
                My Listings
              </ButtonLink>
            </div>
          </div>
          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <p className="text-sm font-semibold text-stone-900">Dealers ko kya dekhna chahiye</p>
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              {[
                "Brand & model",
                "Year & variant",
                "KM driven",
                "Fuel & owner",
                "Expected price",
                "Photos",
                "City / location",
                "Contact details",
              ].map((x) => (
                <div key={x} className="flex items-center gap-2 rounded-lg bg-stone-50 px-3 py-2 text-stone-700">
                  <span className="text-brand">•</span> {x}
                </div>
              ))}
            </div>
            <p className="mt-4 text-xs text-stone-400">
              Ye customer→dealer flow hai. Dealer-to-dealer selling Car Connect ka hissa nahi hai.
            </p>
          </div>
        </div>
      </section>

      {/* Trust / statistics */}
      <section className="mx-auto max-w-6xl px-4 pb-16">
        <div className="text-center">
          <p className="text-xs font-bold uppercase tracking-wide text-brand">Why Car Connect</p>
          <h2 className="mt-1 text-2xl font-extrabold text-stone-900 sm:text-3xl">
            Trusted, local aur transparent
          </h2>
        </div>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {TRUST_POINTS.map((t) => (
            <div key={t.title} className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
              <span className="text-3xl">{t.icon}</span>
              <h3 className="mt-3 font-bold text-stone-900">{t.title}</h3>
              <p className="mt-1.5 text-sm text-stone-500">{t.text}</p>
            </div>
          ))}
        </div>

        <div className="mt-12">
          <h2 className="text-center text-xl font-extrabold text-stone-900 sm:text-2xl">
            Aksar pooche jaane wale sawaal
          </h2>
          <div className="mx-auto mt-6 grid max-w-3xl gap-3">
            {FAQ.map((f) => (
              <details key={f.q} className="group rounded-xl border border-stone-200 bg-white px-4 py-3 shadow-sm">
                <summary className="flex cursor-pointer items-center justify-between gap-3 text-sm font-semibold text-stone-800">
                  {f.q}
                  <span className="text-stone-400 transition-transform group-open:rotate-180">▾</span>
                </summary>
                <p className="mt-2 text-sm text-stone-500">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}