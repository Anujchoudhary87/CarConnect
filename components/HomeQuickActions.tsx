import Link from "next/link";

const ACTIONS = [
  { href: "/marketplace", icon: "🚗", title: "Find Cars", sub: "Browse & filter" },
  { href: "/ai-advisor", icon: "✨", title: "AI Advisor", sub: "Find your car" },
  { href: "/emi-calculator", icon: "💰", title: "EMI Calculator", sub: "Check EMI easily" },
  { href: "/sell", icon: "🏷️", title: "Sell Your Car", sub: "Get best value" },
];

export function HomeQuickActions() {
  return (
    <section aria-label="Quick actions" className="mx-auto max-w-6xl px-4 pt-3">
      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4 lg:gap-3">
        {ACTIONS.map((a) => (
          <Link
            key={a.href}
            href={a.href}
            className="flex items-center gap-2.5 rounded-2xl border border-stone-200 bg-white px-3 py-2.5 shadow-sm transition hover:border-brand/40 hover:shadow-md active:scale-[0.99] lg:flex-col lg:items-start lg:gap-1.5 lg:px-4 lg:py-4"
          >
            <span
              aria-hidden
              className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand-light text-base"
            >
              {a.icon}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-bold leading-tight text-stone-900">
                {a.title}
              </span>
              <span className="mt-0.5 block truncate text-[11px] leading-tight text-stone-500">
                {a.sub}
              </span>
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
