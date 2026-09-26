"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { useUser } from "@/lib/use-user";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/components/ui";
import { LocationSelector } from "@/components/LocationSelector";
import { NotificationBell } from "@/components/NotificationBell";

const NAV_LINKS = [
  { href: "/", label: "Home", exact: true },
  { href: "/marketplace", label: "Find Cars" },
  { href: "/ai-advisor", label: "AI Car Advisor" },
  { href: "/sell", label: "Sell Your Car" },
  { href: "/emi-calculator", label: "EMI Calculator" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

/** Account dropdown — shared by the desktop header cluster and the mobile avatar. */
function UserMenu({
  user,
  pathname,
  onLogout,
  showEmail,
}: {
  user: User;
  pathname: string;
  onLogout: () => void;
  showEmail: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Account menu"
        aria-expanded={open}
        className={cn(
          "flex items-center rounded-full border border-stone-200 bg-white transition-colors hover:bg-stone-50",
          showEmail ? "gap-2 py-1 pl-1 pr-3" : "size-9 justify-center",
        )}
      >
        <span
          className={cn(
            "flex items-center justify-center rounded-full bg-brand font-bold text-white",
            showEmail ? "size-8 text-sm" : "size-7 text-xs",
          )}
        >
          {user.email?.[0]?.toUpperCase() ?? "U"}
        </span>
        {showEmail && (
          <span className="text-sm font-semibold text-stone-800">
            {user.email?.split("@")[0]}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-56 overflow-hidden rounded-xl border border-stone-200 bg-white shadow-lg">
          <Link href="/account" onClick={() => setOpen(false)} className="block px-4 py-2.5 text-sm text-stone-700 hover:bg-stone-50">
            My Account
          </Link>
          <Link href="/dealer" onClick={() => setOpen(false)} className="block px-4 py-2.5 text-sm text-stone-700 hover:bg-stone-50">
            Dealer Panel
          </Link>
          <Link href="/favorites" onClick={() => setOpen(false)} className="block px-4 py-2.5 text-sm text-stone-700 hover:bg-stone-50">
            Saved Cars
          </Link>
          <Link href="/sell" onClick={() => setOpen(false)} className="block px-4 py-2.5 text-sm text-stone-700 hover:bg-stone-50">
            Sell Your Car
          </Link>
          {pathname.startsWith("/admin") && (
            <Link href="/admin" onClick={() => setOpen(false)} className="block px-4 py-2.5 text-sm text-stone-700 hover:bg-stone-50">
              Admin Panel
            </Link>
          )}
          <button
            onClick={() => {
              setOpen(false);
              onLogout();
            }}
            className="block w-full border-t border-stone-100 px-4 py-2.5 text-left text-sm font-medium text-red-600 hover:bg-red-50"
          >
            Logout
          </button>
        </div>
      )}
    </div>
  );
}

export function Header() {
  const { user } = useUser();
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  async function logout() {
    setMenuOpen(false);
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
    } catch {}
    router.push("/");
    router.refresh();
  }

  const navLink = (href: string, label: string, exact = false) => {
    const active = exact ? pathname === href : pathname.startsWith(href);
    return (
      <Link
        key={href}
        href={href}
        className={cn(
          "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
          active ? "bg-brand-light text-brand-dark" : "text-stone-700 hover:bg-stone-100",
        )}
      >
        {label}
      </Link>
    );
  };

  return (
    <header className="sticky top-0 z-40 border-b border-stone-200 bg-white/95 backdrop-blur">
      {/* Mobile: location on the left, bell + saved cars + avatar + menu on the right */}
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-1.5 px-3 lg:hidden">
        <div className="min-w-0 flex-1 sm:max-w-[260px]">
          <LocationSelector compact />
        </div>
        <div className="ml-auto flex shrink-0 items-center gap-1.5">
          <NotificationBell />
          <Link
            href="/favorites"
            aria-label="Saved Cars"
            className="flex size-9 items-center justify-center rounded-full border border-stone-200 bg-white text-stone-600 transition-colors hover:bg-stone-50"
          >
            <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 8.5c0 3.5-4.5 7-9 10.5-4.5-3.5-9-7-9-10.5A4.6 4.6 0 017.5 4c1.5 0 3 .7 4 2 .9-1.3 2.4-2 4-2a4.6 4.6 0 015.5 4.5z"
              />
            </svg>
          </Link>
          {user ? (
            <UserMenu user={user} pathname={pathname} onLogout={logout} showEmail={false} />
          ) : (
            <Link
              href="/auth/login"
              aria-label="Login"
              className="flex size-9 items-center justify-center rounded-full border border-stone-200 bg-white text-base transition-colors hover:bg-stone-50"
            >
              <span aria-hidden>👤</span>
            </Link>
          )}
          <button
            className="flex size-9 items-center justify-center rounded-full border border-stone-200 bg-white text-stone-700"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Toggle menu"
            aria-expanded={menuOpen}
          >
            <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              {menuOpen ? (
                <path strokeLinecap="round" d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Desktop */}
      <div className="mx-auto hidden h-16 max-w-6xl items-center justify-between gap-3 px-4 lg:flex">
        <Link href="/" className="flex items-center gap-2 shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/Logo.png"
            alt="Car Connect"
            className="h-9 w-auto object-contain"
          />
          <span className="text-lg font-extrabold tracking-tight text-stone-900">
            Car <span className="text-brand">Connect</span>
          </span>
        </Link>

        <nav className="flex items-center gap-1">
          {NAV_LINKS.map((l) => navLink(l.href, l.label, l.exact))}
        </nav>

        <div className="flex items-center gap-2">
          <LocationSelector />
          {!user ? (
            <>
              <Link
                href="/auth/login"
                className="rounded-lg px-3 py-2 text-sm font-semibold text-stone-700 hover:bg-stone-100"
              >
                Login
              </Link>
              <Link
                href="/auth/login?role=dealer"
                className="rounded-lg bg-brand px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-dark"
              >
                🏪 Dealer Login
              </Link>
            </>
          ) : (
            <>
              <NotificationBell />
              <UserMenu user={user} pathname={pathname} onLogout={logout} showEmail />
            </>
          )}
        </div>
      </div>

      {menuOpen && (
        <div className="border-t border-stone-200 bg-white px-4 py-3 lg:hidden">
          <nav className="flex flex-col gap-1">
            {NAV_LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setMenuOpen(false)}
                className="rounded-lg px-3 py-2.5 text-sm font-medium text-stone-800 hover:bg-stone-100"
              >
                {l.label}
              </Link>
            ))}
            {!user ? (
              <>
                <Link
                  href="/auth/login"
                  onClick={() => setMenuOpen(false)}
                  className="rounded-lg px-3 py-2.5 text-sm font-semibold text-stone-800 hover:bg-stone-100"
                >
                  Login
                </Link>
                <Link
                  href="/auth/login?role=dealer"
                  onClick={() => setMenuOpen(false)}
                  className="rounded-lg bg-brand px-3 py-2.5 text-center text-sm font-semibold text-white"
                >
                  🏪 Dealer Login
                </Link>
              </>
            ) : (
              <>
                <Link href="/account" onClick={() => setMenuOpen(false)} className="rounded-lg px-3 py-2.5 text-sm font-medium text-stone-800 hover:bg-stone-100">
                  My Account
                </Link>
                <Link href="/dealer" onClick={() => setMenuOpen(false)} className="rounded-lg px-3 py-2.5 text-sm font-medium text-stone-800 hover:bg-stone-100">
                  Dealer Panel
                </Link>
                <button
                  onClick={logout}
                  className="rounded-lg px-3 py-2.5 text-left text-sm font-medium text-red-600 hover:bg-red-50"
                >
                  Logout
                </button>
              </>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
