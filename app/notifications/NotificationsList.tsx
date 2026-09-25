"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { EmptyState } from "@/components/ui";
import { timeAgo } from "@/lib/format";
import type { DemandNotification } from "@/lib/types";

const TYPE_META: Record<string, { label: string; icon: string; chip: string; accent: string }> = {
  price_drop: {
    label: "Price dropped",
    icon: "🔻",
    chip: "bg-emerald-100 text-emerald-800",
    accent: "border-l-4 border-emerald-500",
  },
  stock_match: {
    label: "Matching stock",
    icon: "🚗",
    chip: "bg-brand/10 text-brand-dark",
    accent: "border-l-4 border-brand",
  },
  sold: {
    label: "Car sold",
    icon: "🏷️",
    chip: "bg-stone-200 text-stone-700",
    accent: "border-l-4 border-stone-400",
  },
  followup_digest: {
    label: "Dealer follow-up",
    icon: "📞",
    chip: "bg-sky-100 text-sky-800",
    accent: "border-l-4 border-sky-400",
  },
  manual: {
    label: "Update",
    icon: "🔔",
    chip: "bg-stone-100 text-stone-700",
    accent: "border-l-4 border-stone-300",
  },
};

const FALLBACK = TYPE_META.manual;

type Filter = "all" | "price_drop";

export function NotificationsList({ initial }: { initial: DemandNotification[] }) {
  const router = useRouter();
  const [items, setItems] = useState<DemandNotification[]>(initial);
  const [filter, setFilter] = useState<Filter>("all");

  async function open(n: DemandNotification) {
    if (!n.read_at) {
      setItems((prev) =>
        prev.map((x) => (x.id === n.id ? { ...x, read_at: new Date().toISOString() } : x)),
      );
      fetch(`/api/notifications/${n.id}`, { method: "POST" }).catch(() => {});
    }
    if (n.vehicle_id) router.push(`/cars/${n.vehicle_id}`);
  }

  const priceDrops = useMemo(() => items.filter((n) => n.type === "price_drop"), [items]);

  // Price drops lead the list; everything else stays newest-first.
  const visible = useMemo(() => {
    const rest = items
      .filter((n) => n.type !== "price_drop")
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    if (filter === "price_drop") return priceDrops;
    return [...priceDrops, ...rest];
  }, [items, filter, priceDrops]);

  if (items.length === 0) {
    return (
      <EmptyState
        icon="🔔"
        title="Abhi koi notification nahi"
        description="Jab aapki pasand ki car ka price girayega, ya record ki hui demand se matching stock aayega, to yahan update milega. AI Advisor mein 'Haan, batao' chun ke notifications enable karo."
      />
    );
  }

  return (
    <div className="space-y-3">
      {priceDrops.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setFilter("all")}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
              filter === "all"
                ? "bg-stone-900 text-white"
                : "border border-stone-200 bg-white text-stone-600 hover:border-stone-400"
            }`}
          >
            All ({items.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter("price_drop")}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
              filter === "price_drop"
                ? "bg-emerald-600 text-white"
                : "border border-emerald-200 bg-emerald-50 text-emerald-800 hover:border-emerald-400"
            }`}
          >
            🔻 Price drops ({priceDrops.length})
          </button>
        </div>
      )}

      {visible.length === 0 ? (
        <p className="rounded-xl border border-dashed border-stone-300 bg-stone-50 px-4 py-8 text-center text-sm text-stone-500">
          Abhi koi price drop nahi hai. Price girte hi yahan dikhega.
        </p>
      ) : (
        visible.map((n) => {
          const unread = n.read_at == null;
          const meta = TYPE_META[n.type] ?? FALLBACK;
          return (
            <button
              key={n.id}
              type="button"
              onClick={() => open(n)}
              className={`block w-full rounded-xl border p-4 text-left shadow-sm transition-colors ${meta.accent} ${
                unread ? "bg-white hover:bg-stone-50" : "border-stone-200 bg-stone-50/60 hover:bg-stone-50"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${meta.chip}`}>
                      {meta.icon} {meta.label}
                    </span>
                    {unread && (
                      <span className="rounded-full bg-red-500 px-2 py-0.5 text-[11px] font-bold text-white">
                        New
                      </span>
                    )}
                  </div>
                  <p className={`mt-2 font-bold ${unread ? "text-stone-900" : "text-stone-600"}`}>
                    {n.title}
                  </p>
                  <p className="mt-1 text-sm text-stone-600">{n.message}</p>
                </div>
                {unread && (
                  <span className="mt-1 size-2.5 shrink-0 rounded-full bg-red-500" aria-label="Unread" />
                )}
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <p className="text-xs text-stone-400">{timeAgo(n.created_at)}</p>
                {n.vehicle_id && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-stone-900 px-3 py-1 text-xs font-semibold text-white">
                    View Car →
                  </span>
                )}
              </div>
            </button>
          );
        })
      )}

      <p className="pt-1 text-center text-xs text-stone-400">
        Notifications in-app only hain — koi SMS, WhatsApp ya email nahi.
      </p>
      <div className="text-center">
        <Link href="/account" className="text-sm font-medium text-brand hover:underline">
          ← My Account
        </Link>
      </div>
    </div>
  );
}
