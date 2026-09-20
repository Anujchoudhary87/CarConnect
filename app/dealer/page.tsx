import type { Metadata } from "next";
import Link from "next/link";
import { requireDealer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ButtonLink, Card, EmptyState } from "@/components/ui";

export const metadata: Metadata = { title: "Dealer Dashboard" };

export default async function DealerDashboardPage() {
  const { dealer } = await requireDealer();
  const supabase = await createClient();

  const [byStatus, enquires, drives, offers] = await Promise.all([
    supabase.from("vehicles").select("status"),
    supabase.from("enquiries").select("id", { count: "exact", head: true }).eq("dealer_id", dealer.id),
    supabase.from("test_drive_requests").select("id", { count: "exact", head: true }).eq("dealer_id", dealer.id),
    supabase.from("dealer_offers").select("id", { count: "exact", head: true }).eq("dealer_id", dealer.id),
  ]);

  const vehicles = (byStatus.data ?? []) as Array<{ status: string }>;
  const stats = {
    total: vehicles.length,
    active: vehicles.filter((v) => v.status === "active").length,
    sold: vehicles.filter((v) => v.status === "sold").length,
    enquiries: enquires.count ?? 0,
    testDrives: drives.count ?? 0,
    offers: offers.count ?? 0,
  };

  const cards = [
    { label: "+ Add Car", sub: "Nayi gaadi list karo", href: "/dealer/cars/new", emoji: "🚗", btn: "Gaadi Dalo" },
    { label: "My Cars", sub: `${stats.total} cars in inventory`, href: "/dealer/cars", emoji: "🗂️", btn: "Dekho" },
    { label: "Customer Enquiries", sub: `${stats.enquiries} enquiries, ${stats.testDrives} test drives`, href: "/dealer/enquiries", emoji: "💬", btn: "Dekho" },
    { label: "My Offers", sub: `${stats.offers} offers sent on customer cars`, href: "/dealer/offers", emoji: "💰", btn: "Dekho" },
  ];

  const countBoxes = [
    { label: "Active Listings", value: stats.active, tone: "text-emerald-600" },
    { label: "Sold", value: stats.sold, tone: "text-stone-600" },
    { label: "My Offers Sent", value: stats.offers, tone: "text-brand" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-stone-900">Welcome back 👋</h2>
        <ButtonLink href="/dealer/cars/new">+ Add Car</ButtonLink>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {countBoxes.map((c) => (
          <Card key={c.label} className="p-4">
            <p className={`text-2xl font-extrabold ${c.tone}`}>{c.value}</p>
            <p className="mt-0.5 text-xs font-medium text-stone-500">{c.label}</p>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {cards.map((c) => (
          <Link
            key={c.href}
            href={c.href}
            className="group flex items-center justify-between rounded-xl border border-stone-200 bg-white p-5 shadow-sm transition-all hover:border-brand/40 hover:shadow-md"
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">{c.emoji}</span>
              <div>
                <p className="font-semibold text-stone-900">{c.label}</p>
                <p className="text-sm text-stone-500">{c.sub}</p>
              </div>
            </div>
            <span className="rounded-lg bg-brand-light px-3 py-1.5 text-sm font-semibold text-brand-dark transition-colors group-hover:bg-brand group-hover:text-white">
              {c.btn}
            </span>
          </Link>
        ))}
      </div>

      {stats.total === 0 && (
        <EmptyState
          icon="🚗"
          title="No cars yet"
          description="Pehli gaadi dalo — customers ko dikhana shuru karo."
          action={<ButtonLink href="/dealer/cars/new">+ Add Car</ButtonLink>}
        />
      )}

    </div>
  );
}