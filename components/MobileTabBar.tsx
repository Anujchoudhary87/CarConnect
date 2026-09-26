"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUser } from "@/lib/use-user";
import { cn } from "@/components/ui";

// Mobile-only primary navigation. Home / Find Cars / AI Advisor / Sell Car /
// Profile — EMI and Saved Cars deliberately stay out (they live in the homepage
// quick actions and the header heart respectively).
const TABS = [
  { href: "/", label: "Home", icon: "🏠", exact: true },
  { href: "/marketplace", label: "Find Cars", icon: "🔍", exact: false },
  { href: "/ai-advisor", label: "AI Advisor", icon: "✨", exact: false },
  { href: "/sell", label: "Sell Car", icon: "🏷️", exact: false },
];

export function MobileTabBar() {
  const pathname = usePathname();
  const { user } = useUser();

  const tabs = [...TABS, { href: user ? "/account" : "/auth/login", label: "Profile", icon: "👤", exact: false }];

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-stone-200 bg-white/95 backdrop-blur lg:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="mx-auto grid max-w-md grid-cols-5">
        {tabs.map((tab) => {
          const active = tab.exact ? pathname === tab.href : pathname.startsWith(tab.href);
          return (
            <Link
              key={tab.label}
              href={tab.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex flex-col items-center gap-0.5 py-1.5 text-[10px] font-semibold transition-colors",
                active ? "text-brand" : "text-stone-500 active:text-stone-700",
              )}
            >
              <span
                aria-hidden
                className={cn(
                  "flex h-7 w-12 items-center justify-center rounded-full text-base leading-none transition-colors",
                  active && "bg-brand-light",
                )}
              >
                {tab.icon}
              </span>
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
