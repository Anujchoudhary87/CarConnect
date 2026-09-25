import type { Metadata } from "next";
import Link from "next/link";
import { HomeHero } from "@/components/HomeHero";
import { HomeSearch } from "@/components/HomeSearch";
import { HomeSections } from "@/components/HomeSections";
import { AiAssistant } from "@/components/AiAssistant";
import { ButtonLink } from "@/components/ui";
import { APP_URL } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import type { VehicleWithInfo } from "@/lib/types";
import { sortVehicleImages } from "@/lib/poster/sort";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Find Your Next Car",
  description:
    "Real used cars from verified local dealers. Search, save, compare and get AI-powered recommendations — Car Connect.",
  alternates: { canonical: `${APP_URL}/` },
  openGraph: {
    title: "Find Your Next Car | Car Connect",
    description:
      "Real used cars from verified local dealers. Search, save, compare and get AI-powered recommendations.",
    url: `${APP_URL}/`,
    siteName: "Car Connect",
    type: "website",
    images: [{ url: `${APP_URL}/Logo.png`, alt: "Car Connect" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Find Your Next Car | Car Connect",
    description:
      "Real used cars from verified local dealers. Search, save, compare and get AI-powered recommendations.",
    images: [`${APP_URL}/Logo.png`],
  },
};

const BRAND_LOGOS: Record<string, string> = {
  "Maruti Suzuki": "/brands/maruti-suzuki.svg",
  Hyundai: "/brands/hyundai.svg",
  Tata: "/brands/tata.svg",
  Mahindra: "/brands/mahindra.svg",
  Honda: "/brands/honda.svg",
  Toyota: "/brands/toyota.svg",
  Kia: "/brands/kia.svg",
  MG: "/brands/mg.svg",
};

/** Fetch featured + recently-added vehicles and brand counts server-side. */
async function getHomeData() {
  const supabase = await createClient();

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 14); // "recent" = last 14 days

  const [featuredResult, recentResult, brandResult] = await Promise.all([
    // Featured: active, with images, sorted by newest, up to 20
    supabase
      .from("vehicles")
      .select("*, dealer:dealers(*), vehicle_images:vehicle_images(url, position, created_at)")
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(20),

    // Recently added: same pool filtered by cutoff
    supabase
      .from("vehicles")
      .select("*, dealer:dealers(*), vehicle_images:vehicle_images(url, position, created_at)")
      .eq("status", "active")
      .gte("created_at", cutoff.toISOString())
      .order("created_at", { ascending: false })
      .limit(20),

    // Brand counts
    supabase
      .from("vehicles")
      .select("brand")
      .eq("status", "active")
      .limit(1000),
  ]);

  const toVehicles = (rows: unknown[] | null): VehicleWithInfo[] =>
    (rows ?? []).map((v) => {
      const veh = v as VehicleWithInfo;
      return {
        ...veh,
        vehicle_images: sortVehicleImages(veh.vehicle_images ?? []),
        is_favorite: false,
      };
    });

  const featured = toVehicles(featuredResult.data);
  const recentRaw = toVehicles(recentResult.data);

  // If fewer than 4 recent, fill from featured to ensure carousel loops
  const recent =
    recentRaw.length >= 4
      ? recentRaw
      : featured.slice(0, Math.max(featured.length, 8));

  // Brand counts
  const counts = new Map<string, number>();
  for (const r of brandResult.data ?? [])
    counts.set(r.brand, (counts.get(r.brand) ?? 0) + 1);
  const brands = [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([brand, count]) => ({ brand, count }));

  // Which featured IDs are "new" (within cutoff)

  return { featured, recent, brands };
}

export default async function Home() {
  const { featured, recent, brands } = await getHomeData();

  return (
    <div>
      <HomeHero />

      {/* Car Search — browse/filter live inventory yourself (path 1 of 2) */}
      <div className="pt-6">
        <HomeSearch />
      </div>

      {/* Nearby Cars → Recently Viewed → Recently Added Cars */}
      <div className="mx-auto max-w-6xl px-4 pt-8 pb-2 space-y-10">
        <HomeSections
          newest={featured}
          recentlyAdded={recent}
          initialFavorites={{}}
        />
      </div>

      {/* AI Car Advisor + Car Buying Journey (path 2 of 2) */}
      <section
        id="ai-advisor"
        className="mt-10 scroll-mt-24 border-y border-stone-200 bg-stone-50/70 py-10"
      >
        <div className="mx-auto max-w-6xl px-4">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-brand">
                Full buying journey
              </p>
              <h2 className="mt-1 text-2xl font-extrabold tracking-tight text-stone-900 sm:text-3xl">
                AI Car Advisor
              </h2>
              <p className="mt-1 max-w-2xl text-sm text-stone-500">
                Requirement se lekar shortlist, compare, EMI, dealer contact aur test drive — ek hi
                flow mein, sirf real dealer inventory par.
              </p>
            </div>
            <Link
              href="/ai-advisor"
              className="inline-flex items-center gap-1 text-sm font-semibold text-brand transition-colors hover:text-brand-dark"
            >
              Full page advisor →
            </Link>
          </div>
          <AiAssistant showHeader={false} />
        </div>
      </section>

      {/* Popular brands */}
      {brands.length > 0 && (
        <section
          id="popular-brands"
          className="mx-auto max-w-6xl scroll-mt-24 px-4 py-8"
        >
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-brand">
                Inventory
              </p>
              <h2 className="mt-1 text-2xl font-extrabold tracking-tight text-stone-900 sm:text-3xl">
                Popular Brands
              </h2>
              <p className="mt-1 text-sm text-stone-500">
                Brands jo abhi live dealer inventory mein available hain.
              </p>
            </div>
            <Link
              href="/marketplace"
              className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm font-semibold text-brand transition-colors hover:text-brand-dark"
            >
              View All →
            </Link>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {brands.map((b) => {
              const logo = BRAND_LOGOS[b.brand];
              return (
                <Link
                  key={b.brand}
                  href={`/marketplace?brand=${encodeURIComponent(b.brand)}`}
                  className="group flex flex-col items-center gap-2 rounded-2xl border border-stone-200 bg-white px-4 py-5 text-center shadow-sm transition-all hover:-translate-y-0.5 hover:border-brand hover:shadow-md"
                >
                  {logo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={logo}
                      alt={`${b.brand} logo`}
                      className="h-8 w-[110px] object-contain"
                    />
                  ) : (
                    <span className="text-2xl font-extrabold tracking-tight text-stone-300">
                      {b.brand[0]}
                    </span>
                  )}
                  <p className="text-sm font-bold text-stone-800">{b.brand}</p>
                  <p className="text-xs text-stone-400">
                    {b.count} car{b.count === 1 ? "" : "s"}
                  </p>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* Sell your car */}
      <section
        id="sell-your-car"
        className="mx-auto max-w-6xl scroll-mt-24 px-4 py-8"
      >
        <div className="overflow-hidden rounded-3xl bg-stone-950">
          <div className="grid items-center gap-8 px-8 py-10 sm:px-12 lg:grid-cols-[1.2fr_1fr]">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-brand-light">
                Sell your car
              </p>
              <h2 className="mt-1 text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
                Sell Your Car
              </h2>
              <p className="mt-3 max-w-lg text-sm text-stone-300">
                Car list karo aur verified dealers se offers paao. Accept, reject
                ya compare karo — free, koi commission nahi,
                direct dealer-to-customer.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <ButtonLink href="/sell" size="lg">
                  Sell Your Car
                </ButtonLink>
                <ButtonLink
                  href="/sell/my-listings"
                  size="lg"
                  variant="outline"
                  className="border-white/30 bg-white/10 text-white hover:bg-white/20"
                >
                  My Listings
                </ButtonLink>
              </div>
            </div>
            <ul className="space-y-3 text-sm text-stone-200">
              <li className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/5 px-4 py-3">
                <span className="text-emerald-400">✓</span> 2-minute listing form
              </li>
              <li className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/5 px-4 py-3">
                <span className="text-emerald-400">✓</span> Paas ke verified dealers
                se offers
              </li>
              <li className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/5 px-4 py-3">
                <span className="text-emerald-400">✓</span> Offers ko accept, reject ya
                compare karo
              </li>
              <li className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/5 px-4 py-3">
                <span className="text-emerald-400">✓</span> Free — koi commission nahi
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* Customer demand */}
      <section
        id="customer-demand"
        className="mx-auto max-w-6xl scroll-mt-24 px-4 py-8"
      >
        <div className="grid items-center gap-8 rounded-3xl bg-brand-light p-8 sm:p-10 lg:grid-cols-2">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-brand">
              Customer demand
            </p>
            <h2 className="mt-1 text-2xl font-extrabold tracking-tight text-stone-900 sm:text-3xl">
              Apni requirement post karo
            </h2>
            <p className="mt-3 max-w-lg text-sm text-stone-600">
              Exact model abhi available nahi? Requirement save karo. Matching
              dealer stock aane par authenticated customers ko stock notification
              mil sakti hai.
            </p>
            <ul className="mt-4 space-y-2 text-sm text-stone-700">
              <li className="flex items-start gap-2">
                Brand, model, budget, fuel aur location ek requirement mein
                capture hoti hai.
              </li>
              <li className="flex items-start gap-2">
                Dealers ko sirf aggregated demand dikhta hai, personal details
                nahi.
              </li>
              <li className="flex items-start gap-2">
                Notification preference account se manage hoti hai.
              </li>
            </ul>
            <div className="mt-6 flex flex-wrap gap-3">
              <ButtonLink href="/marketplace" size="lg">
                Search &amp; Post Requirement
              </ButtonLink>
              <ButtonLink href="/account" size="lg" variant="outline">
                Manage Notifications
              </ButtonLink>
            </div>
          </div>
          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-widest text-brand">
              Notify Me
            </p>
            <h3 className="mt-1 text-xl font-extrabold text-stone-900">
              Matching stock aaye to batayein
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-stone-600">
              Marketplace ya AI Advisor mein exact match na mile to requirement
              record hoti hai. Login ke baad Notify Me enable karke stock alerts
              manage kiye ja sakte hain.
            </p>
            <Link
              href="/marketplace"
              className="mt-5 inline-flex items-center text-sm font-semibold text-brand hover:underline"
            >
              Start a search <span className="ml-1">→</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Why Car Connect */}
      <section
        id="why-car-connect"
        className="mx-auto max-w-6xl scroll-mt-24 px-4 py-10"
      >
        <div className="text-center">
          <p className="text-xs font-bold uppercase tracking-widest text-brand">
            Why Car Connect
          </p>
          <h2 className="mt-1 text-2xl font-extrabold tracking-tight text-stone-900 sm:text-3xl">
            Asli, local car buying ke liye bana
          </h2>
        </div>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            {
              icon: "🚘",
              title: "Real Local Inventory",
              text: "Active listings seedha local dealer inventory se — koi demo ya fake stock nahi.",
            },
            {
              icon: "🛡️",
              title: "Verified Dealers",
              text: "Documents approve hote hi dealers ko verified badge milta hai.",
            },
            {
              icon: "🤖",
              title: "AI Car Advisor",
              text: "Apni needs plain language mein batao, explainable recommendations lo.",
            },
            {
              icon: "⚡",
              title: "WhatsApp & Enquiry",
              text: "Ek tap mein dealers se baat karo — koi middleman nahi, hidden numbers nahi.",
            },
            {
              icon: "💾",
              title: "Save Cars",
              text: "Pasand ki cars save karo aur jab ready ho tab wapas dekho.",
            },
            {
              icon: "🛣️",
              title: "Test Drive",
              text: "Car page se hi test drive request karo, call back milta hai.",
            },
          ].map((f) => (
            <div
              key={f.title}
              className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm"
            >
              <span className="text-3xl" aria-hidden>
                {f.icon}
              </span>
              <h3 className="mt-3 font-bold text-stone-900">{f.title}</h3>
              <p className="mt-1.5 text-sm text-stone-500">{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-gradient-to-r from-stone-950 via-stone-900 to-red-950 py-12">
        <div className="mx-auto flex max-w-4xl flex-col items-center gap-5 px-4 text-center">
          <h2 className="max-w-2xl text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            Sahi car dhoondhna, ab easy hai.
          </h2>
          <p className="max-w-xl text-sm text-stone-300">
            Paas ke dealers ka real stock dekho, ya budget ke hisaab se AI
            advisor se best matches shortlist kar lo.
          </p>
          <div className="mt-2 flex flex-wrap justify-center gap-3">
            <Link
              href="/marketplace"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-brand px-8 text-base font-semibold text-white shadow-lg shadow-red-900/40 transition-colors hover:bg-brand-dark"
            >
              Browse Cars
            </Link>
            <Link
              href="/ai-advisor"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-white/30 bg-white/10 px-8 text-base font-semibold text-white backdrop-blur transition-colors hover:bg-white/20"
            >
              ✨ Ask AI Advisor
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}