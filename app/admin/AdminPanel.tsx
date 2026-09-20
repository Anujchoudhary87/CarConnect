"use client";

import { useCallback, useEffect, useState } from "react";
import { Badge, Button, Card, Spinner } from "@/components/ui";
import { formatKm, formatPriceShort, telLink, timeAgo, whatsappLink } from "@/lib/format";

type Tab = "overview" | "dealers" | "vehicles" | "sell";

interface Summary {
  users: number;
  dealers: number;
  pendingDealers: number;
  vehicles: number;
  pendingVehicles: number;
  activeVehicles: number;
  sellListings: number;
  openSellListings: number;
  enquiries: number;
}

interface VehicleRow {
  id: string;
  brand: string;
  model: string;
  variant?: string;
  year: number;
  km: number;
  price: number;
  fuel: string;
  city?: string;
  status: string;
  created_at: string;
  dealer?: { dealership_name?: string; verified?: boolean; city?: string };
  vehicle_images?: { url: string }[];
}

interface DealerRow {
  id: string;
  dealership_name: string;
  owner_name?: string;
  phone?: string;
  city?: string;
  verified: boolean;
  created_at: string;
  verification?: { status?: string; id_proof_path?: string; business_proof_path?: string }[];
}

interface SellListingRow {
  id: string;
  brand: string;
  model: string;
  variant?: string;
  year: number;
  expected_price: number;
  status: string;
  created_at: string;
  owner?: { full_name?: string; phone?: string } | null;
  offers?: { id: string; offer_price: number; status: string; dealer?: { dealership_name?: string } }[];
}

export function AdminPanel() {
  const [tab, setTab] = useState<Tab>("overview");
  const [summary, setSummary] = useState<Summary | null>(null);
  const [dealers, setDealers] = useState<DealerRow[]>([]);
  const [vehicles, setVehicles] = useState<VehicleRow[]>([]);
  const [sell, setSell] = useState<SellListingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [vehStatus, setVehStatus] = useState("pending");
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, d, v, sl] = await Promise.all([
        fetch("/api/admin/summary").then((r) => r.json()),
        fetch("/api/admin/dealers").then((r) => r.json()),
        fetch(`/api/admin/vehicles?status=${vehStatus}`).then((r) => r.json()),
        fetch("/api/admin/sell-listings").then((r) => r.json()),
      ]);
      setSummary(s);
      setDealers(d.dealers ?? []);
      setVehicles(v.vehicles ?? []);
      setSell(sl.listings ?? []);
    } finally {
      setLoading(false);
    }
  }, [vehStatus]);

  useEffect(() => {
    load();
  }, [load]);

  async function act(url: string, body: object, success: string) {
    setBusy(url + JSON.stringify(body));
    setMsg("");
    try {
      const res = await fetch(url, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setMsg(success);
      load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(null);
    }
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "dealers", label: `Dealer Verification (${summary?.pendingDealers ?? 0})` },
    { id: "vehicles", label: "Vehicle Approval" },
    { id: "sell", label: "Sell Listings" },
  ];

  return (
    <div className="space-y-4">
      {msg && (
        <p className="rounded-lg bg-stone-100 px-3 py-2 text-sm text-stone-700">{msg}</p>
      )}
      <div className="flex gap-2 overflow-x-auto rounded-lg bg-stone-100 p-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`shrink-0 rounded-md px-3 py-2 text-sm font-semibold transition-colors ${
              tab === t.id ? "bg-white text-stone-900 shadow" : "text-stone-500"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Spinner label="Loading…" /></div>
      ) : tab === "overview" && summary ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Users", value: summary.users },
            { label: "Dealers", value: summary.dealers },
            { label: "Pending Verifications", value: summary.pendingDealers },
            { label: "Total Cars", value: summary.vehicles },
            { label: "Pending Approval", value: summary.pendingVehicles },
            { label: "Active Cars", value: summary.activeVehicles },
            { label: "Sell Listings", value: summary.sellListings },
            { label: "Open Sell Cars", value: summary.openSellListings },
            { label: "Enquiries", value: summary.enquiries },
          ].map((c) => (
            <Card key={c.label} className="p-4">
              <p className="text-2xl font-extrabold text-brand-dark">{c.value}</p>
              <p className="mt-0.5 text-xs font-medium text-stone-500">{c.label}</p>
            </Card>
          ))}
        </div>
      ) : tab === "dealers" ? (
        <div className="space-y-3">
          {dealers.map((d) => (
            <div key={d.id} className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-semibold text-stone-900">
                    {d.dealership_name} <Badge status={d.verified ? "accepted" : "pending"}>{d.verified ? "Verified" : "Unverified"}</Badge>
                  </p>
                  <p className="text-sm text-stone-500">
                    {d.owner_name} · {d.phone} · {d.city} · joined {timeAgo(d.created_at)}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {d.verification?.[0]?.id_proof_path && (
                    <a href={d.verification[0].id_proof_path} target="_blank" rel="noopener noreferrer" className="rounded-lg bg-stone-100 px-3 py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-200">
                      View ID Proof
                    </a>
                  )}
                  {d.verification?.[0]?.business_proof_path && (
                    <a href={d.verification[0].business_proof_path} target="_blank" rel="noopener noreferrer" className="rounded-lg bg-stone-100 px-3 py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-200">
                      Business Proof
                    </a>
                  )}
                  {d.phone && (
                    <>
                      <a href={telLink(d.phone)} className="rounded-lg bg-stone-900 px-3 py-1.5 text-xs font-semibold text-white">📞 Call</a>
                      <a href={whatsappLink(d.phone, `Hi ${d.owner_name}, Car Connect verification ke baare mein.`)} target="_blank" rel="noopener noreferrer" className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white">💬 WhatsApp</a>
                    </>
                  )}
                  {!d.verified && (
                    <Button size="sm" variant="success" loading={busy === `v${d.id}`} onClick={() => act("/api/admin/dealers", { dealer_id: d.id, verified: true, admin_note: "Approved by admin" }, `Verified ${d.dealership_name}`)}>
                      ✓ Verify
                    </Button>
                  )}
                  {d.verified && (
                    <Button size="sm" variant="outline" loading={busy === `u${d.id}`} onClick={() => act("/api/admin/dealers", { dealer_id: d.id, verified: false, admin_note: "Revoked" }, `Unverified ${d.dealership_name}`)}>
                      Unverify
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
          {dealers.length === 0 && <p className="rounded-lg bg-stone-50 px-3 py-6 text-center text-sm text-stone-500">Koi dealer nahi.</p>}
        </div>
      ) : tab === "vehicles" ? (
        <div className="space-y-3">
          <div className="flex gap-2">
            {["pending", "active", "rejected", "sold"].map((s) => (
              <button
                key={s}
                onClick={() => setVehStatus(s)}
                className={`rounded-full px-3 py-1 text-sm font-semibold transition-colors ${vehStatus === s ? "bg-brand text-white" : "bg-stone-100 text-stone-600 hover:bg-stone-200"}`}
              >
                {s.slice(0, 1).toUpperCase() + s.slice(1)} ({s === "pending" ? summary?.pendingVehicles ?? 0 : ""})
              </button>
            ))}
          </div>
          <span className="block text-xs text-stone-400">Click a filter button then wait — list reloads automatically.</span>
          {vehicles.map((v) => (
            <div key={v.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={v.vehicle_images?.[0]?.url ?? "/car-placeholder.svg"} alt="" className="h-16 w-24 rounded-lg object-cover" />
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-stone-900">{v.brand} {v.model} {v.variant}</p>
                <p className="text-sm text-stone-500">{v.year} · {formatKm(v.km)} · {v.fuel} · {formatPriceShort(v.price)} · {v.city}</p>
                {v.dealer && (
                  <p className="text-xs text-stone-400">
                    {v.dealer.dealership_name} {v.dealer.verified ? "✓" : ""} {v.dealer.city ? `· ${v.dealer.city}` : ""}
                  </p>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {v.status === "pending" && (
                  <>
                    <Button size="sm" variant="success" loading={busy === `a${v.id}`} onClick={() => act(`/api/admin/vehicles/${v.id}`, { action: "active" }, "Approved — car ab marketplace pe hai")}>
                      ✓ Approve
                    </Button>
                    <Button size="sm" variant="outline" loading={busy === `r${v.id}`} onClick={() => act(`/api/admin/vehicles/${v.id}`, { action: "rejected" }, "Rejected")}>
                      ✕ Reject
                    </Button>
                  </>
                )}
                <Button size="sm" variant="ghost" loading={busy === `d${v.id}`} onClick={() => act(`/api/admin/vehicles/${v.id}`, { action: "delete" }, "Car deleted")}>
                  🗑 Delete
                </Button>
              </div>
            </div>
          ))}
          {vehicles.length === 0 && <p className="rounded-lg bg-stone-50 px-3 py-6 text-center text-sm text-stone-500">Is status mein koi car nahi.</p>}
        </div>
      ) : tab === "sell" ? (
        <div className="space-y-3">
          {sell.map((l) => (
            <div key={l.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-stone-900">{l.brand} {l.model} {l.variant} <Badge status={l.status}>{l.status}</Badge></p>
                <p className="text-sm text-stone-500">{l.year} · Expected {formatPriceShort(l.expected_price)} · {timeAgo(l.created_at)}</p>
                <p className="text-xs text-stone-400">
                  {l.owner?.full_name ?? "User"} {l.owner?.phone ? `· ${l.owner.phone}` : ""} · {l.offers?.length ?? 0} offers
                </p>
              </div>
              <Button size="sm" variant="ghost" loading={busy === `s${l.id}`} onClick={() => { setBusy(`s${l.id}`); fetch("/api/admin/sell-listings", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: l.id }) }).then(() => { setMsg("Listing deleted"); load(); }).finally(() => setBusy(null)); }}>
                🗑 Delete
              </Button>
            </div>
          ))}
          {sell.length === 0 && <p className="rounded-lg bg-stone-50 px-3 py-6 text-center text-sm text-stone-500">Koi sell listing nahi.</p>}
        </div>
      ) : null}
    </div>
  );
}