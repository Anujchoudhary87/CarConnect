"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/components/ui";

const links = [
  { href: "/dealer", label: "Dashboard", emoji: "📊", exact: true },
  { href: "/dealer/cars/new", label: "+ Add Car", emoji: "🚗", activePrefix: "/dealer/cars/new" },
  { href: "/dealer/cars", label: "Meri Gaadiyaan", emoji: "🗂️", activePrefix: "/dealer/cars" },
  { href: "/dealer/enquiries", label: "Customer Enquiries", emoji: "💬", activePrefix: "/dealer/enquiries" },
  { href: "/dealer/sell-requests", label: "Customer Sell Requests", emoji: "💰", activePrefix: "/dealer/sell-requests" },
  { href: "/dealer/offers", label: "Mere Offers", emoji: "💰", activePrefix: "/dealer/offers" },
  { href: "/dealer/demand", label: "Customer Demand", emoji: "🔥", activePrefix: "/dealer/demand" },
  { href: "/dealer/profile", label: "Mera Profile", emoji: "🏪", activePrefix: "/dealer/profile" },
];

export function DealerNav() {
  const pathname = usePathname();

  return (
    <nav className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-2 lg:mx-0 lg:flex-col lg:px-0 lg:pb-0">
      {links.map((l) => {
        const active = l.exact
          ? pathname === l.href
          : pathname.startsWith(l.activePrefix ?? l.href);
        return (
          <Link
            key={l.href}
            href={l.href}
            className={cn(
              "flex shrink-0 items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-brand text-white"
                : "text-stone-600 hover:bg-stone-100",
            )}
          >
            <span aria-hidden>{l.emoji}</span>
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}