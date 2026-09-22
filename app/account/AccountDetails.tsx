"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Badge, Button, Card, FieldError } from "@/components/ui";
import { DemandPrefs } from "@/components/DemandPrefs";
import type { UserProfile } from "@/lib/types";

export function AccountDetails({ profile, email }: { profile: UserProfile | null; email: string }) {
  const router = useRouter();
  const supabase = createClient();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function logout() {
    setBusy(true);
    setError("");
    const { error: e } = await supabase.auth.signOut();
    if (e) setError(e.message);
    else router.push("/");
  }

  const links = [
    { href: "/marketplace", label: "🔍 Gaadi Kharido", desc: "Marketplace browse karo" },
    { href: "/notifications", label: "🔔 Notifications", desc: "Stock match ke in-app updates" },
    { href: "/sell", label: "🚗 Apni Gaadi Becho", desc: "Apni gaadi bechne ke liye list karo" },
    { href: "/sell/my-listings", label: "📋 Meri Sell Listings", desc: "Apni listings aur offers dekho" },
    { href: "/favorites", label: "♥️ Saved Gaadiyaan", desc: "Save ki hui gaadiyan" },
    ...(profile?.role === "dealer"
      ? [{ href: "/dealer", label: "🏪 Dealer Dashboard", desc: "Inventory aur enquiries" }]
      : [{ href: "/become-dealer", label: "🏪 Dealer Bano", desc: "Dealer ban kar gaadiyan becho" }]),
    ...(profile?.is_admin ? [{ href: "/admin", label: "🛡️ Admin Panel", desc: "Manage platform" }] : []),
  ];

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex size-12 items-center justify-center rounded-full bg-brand text-xl font-bold text-white">
            {(profile?.full_name || email).charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="font-bold text-stone-900">{profile?.full_name || "User"}</p>
              <Badge status={profile?.role === "dealer" ? "accepted" : "open"}>
                {profile?.role === "dealer" ? "Dealer" : "Customer"}
              </Badge>
              {profile?.is_admin && <Badge status="accepted">Admin</Badge>}
            </div>
            <p className="text-sm text-stone-500">{profile?.phone || email}</p>
          </div>
        </div>
      </Card>

      <Card className="divide-y divide-stone-100">
        {links.map((l) => (
          <Link key={l.href} href={l.href} className="flex items-center justify-between p-4 transition-colors hover:bg-stone-50">
            <div>
              <p className="font-semibold text-stone-900">{l.label}</p>
              <p className="text-sm text-stone-500">{l.desc}</p>
            </div>
            <span className="text-stone-300">→</span>
          </Link>
        ))}
      </Card>

      <DemandPrefs />

      <FieldError message={error} />
      <Button variant="outline" onClick={logout} loading={busy}>Log Out</Button>
    </div>
  );
}