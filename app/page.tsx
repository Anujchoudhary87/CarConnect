import Link from "next/link";
import { HomeHero } from "@/components/HomeHero";
import { AiAssistant } from "@/components/AiAssistant";
import { HomeSearch } from "@/components/HomeSearch";
import { HomeInventory } from "@/components/HomeInventory";
import { ButtonLink } from "@/components/ui";

const STEPS = [
  {
    icon: "📝",
    title: "Tell Us Your Requirements",
    text: "Budget, fuel type, family size, usage and location — simply describe it in your own words.",
  },
  {
    icon: "🧠",
    title: "AI Finds Matching Cars",
    text: "The AI searches the real Car Connect inventory — actual cars, prices and dealers from our database.",
  },
  {
    icon: "🎯",
    title: "Get Personalized Suggestions",
    text: "See cars that match your needs with a clear explanation of WHY each one fits.",
  },
  {
    icon: "⚖️",
    title: "Compare & Choose",
    text: "Compare 2–3 cars side by side, then call or WhatsApp the dealer directly.",
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
    text: "Verification badges are shown only when a dealer's approval is stored in the database — no fake claims.",
  },
  {
    icon: "🤖",
    title: "AI-Powered Search",
    text: "Describe your needs in plain language and get honest, explainable recommendations from live inventory.",
  },
  {
    icon: "📍",
    title: "Local & Nearby",
    text: "Set your location once and sort cars by real distance — 5 km to 100 km rings.",
  },
  {
    icon: "🤝",
    title: "Direct Customer↔Dealer",
    text: "Customers buy from dealers and sell their own car to verified dealers. No dealer-to-dealer marketplace.",
  },
];

const FAQ = [
  {
    q: "What does 'Verified Dealer' mean?",
    a: "A dealer earns the badge only after submitting verification documents that our team approves — shown from the database, not automatically.",
  },
  {
    q: "How do AI recommendations work?",
    a: "The AI reads your requirement — budget, fuel, year, transmission, location — and filters the real Car Connect inventory. It never invents prices, KM or features; when a detail (like seating) isn't stored, it says so.",
  },
  {
    q: "How do I sell my car?",
    a: "Submit your car details and photos once. Nearby verified dealers see it and send you offers — you accept, reject or compare them.",
  },
  {
    q: "Is this a dealer-to-dealer marketplace?",
    a: "No. Car Connect connects customers with the dealers around them. Dealer-to-dealer bidding, auctions and dealer marketplaces are not part of the product.",
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
          <p className="text-xs font-bold uppercase tracking-wide text-brand">How it works</p>
          <h2 className="mt-1 text-2xl font-extrabold text-stone-900 sm:text-3xl">
            Car Recommendation According to Your Requirements
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-sm text-stone-500">
            From your words to a shortlist of real cars in four simple steps.
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
        <p className="mt-0.5 text-sm text-stone-500">Jump straight to the cars you love.</p>
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
              <p className="text-xs text-brand">Browse cars →</p>
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
            Ask the AI Car Advisor. Tell it your budget, family size and driving habits — it scans the
            real inventory and explains each match.
          </p>
          <a
            href="#ai-assistant"
            className="inline-flex h-12 items-center justify-center rounded-lg bg-brand px-8 text-base font-semibold text-white transition-colors hover:bg-red-700"
          >
            💬 Ask the AI Car Advisor
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
              Fill in your car details and photos once. Nearby <strong>verified dealers</strong> see
              your listing and send you offers — you pick the best one. Free, no commission, direct
              dealer-to-customer.
            </p>
            <ul className="mt-4 space-y-2 text-sm text-stone-700">
              <li className="flex items-center gap-2">✓ 2-minute listing form</li>
              <li className="flex items-center gap-2">✓ Offers from nearby verified dealers</li>
              <li className="flex items-center gap-2">✓ Accept, reject or compare offers</li>
            </ul>
            <div className="mt-6 flex flex-wrap gap-3">
              <ButtonLink href="/sell" size="lg">
                💸 Sell Your Car Now
              </ButtonLink>
              <ButtonLink href="/sell/my-listings" size="lg" variant="outline">
                My sell listings
              </ButtonLink>
            </div>
          </div>
          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <p className="text-sm font-semibold text-stone-900">What dealers need to see</p>
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
              This is a customer→dealer flow. Dealer-to-dealer selling is not part of Car Connect.
            </p>
          </div>
        </div>
      </section>

      {/* Trust / statistics */}
      <section className="mx-auto max-w-6xl px-4 pb-16">
        <div className="text-center">
          <p className="text-xs font-bold uppercase tracking-wide text-brand">Why Car Connect</p>
          <h2 className="mt-1 text-2xl font-extrabold text-stone-900 sm:text-3xl">
            Trusted, local and transparent
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
            Common questions
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