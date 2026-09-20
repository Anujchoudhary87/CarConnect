"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useUser } from "@/lib/use-user";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/components/ui";
import { LocationSelector } from "@/components/LocationSelector";

const NAV_LINKS = [
  { href: "/", label: "Home", exact: true },
  { href: "/marketplace", label: "Search Cars" },
  { href: "/sell", label: "Sell Your Car" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

export function Header() {
  const { user } = useUser();
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const closeMenus = () => {
    setMenuOpen(false);
    setUserMenuOpen(false);
  };

  async function logout() {
    closeMenus();
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
        href={href}
        onClick={closeMenus}
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
    <header className="sticky top-0 z-40 border-b border-stone-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4">
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <span className="flex size-9 items-center justify-center rounded-lg bg-brand text-lg text-white">🚘</span>
          <span className="hidden text-lg font-extrabold tracking-tight text-stone-900 sm:block">
            Car <span className="text-brand">Connect</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex">
          {NAV_LINKS.map((l) => navLink(l.href, l.label, l.exact))}
        </nav>

        <div className="hidden items-center gap-2 lg:flex">
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
                className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-dark"
              >
                🏪 Dealer Login
              </Link>
            </>
          ) : (
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setUserMenuOpen((v) => !v)}
                className="flex items-center gap-2 rounded-full border border-stone-200 bg-white py-1 pl-1 pr-3 hover:bg-stone-50"
              >
                <span className="flex size-8 items-center justify-center rounded-full bg-brand text-sm font-bold text-white">
                  {user.email?.[0]?.toUpperCase() ?? "U"}
                </span>
                <span className="text-sm font-semibold text-stone-800">
                  {user.email?.split("@")[0]}
                </span>
              </button>
              {userMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 overflow-hidden rounded-xl border border-stone-200 bg-white shadow-lg">
                  <Link href="/account" onClick={() => setUserMenuOpen(false)} className="block px-4 py-2.5 text-sm text-stone-700 hover:bg-stone-50">
                    My Account
                  </Link>
                  <Link href="/dealer" onClick={() => setUserMenuOpen(false)} className="block px-4 py-2.5 text-sm text-stone-700 hover:bg-stone-50">
                    Dealer Panel
                  </Link>
                  <Link href="/favorites" onClick={() => setUserMenuOpen(false)} className="block px-4 py-2.5 text-sm text-stone-700 hover:bg-stone-50">
                    Saved Cars
                  </Link>
                  <Link href="/sell" onClick={() => setUserMenuOpen(false)} className="block px-4 py-2.5 text-sm text-stone-700 hover:bg-stone-50">
                    Sell My Car
                  </Link>
                  {pathname.startsWith("/admin") && (
                    <Link href="/admin" onClick={() => setUserMenuOpen(false)} className="block px-4 py-2.5 text-sm text-stone-700 hover:bg-stone-50">
                      Admin Panel
                    </Link>
                  )}
                  <button
                    onClick={logout}
                    className="block w-full border-t border-stone-100 px-4 py-2.5 text-left text-sm font-medium text-red-600 hover:bg-red-50"
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <button
          className="rounded-lg border border-stone-200 p-2 lg:hidden"
          onClick={() => setMenuOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            {menuOpen ? (
              <path strokeLinecap="round" d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </div>

      {menuOpen && (
        <div className="border-t border-stone-200 bg-white px-4 py-3 lg:hidden">
          <div className="pb-2">
            <LocationSelector />
          </div>
          <nav className="flex flex-col gap-1">
            {NAV_LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="rounded-lg px-3 py-2.5 text-sm font-medium text-stone-800 hover:bg-stone-100"
              >
                {l.label}
              </Link>
            ))}
            {!user ? (
              <>
                <Link
                  href="/auth/login"
                  onClick={closeMenus}
                  className="rounded-lg px-3 py-2.5 text-sm font-semibold text-stone-800 hover:bg-stone-100"
                >
                  Login
                </Link>
                <Link
                  href="/auth/login?role=dealer"
                  onClick={closeMenus}
                  className="rounded-lg bg-brand px-3 py-2.5 text-center text-sm font-semibold text-white"
                >
                  🏪 Dealer Login
                </Link>
              </>
            ) : (
              <>
                <Link href="/account" onClick={closeMenus} className="rounded-lg px-3 py-2.5 text-sm font-medium text-stone-800 hover:bg-stone-100">
                  My Account
                </Link>
                <Link href="/dealer" onClick={closeMenus} className="rounded-lg px-3 py-2.5 text-sm font-medium text-stone-800 hover:bg-stone-100">
                  Dealer Panel
                </Link>
                <Link href="/favorites" onClick={closeMenus} className="rounded-lg px-3 py-2.5 text-sm font-medium text-stone-800 hover:bg-stone-100">
                  Saved Cars
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