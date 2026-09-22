"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { EmptyState } from "@/components/ui";
import { timeAgo } from "@/lib/format";
import type { DemandNotification } from "@/lib/types";

export function NotificationsList({ initial }: { initial: DemandNotification[] }) {
  const router = useRouter();
  const [items, setItems] = useState<DemandNotification[]>(initial);

  async function open(n: DemandNotification) {
    if (!n.read_at) {
      setItems((prev) =>
        prev.map((x) => (x.id === n.id ? { ...x, read_at: new Date().toISOString() } : x)),
      );
      fetch(`/api/notifications/${n.id}`, { method: "POST" }).catch(() => {});
    }
    if (n.vehicle_id) router.push(`/cars/${n.vehicle_id}`);
  }

  if (items.length === 0) {
    return (
      <EmptyState
        icon="🔔"
        title="Abhi koi notification nahi"
        description="Jab aapki record ki hui demand se matching stock aayega, to yahan update milega. AI Advisor mein 'Haan, batao' chun ke notifications enable karo."
      />
    );
  }

  return (
    <div className="space-y-3">
      {items.map((n) => {
        const unread = n.read_at == null;
        return (
          <button
            key={n.id}
            type="button"
            onClick={() => open(n)}
            className={`block w-full rounded-xl border p-4 text-left shadow-sm transition-colors ${
              unread
                ? "border-brand/30 bg-brand-light/40 hover:bg-brand-light/70"
                : "border-stone-200 bg-white hover:bg-stone-50"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className={`font-bold ${unread ? "text-brand-dark" : "text-stone-800"}`}>
                  {n.title}
                </p>
                <p className="mt-1 text-sm text-stone-600">{n.message}</p>
              </div>
              {unread && (
                <span className="mt-1 size-2.5 shrink-0 rounded-full bg-red-500" aria-label="Unread" />
              )}
            </div>
            <p className="mt-2 text-xs text-stone-400">{timeAgo(n.created_at)}</p>
            {n.vehicle_id && (
              <span className="mt-3 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                🚗 Car Dekho
              </span>
            )}
          </button>
        );
      })}
      {items.length > 0 && (
        <p className="pt-1 text-center text-xs text-stone-400">
          Demand notifications are in-app only — koi SMS, WhatsApp ya email nahi.
        </p>
      )}
      <div className="text-center">
        <Link href="/account" className="text-sm font-medium text-brand hover:underline">
          ← Mera Account
        </Link>
      </div>
    </div>
  );
}