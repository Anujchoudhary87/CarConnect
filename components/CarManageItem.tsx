"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Vehicle } from "@/lib/types";
import { Badge } from "@/components/ui";
import { formatKm, formatPriceShort } from "@/lib/format";
import { PosterGenerator } from "@/components/PosterGenerator";
import { WhatsAppAdGenerator } from "@/components/WhatsAppAdGenerator";

export function CarManageItem({
  vehicle,
  images,
  editHref,
  viewHref,
}: {
  vehicle: Vehicle;
  images: string[];
  editHref: string;
  viewHref: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  async function changeStatus(status: "sold" | "active") {
    setBusy("status");
    try {
      await fetch(`/api/vehicles/${vehicle.id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
    } finally {
      setBusy(null);
      router.refresh();
    }
  }

  async function remove() {
    setBusy("delete");
    try {
      await fetch(`/api/vehicles/${vehicle.id}`, { method: "DELETE" });
    } finally {
      setBusy(null);
      router.refresh();
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-stone-200 bg-white p-3 shadow-sm sm:flex-row sm:items-center">
      <Link href={viewHref} className="shrink-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={images[0] ?? "/car-placeholder.svg"}
          alt={vehicle.brand}
          className="h-24 w-full rounded-lg bg-stone-100 object-contain sm:w-36"
        />
      </Link>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <Link href={viewHref} className="font-semibold text-stone-900 hover:text-brand">
            {vehicle.brand} {vehicle.model} {vehicle.variant}
          </Link>
          <Badge status={vehicle.status}>{vehicle.status}</Badge>
        </div>
        <p className="mt-0.5 text-sm text-stone-500">
          {vehicle.year} · {formatKm(vehicle.km)} · {vehicle.fuel} · {vehicle.transmission} · {vehicle.owner} Owner
        </p>
        <p className="mt-1 text-base font-bold text-stone-900">{formatPriceShort(vehicle.price)}</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <PosterGenerator vehicleId={vehicle.id} hasPhotos={images.length > 0} onApplied={() => router.refresh()} />
        <WhatsAppAdGenerator vehicleId={vehicle.id} />
        <Link
          href={editHref}
          className="rounded-lg border border-stone-300 px-3 py-1.5 text-sm font-semibold text-stone-700 hover:bg-stone-50"
        >
          Edit
        </Link>
        {vehicle.status === "sold" ? (
          <button
            onClick={() => changeStatus("active")}
            disabled={busy !== null}
            className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
          >
            Relist
          </button>
        ) : (
          <button
            onClick={() => changeStatus("sold")}
            disabled={busy !== null}
            className="rounded-lg bg-stone-900 px-3 py-1.5 text-sm font-semibold text-white hover:bg-stone-800 disabled:opacity-60"
          >
            Mark as Sold
          </button>
        )}
        {confirmDelete ? (
          <span className="flex items-center gap-1.5">
            <button
              onClick={remove}
              disabled={busy !== null}
              className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-red-700"
            >
              {busy === "delete" ? "Deleting…" : "Confirm"}
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              className="rounded-lg border border-stone-300 px-3 py-1.5 text-sm text-stone-600"
            >
              Cancel
            </button>
          </span>
        ) : (
          <button
            onClick={() => setConfirmDelete(true)}
            disabled={busy !== null}
            className="rounded-lg border border-red-200 px-3 py-1.5 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-60"
          >
            Delete
          </button>
        )}
      </div>
    </div>
  );
}