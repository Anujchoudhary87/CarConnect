"use client";

import { useCallback, useEffect, useState } from "react";
import { Badge, Button, Card, EmptyState, Spinner } from "@/components/ui";
import { formatKm, formatINR, telLink, timeAgo, whatsappLink } from "@/lib/format";
import type { CustomerDemand, DemandCluster, DemandNotification, DemandVehicleMatch } from "@/lib/types";

type Tab = "overview" | "dealers" | "customers" | "vehicles" | "sell" | "offers" | "enquiries" | "testdrives" | "demand";

const TABS: { id: Tab; label: string; emoji: string }[] = [
  { id: "overview", label: "Overview", emoji: "📊" },
  { id: "dealers", label: "Dealers", emoji: "🏢" },
  { id: "customers", label: "Customers", emoji: "👥" },
  { id: "vehicles", label: "Vehicles", emoji: "🚗" },
  { id: "sell", label: "Sell Requests", emoji: "💰" },
  { id: "offers", label: "Offers", emoji: "🤝" },
  { id: "enquiries", label: "Enquiries", emoji: "💬" },
  { id: "testdrives", label: "Test Drives", emoji: "🔑" },
  { id: "demand", label: "Demand", emoji: "🔥" },
];

const ENDPOINTS: Record<Tab, (status?: string) => string> = {
  overview: () => "/api/admin/summary",
  dealers: () => "/api/admin/dealers",
  customers: () => "/api/admin/customers",
  vehicles: (s) => `/api/admin/vehicles${s && s !== "all" ? `?status=${s}` : ""}`,
  sell: () => "/api/admin/sell-listings",
  offers: () => "/api/admin/offers",
  enquiries: () => "/api/admin/enquiries",
  testdrives: () => "/api/admin/test-drives",
  demand: () => "/api/admin/demands",
};

interface Summary {
  users: number;
  customers: number;
  dealers: number;
  verifiedDealers: number;
  pendingDealers: number;
  vehicles: number;
  sellListings: number;
  dealerOffers: number;
  enquiries: number;
  testDrives: number;
}

interface DealerRow {
  id: string;
  user_id: string;
  dealership_name: string;
  owner_name?: string;
  phone?: string;
  whatsapp?: string;
  email?: string;
  city?: string;
  state?: string;
  address?: string;
  verified: boolean;
  created_at: string;
  verification?: { status?: string }[];
  total_cars: number;
  active_cars: number;
  sold_cars: number;
}

interface VehicleRow {
  id: string;
  dealer?: { dealership_name?: string; verified?: boolean } | null;
  brand: string;
  model: string;
  variant?: string;
  year: number;
  km: number;
  fuel: string;
  price: number;
  status: string;
  created_at: string;
  vehicle_images?: { url: string }[];
}

interface SellListingRow {
  id: string;
  brand: string;
  model: string;
  variant?: string;
  year: number;
  km: number;
  expected_price: number;
  city?: string;
  status: string;
  created_at: string;
  owner?: { full_name?: string; phone?: string } | null;
  offers?: unknown[];
}

interface OfferRow {
  id: string;
  offer_price: number;
  status: string;
  created_at: string;
  listing?: { brand?: string; model?: string; variant?: string } | null;
  dealer?: { dealership_name?: string; verified?: boolean } | null;
  owner?: { full_name?: string; phone?: string } | null;
}

interface EnquiryRow {
  id: string;
  name: string;
  phone: string;
  message?: string;
  type: string;
  created_at: string;
  vehicle?: { brand?: string; model?: string; variant?: string } | null;
  dealer?: string | null;
}

interface TestDriveRow {
  id: string;
  name: string;
  phone: string;
  preferred_date?: string | null;
  preferred_time?: string;
  status: string;
  created_at: string;
  vehicle?: { brand?: string; model?: string; variant?: string } | null;
  dealer?: string | null;
}

interface CustomerRow {
  id: string;
  full_name: string;
  phone?: string;
  email?: string;
  created_at: string;
  sell_listings: number;
  favorites: number;
  enquiries: number;
  test_drives: number;
}

type AdminData = Partial<Summary> & {
  dealers?: DealerRow[];
  customers?: CustomerRow[];
  vehicles?: VehicleRow[];
  listings?: SellListingRow[];
  offers?: OfferRow[];
  enquiries?: EnquiryRow[];
  test_drives?: TestDriveRow[];
  signals?: CustomerDemand[];
  clusters?: DemandCluster[];
  matches?: DemandVehicleMatch[];
  notifications?: DemandNotification[];
};

interface DealerDetail {
  dealer: DealerRow;
  total_cars: number;
  active_cars: number;
  sold_cars: number;
  offers_sent: number;
}

function DataTable({ cols, children }: { cols: string[]; children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-stone-200 bg-white shadow-sm">
      <table className="w-full min-w-[760px] text-left text-sm">
        <thead className="border-b border-stone-200 bg-stone-50 text-xs uppercase tracking-wide text-stone-500">
          <tr>
            {cols.map((c) => (
              <th key={c} className="whitespace-nowrap px-3 py-2.5 font-semibold">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-100">{children}</tbody>
      </table>
    </div>
  );
}

const Id = ({ id, label }: { id: string; label?: string }) => (
  <code className="text-xs text-stone-500" title={id}>
    {label ?? id.slice(0, 8)}…
  </code>
);

function dateOnly(iso?: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export function AdminPortal() {
  const [tab, setTab] = useState<Tab>("overview");
  const [cache, setCache] = useState<Record<string, unknown>>({});
  const [loadingTab, setLoadingTab] = useState(false);
  const [busy, setBusy] = useState<Record<string, boolean>>({});
  const [msg, setMsg] = useState("");
  const [vehStatus, setVehStatus] = useState("all");
  const [confirmAction, setConfirmAction] = useState<{ id: string; name: string; verified: boolean } | null>(null);
  const [confirmDeleteUser, setConfirmDeleteUser] = useState<{ id: string; user_id: string; name: string; type: "dealer" | "customer" } | null>(null);
  const [selectedDealerId, setSelectedDealerId] = useState<string | null>(null);
  const [dealerDetail, setDealerDetail] = useState<DealerDetail | null>(null);

  const load = useCallback(async (t: Tab, status?: string) => {
    setLoadingTab(true);
    setMsg("");
    const key = t + (status ?? "");
    try {
      const res = await fetch(ENDPOINTS[t](status));
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? "Load fail hua");
      setCache((c) => ({ ...c, [key]: j }));
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Load fail hua");
    } finally {
      setLoadingTab(false);
    }
  }, []);

  useEffect(() => {
    const key = tab + (tab === "vehicles" ? vehStatus : "");
    if (cache[key] !== undefined) return;
    const t = setTimeout(
      () => void load(tab, tab === "vehicles" ? vehStatus : undefined),
      0,
    );
    return () => clearTimeout(t);
  }, [tab, vehStatus, cache, load]);

  useEffect(() => {
    if (!selectedDealerId) return;
    let cancelled = false;
    (async () => {
      const res = await fetch(`/api/admin/dealers/${selectedDealerId}`);
      const j = await res.json();
      if (cancelled) return;
      if (res.ok) setDealerDetail(j as DealerDetail);
      else setMsg((j.error as string) ?? "Dealer load fail hua");
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedDealerId]);

  const s = cache[tab + (tab === "vehicles" ? vehStatus : "")] as AdminData | undefined;

  async function toggleVerify(dealer: DealerRow, verified: boolean) {
    setBusy((b) => ({ ...b, [dealer.id]: true }));
    setMsg("");
    try {
      const res = await fetch("/api/admin/dealers", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dealer_id: dealer.id,
          verified,
          admin_note: verified ? "Verified by admin" : "Verification revoked by admin",
        }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? "Fail ho gaya");
      setMsg(verified ? `✅ ${dealer.dealership_name} verified ho gaya` : `${dealer.dealership_name} ab unverified hai`);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Fail ho gaya");
    } finally {
      setBusy((b) => ({ ...b, [dealer.id]: false }));
      setConfirmAction(null);
      setCache((c) => ({ ...c, ["dealers"]: undefined, ["overview"]: undefined }));
      void load("dealers");
      void load("overview");
      if (selectedDealerId === dealer.id) {
        const res = await fetch(`/api/admin/dealers/${dealer.id}`);
        const j = await res.json();
        if (res.ok) setDealerDetail(j as DealerDetail);
      }
    }
  }

  async function deleteUserAction(user_id: string, type: "dealer" | "customer") {
    setBusy((b) => ({ ...b, ["del" + user_id]: true }));
    setMsg("");
    try {
      const endpoint = type === "dealer" ? "/api/admin/dealers" : "/api/admin/customers";
      const payload = type === "dealer" ? { user_id } : { id: user_id };
      const res = await fetch(endpoint, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? "Delete fail hua");
      setMsg(`✅ ${type === "dealer" ? "Dealer" : "Customer"} delete ho gaya`);
      setCache((c) => ({ ...c, [`${type}s`]: undefined, ["overview"]: undefined }));
      void load(type === "dealer" ? "dealers" : "customers");
      void load("overview");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Delete fail hua");
    } finally {
      setBusy((b) => ({ ...b, ["del" + user_id]: false }));
      setConfirmDeleteUser(null);
    }
  }

  async function deleteVehicle(id: string) {
    setBusy((b) => ({ ...b, ["v" + id]: true }));
    try {
      const res = await fetch(`/api/admin/vehicles/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete" }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? "Fail ho gaya");
      setMsg("Car delete ho gayi");
      setCache((c) => ({ ...c, ["vehicles" + vehStatus]: undefined, ["overview"]: undefined }));
      void load("vehicles", vehStatus);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Fail ho gaya");
    } finally {
      setBusy((b) => ({ ...b, ["v" + id]: false }));
    }
  }

  async function deleteSellListing(id: string) {
    setBusy((b) => ({ ...b, ["s" + id]: true }));
    try {
      const res = await fetch("/api/admin/sell-listings", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? "Fail ho gaya");
      setMsg("Sell listing delete ho gayi");
      setCache((c) => ({ ...c, ["sell"]: undefined, ["overview"]: undefined }));
      void load("sell");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Fail ho gaya");
    } finally {
      setBusy((b) => ({ ...b, ["s" + id]: false }));
    }
  }

  async function deleteDemandCluster(key: string) {
    setBusy((b) => ({ ...b, ["d" + key]: true }));
    try {
      const res = await fetch("/api/admin/demands", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cluster_key: key }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? "Fail ho gaya");
      setMsg("Demand cluster delete ho gaya");
      setCache((c) => ({ ...c, ["demand"]: undefined }));
      void load("demand");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Fail ho gaya");
    } finally {
      setBusy((b) => ({ ...b, ["d" + key]: false }));
    }
  }

  const dealers = (s?.dealers ?? []) as DealerRow[];
  const customers = (s?.customers ?? []) as CustomerRow[];
  const vehicles = (s?.vehicles ?? []) as VehicleRow[];
  const sell = (s?.listings ?? []) as SellListingRow[];
  const offers = (s?.offers ?? []) as OfferRow[];
  const enquiries = (s?.enquiries ?? []) as EnquiryRow[];
  const testDrives = (s?.test_drives ?? []) as TestDriveRow[];
  const signals = (s?.signals ?? []) as CustomerDemand[];
  const demandClusters = (s?.clusters ?? []) as DemandCluster[];
  const matchRows = (s?.matches ?? []) as DemandVehicleMatch[];
  const notificationRows = (s?.notifications ?? []) as DemandNotification[];
  const summary = s as Summary | undefined;

  if (selectedDealerId) {
    if (!dealerDetail) {
      return (
        <div className="flex justify-center py-16">
          <Spinner label="Dealer load ho raha hai…" />
        </div>
      );
    }
    const d = dealerDetail.dealer;
    const ver = d.verification?.[0]?.status;
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <button onClick={() => { setSelectedDealerId(null); setDealerDetail(null); }} className="text-sm font-semibold text-brand hover:underline">
              ← Dealers pe wapas
            </button>
            <h2 className="mt-1 text-xl font-extrabold text-stone-900">{d.dealership_name}</h2>
          </div>
          <Badge status={d.verified ? "approved" : "pending"}>{d.verified ? "Verified" : "Unverified"}</Badge>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Total Inventory", value: dealerDetail.total_cars },
            { label: "Active Vehicles", value: dealerDetail.active_cars },
            { label: "Sold Vehicles", value: dealerDetail.sold_cars },
            { label: "Sell Offers Sent", value: dealerDetail.offers_sent },
          ].map((c) => (
            <Card key={c.label} className="p-4">
              <p className="text-2xl font-extrabold text-brand-dark">{c.value}</p>
              <p className="mt-0.5 text-xs font-medium text-stone-500">{c.label}</p>
            </Card>
          ))}
        </div>

        <Card className="overflow-hidden">
          <dl className="grid grid-cols-1 gap-x-6 gap-y-3 p-5 sm:grid-cols-2 lg:grid-cols-3">
            {[
              ["Dealer ID", d.id],
              ["User ID", d.user_id],
              ["Dealership Name", d.dealership_name],
              ["Owner Name", d.owner_name || "—"],
              ["Email", d.email || "—"],
              ["Phone", d.phone || "—"],
              ["WhatsApp", d.whatsapp || "—"],
              ["Location", [d.address, d.city, d.state].filter(Boolean).join(", ") || "—"],
              ["Verification Status", ver ?? (d.verified ? "approved" : "not submitted")],
              ["Registration Date", dateOnly(d.created_at)],
            ].map(([k, v]) => (
              <div key={k} className="rounded-lg bg-stone-50 px-3 py-2.5">
                <dt className="text-xs font-medium text-stone-400">{k}</dt>
                <dd className="mt-0.5 break-words font-semibold text-stone-800">{v}</dd>
              </div>
            ))}
          </dl>
          {(d.phone || d.whatsapp) && (
            <div className="flex flex-wrap gap-2 border-t border-stone-100 px-5 py-3">
              {d.phone && (
                <>
                  <a href={telLink(d.phone)} className="rounded-lg bg-stone-900 px-3 py-1.5 text-xs font-semibold text-white">📞 Call</a>
                  <a href={whatsappLink(d.phone, `Hi ${d.owner_name}, Car Connect verification ke baare mein.`)} target="_blank" rel="noopener noreferrer" className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white">💬 WhatsApp</a>
                </>
              )}
              <div className="flex-1" />
              {d.verified ? (
                <Button size="sm" variant="outline" onClick={() => setConfirmAction({ id: d.id, name: d.dealership_name, verified: false })}>
                  Unverify
                </Button>
              ) : (
                <Button size="sm" variant="success" onClick={() => setConfirmAction({ id: d.id, name: d.dealership_name, verified: true })}>
                  ✓ Verify
                </Button>
              )}
            </div>
          )}
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {msg && <p className="rounded-lg bg-stone-100 px-3 py-2 text-sm text-stone-700">{msg}</p>}

      {confirmAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/40 p-4">
          <Card className="w-full max-w-sm p-5">
            <h3 className="font-bold text-stone-900">Verification change confirm karo</h3>
            <p className="mt-1 text-sm text-stone-500">
              {confirmAction.verified
                ? `${confirmAction.name} ko verified dealer banaya jaayega.`
                : `${confirmAction.name} ki verified status hata di jaayegi.`}
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setConfirmAction(null)}>Cancel</Button>
              <Button
                variant={confirmAction.verified ? "success" : "danger"}
                loading={busy[confirmAction.id]}
                onClick={() => {
                  const d = dealers.find((x) => x.id === confirmAction.id);
                  if (d) void toggleVerify(d, confirmAction.verified);
                }}
              >
                Confirm
              </Button>
            </div>
          </Card>
        </div>
      )}

      {confirmDeleteUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/40 p-4">
          <Card className="w-full max-w-sm p-5">
            <h3 className="font-bold text-red-600">⚠ Delete {confirmDeleteUser.type === "dealer" ? "Dealer" : "Customer"}</h3>
            <p className="mt-1 text-sm text-stone-500">
              Kya aap <strong>{confirmDeleteUser.name}</strong> ko delete karna chahte hain?
              <br/><br/>
              Yeh action inka account aur saari related cheezein (cars, listings, offers) permanently hata dega. Yeh wapas nahi aayega!
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setConfirmDeleteUser(null)}>Cancel</Button>
              <Button
                variant="danger"
                loading={busy["del" + confirmDeleteUser.user_id]}
                onClick={() => deleteUserAction(confirmDeleteUser.user_id, confirmDeleteUser.type)}
              >
                Permanently Delete
              </Button>
            </div>
          </Card>
        </div>
      )}

      <div className="lg:grid lg:grid-cols-[210px_1fr] lg:gap-6">
        <nav className="flex gap-1 overflow-x-auto rounded-xl border border-stone-200 bg-white p-1.5 lg:flex-col lg:self-start">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold whitespace-nowrap transition-colors ${
                tab === t.id ? "bg-brand text-white" : "text-stone-600 hover:bg-stone-100"
              }`}
            >
              <span>{t.emoji}</span>
              {t.label}
            </button>
          ))}
        </nav>

        <div className="min-w-0">
          {loadingTab && cache[tab + (tab === "vehicles" ? vehStatus : "")] === undefined ? (
            <div className="flex justify-center py-16">
              <Spinner label="Load ho raha hai…" />
            </div>
          ) : tab === "overview" && summary ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
              {[
                { label: "Total Accounts", value: summary.users },
                { label: "Customers", value: summary.customers },
                { label: "Dealers", value: summary.dealers },
                { label: "Verified Dealers", value: summary.verifiedDealers },
                { label: "Pending Dealers", value: summary.pendingDealers },
                { label: "Total Vehicles", value: summary.vehicles },
                { label: "Customer Sell Requests", value: summary.sellListings },
                { label: "Dealer Offers", value: summary.dealerOffers },
                { label: "Enquiries", value: summary.enquiries },
                { label: "Test Drives", value: summary.testDrives },
              ].map((c) => (
                <Card key={c.label} className="p-4">
                  <p className="text-2xl font-extrabold text-brand-dark">{c.value}</p>
                  <p className="mt-0.5 text-xs font-medium text-stone-500">{c.label}</p>
                </Card>
              ))}
            </div>
          ) : tab === "dealers" ? (
            dealers.length === 0 ? (
              <EmptyState icon="🏢" title="Koi dealer nahi" description="Abhi tak koi dealer registered nahi hai." />
            ) : (
              <DataTable
                cols={["Dealer ID", "Dealership", "Email", "Phone", "Owner", "Verification", "Registered", "Total Cars", "Active", "Sold", "Actions"]}
              >
                {dealers.map((d) => (
                  <tr key={d.id} className="hover:bg-stone-50">
                    <td className="px-3 py-3"><Id id={d.id} /></td>
                    <td className="px-3 py-3">
                      <p className="font-semibold text-stone-900">{d.dealership_name}</p>
                      <button onClick={() => setSelectedDealerId(d.id)} className="text-xs font-medium text-brand hover:underline">
                        Details Dekho →
                      </button>
                    </td>
                    <td className="px-3 py-3 text-stone-600">{d.email || "—"}</td>
                    <td className="px-3 py-3 whitespace-nowrap text-stone-600">{d.phone || "—"}</td>
                    <td className="px-3 py-3 text-stone-600">{d.owner_name || "—"}</td>
                    <td className="px-3 py-3">
                      <Badge status={d.verified ? "approved" : "pending"}>{d.verified ? "Verified" : "Pending"}</Badge>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-stone-600">{dateOnly(d.created_at)}</td>
                    <td className="px-3 py-3 text-stone-700">{d.total_cars}</td>
                    <td className="px-3 py-3 text-stone-700">{d.active_cars}</td>
                    <td className="px-3 py-3 text-stone-700">{d.sold_cars}</td>
                    <td className="px-3 py-3">
                      <div className="flex flex-wrap gap-1.5">
                        <Button size="sm" variant="ghost" onClick={() => setSelectedDealerId(d.id)}>View</Button>
                        {d.verified ? (
                          <Button size="sm" variant="outline" onClick={() => setConfirmAction({ id: d.id, name: d.dealership_name, verified: false })}>
                            Unverify
                          </Button>
                        ) : (
                          <Button size="sm" variant="success" onClick={() => setConfirmAction({ id: d.id, name: d.dealership_name, verified: true })}>
                            ✓ Verify
                          </Button>
                        )}
                        <Button size="sm" variant="danger" onClick={() => setConfirmDeleteUser({ id: d.id, user_id: d.user_id, name: d.dealership_name, type: "dealer" })}>
                          🗑 Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </DataTable>
            )
          ) : tab === "customers" ? (
            customers.length === 0 ? (
              <EmptyState icon="👥" title="Koi customer nahi" description="Abhi tak koi customer registered nahi hai." />
            ) : (
              <DataTable
                cols={["User ID", "Name", "Email", "Phone", "Registered", "Sell Listings", "Favorites", "Enquiries", "Test Drives", "Actions"]}
              >
                {customers.map((c) => (
                  <tr key={c.id} className="hover:bg-stone-50">
                    <td className="px-3 py-3"><Id id={c.id} /></td>
                    <td className="px-3 py-3 font-semibold text-stone-900">{c.full_name || "—"}</td>
                    <td className="px-3 py-3 text-stone-600">{c.email || "—"}</td>
                    <td className="px-3 py-3 whitespace-nowrap text-stone-600">{c.phone || "—"}</td>
                    <td className="px-3 py-3 whitespace-nowrap text-stone-600">{dateOnly(c.created_at)}</td>
                    <td className="px-3 py-3 text-stone-700">{c.sell_listings}</td>
                    <td className="px-3 py-3 text-stone-700">{c.favorites}</td>
                    <td className="px-3 py-3 text-stone-700">{c.enquiries}</td>
                    <td className="px-3 py-3 text-stone-700">{c.test_drives}</td>
                    <td className="px-3 py-3">
                      <Button size="sm" variant="danger" onClick={() => setConfirmDeleteUser({ id: c.id, user_id: c.id, name: c.full_name, type: "customer" })}>
                        🗑 Delete
                      </Button>
                    </td>
                  </tr>
                ))}
              </DataTable>
            )
          ) : tab === "vehicles" ? (
            (() => {
              const filters = ["all", "active", "sold", "rejected", "pending"];
              return (
                <div className="space-y-3">
                  <div className="flex gap-2 overflow-x-auto">
                    {filters.map((f) => (
                      <button
                        key={f}
                        onClick={() => setVehStatus(f)}
                        className={`shrink-0 rounded-full px-3 py-1 text-sm font-semibold transition-colors ${
                          vehStatus === f ? "bg-brand text-white" : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                        }`}
                      >
                        {f[0].toUpperCase() + f.slice(1)}
                      </button>
                    ))}
                  </div>
                  {vehicles.length === 0 ? (
                    <EmptyState icon="🚗" title="Koi car nahi" description="Is status mein koi vehicle nahi hai." />
                  ) : (
                    <DataTable
                      cols={["Vehicle ID", "Dealer", "Brand", "Model", "Variant", "Year", "Price", "KM", "Fuel", "Status", "Created", "Actions"]}
                    >
                      {vehicles.map((v) => (
                        <tr key={v.id} className="hover:bg-stone-50">
                          <td className="px-3 py-3"><Id id={v.id} /></td>
                          <td className="px-3 py-3">
                            <p className="text-stone-700">{v.dealer?.dealership_name ?? "—"}</p>
                            {v.dealer?.verified && <span className="text-xs text-emerald-600">✓ Verified</span>}
                          </td>
                          <td className="px-3 py-3 font-medium text-stone-800">{v.brand}</td>
                          <td className="px-3 py-3 text-stone-600">{v.model}</td>
                          <td className="px-3 py-3 text-stone-600">{v.variant || "—"}</td>
                          <td className="px-3 py-3 text-stone-600">{v.year}</td>
                          <td className="px-3 py-3 whitespace-nowrap font-semibold text-stone-900">{formatINR(v.price)}</td>
                          <td className="px-3 py-3 text-stone-600">{formatKm(v.km)}</td>
                          <td className="px-3 py-3 text-stone-600">{v.fuel}</td>
                          <td className="px-3 py-3"><Badge status={v.status}>{v.status}</Badge></td>
                          <td className="px-3 py-3 whitespace-nowrap text-stone-600">{dateOnly(v.created_at)}</td>
                          <td className="px-3 py-3">
                            <Button size="sm" variant="danger" loading={busy["v" + v.id]} onClick={() => deleteVehicle(v.id)}>
                              🗑 Delete
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </DataTable>
                  )}
                </div>
              );
            })()
          ) : tab === "sell" ? (
            sell.length === 0 ? (
              <EmptyState icon="💰" title="Koi sell request nahi" description="Customer sell requests yahan dikhengi." />
            ) : (
              <DataTable
                cols={["Listing ID", "Customer", "Vehicle", "Year", "KM", "Expected", "City", "Status", "Offers", "Created"]}
              >
                {sell.map((l) => (
                  <tr key={l.id} className="hover:bg-stone-50">
                    <td className="px-3 py-3"><Id id={l.id} /></td>
                    <td className="px-3 py-3">
                      <p className="text-stone-700">{l.owner?.full_name ?? "—"}</p>
                      {l.owner?.phone && <p className="text-xs text-stone-400">{l.owner.phone}</p>}
                    </td>
                    <td className="px-3 py-3 font-medium text-stone-800">{l.brand} {l.model} <span className="font-normal text-stone-500">{l.variant}</span></td>
                    <td className="px-3 py-3 text-stone-600">{l.year}</td>
                    <td className="px-3 py-3 text-stone-600">{formatKm(l.km)}</td>
                    <td className="px-3 py-3 whitespace-nowrap font-semibold text-stone-900">{formatINR(l.expected_price)}</td>
                    <td className="px-3 py-3 text-stone-600">{l.city || "—"}</td>
                    <td className="px-3 py-3"><Badge status={l.status}>{l.status}</Badge></td>
                    <td className="px-3 py-3 text-stone-700">{l.offers?.length ?? 0}</td>
                    <td className="px-3 py-3 whitespace-nowrap text-stone-600">{dateOnly(l.created_at)}</td>
                    <td className="px-3 py-3">
                      <Button size="sm" variant="danger" loading={busy["s" + l.id]} onClick={() => deleteSellListing(l.id)}>
                        🗑 Delete
                      </Button>
                    </td>
                  </tr>
                ))}
              </DataTable>
            )
          ) : tab === "offers" ? (
            offers.length === 0 ? (
              <EmptyState icon="🤝" title="Koi offer nahi" description="Dealers ke bheje offers yahan dikhenge." />
            ) : (
              <DataTable cols={["Offer ID", "Sell Listing", "Dealer", "Offer Price", "Status", "Created"]}>
                {offers.map((o) => (
                  <tr key={o.id} className="hover:bg-stone-50">
                    <td className="px-3 py-3"><Id id={o.id} /></td>
                    <td className="px-3 py-3">
                      {o.listing ? (
                        <span className="text-stone-800">{o.listing.brand} {o.listing.model} <span className="text-stone-500">{o.listing.variant}</span></span>
                      ) : "—"}
                      {o.owner?.phone && <span className="block text-xs text-stone-400">{o.owner.phone}</span>}
                    </td>
                    <td className="px-3 py-3">
                      <p className="text-stone-700">{o.dealer?.dealership_name ?? "—"}</p>
                      {o.dealer?.verified && <span className="text-xs text-emerald-600">✓</span>}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap font-semibold text-stone-900">{formatINR(o.offer_price)}</td>
                    <td className="px-3 py-3"><Badge status={o.status}>{o.status}</Badge></td>
                    <td className="px-3 py-3 whitespace-nowrap text-stone-600">{timeAgo(o.created_at)}</td>
                  </tr>
                ))}
              </DataTable>
            )
          ) : tab === "enquiries" ? (
            enquiries.length === 0 ? (
              <EmptyState icon="💬" title="Koi enquiry nahi" description="Customers ke enquiries yahan dikhenge." />
            ) : (
              <DataTable cols={["ID", "Car", "Dealer", "Customer", "Phone", "Type", "Message", "Created"]}>
                {enquiries.map((e) => (
                  <tr key={e.id} className="hover:bg-stone-50">
                    <td className="px-3 py-3"><Id id={e.id} /></td>
                    <td className="px-3 py-3 text-stone-800">
                      {e.vehicle ? `${e.vehicle.brand} ${e.vehicle.model} ${e.vehicle.variant ?? ""}` : "—"}
                    </td>
                    <td className="px-3 py-3 text-stone-600">{e.dealer ?? "—"}</td>
                    <td className="px-3 py-3 font-medium text-stone-800">{e.name}</td>
                    <td className="px-3 py-3 whitespace-nowrap text-stone-600">{e.phone}</td>
                    <td className="px-3 py-3"><Badge status={e.type}>{e.type}</Badge></td>
                    <td className="max-w-[240px] truncate px-3 py-3 text-stone-600" title={e.message}>{e.message || "—"}</td>
                    <td className="px-3 py-3 whitespace-nowrap text-stone-600">{timeAgo(e.created_at)}</td>
                  </tr>
                ))}
              </DataTable>
            )
          ) : tab === "testdrives" ? (
            testDrives.length === 0 ? (
              <EmptyState icon="🔑" title="Koi test drive nahi" description="Test drive requests yahan dikhengi." />
            ) : (
              <DataTable cols={["ID", "Car", "Dealer", "Customer", "Phone", "Preferred", "Status", "Created"]}>
                {testDrives.map((t) => (
                  <tr key={t.id} className="hover:bg-stone-50">
                    <td className="px-3 py-3"><Id id={t.id} /></td>
                    <td className="px-3 py-3 text-stone-800">
                      {t.vehicle ? `${t.vehicle.brand} ${t.vehicle.model} ${t.vehicle.variant ?? ""}` : "—"}
                    </td>
                    <td className="px-3 py-3 text-stone-600">{t.dealer ?? "—"}</td>
                    <td className="px-3 py-3 font-medium text-stone-800">{t.name}</td>
                    <td className="px-3 py-3 whitespace-nowrap text-stone-600">{t.phone}</td>
                    <td className="px-3 py-3 whitespace-nowrap text-stone-600">
                      {dateOnly(t.preferred_date)}
                      {t.preferred_time ? ` · ${t.preferred_time}` : ""}
                    </td>
                    <td className="px-3 py-3"><Badge status={t.status}>{t.status}</Badge></td>
                    <td className="px-3 py-3 whitespace-nowrap text-stone-600">{timeAgo(t.created_at)}</td>
                  </tr>
                ))}
              </DataTable>
            )
          ) : tab === "demand" ? (
            demandClusters.length === 0 && signals.length === 0 && matchRows.length === 0 && notificationRows.length === 0 ? (
              <EmptyState icon="🔥" title="Koi demand nahi" description="Customer demands jo inventory se match nahi hoti, yahan dikhengi." />
            ) : (
              <div className="space-y-6">
                {demandClusters.length > 0 && (
                  <div>
                    <h3 className="mb-2 text-sm font-semibold text-stone-700">
                      Aggregated demand ({demandClusters.length})
                    </h3>
                    <DataTable cols={["Requirement", "Fuel", "Budget", "Location", "Customers", "Touches", "Last", "Action"]}>
                      {demandClusters.map((c) => (
                        <tr key={c.cluster_key} className="hover:bg-stone-50">
                          <td className="px-3 py-3 font-semibold text-stone-900">
                            {(`${c.brand} ${c.model}`.trim() || "Any car")}
                          </td>
                          <td className="px-3 py-3 text-stone-600">{c.fuel || "—"}</td>
                          <td className="px-3 py-3 whitespace-nowrap text-stone-600">
                            {c.max_price ? formatINR(c.max_price) : "—"}
                            {c.min_year ? ` · ${c.min_year}+` : ""}
                          </td>
                          <td className="px-3 py-3 text-stone-600">{c.city || "All India"}</td>
                          <td className="px-3 py-3 font-bold text-stone-900">{c.customers}</td>
                          <td className="px-3 py-3 text-stone-600">{c.signals}</td>
                          <td className="px-3 py-3 whitespace-nowrap text-stone-600">{timeAgo(c.last_requested)}</td>
                          <td className="px-3 py-3">
                            <Button
                              variant="outline"
                              size="sm"
                              loading={busy["d" + c.cluster_key]}
                              onClick={() => deleteDemandCluster(c.cluster_key)}
                            >
                              Delete
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </DataTable>
                  </div>
                )}
                <div>
                  <h3 className="mb-2 text-sm font-semibold text-stone-700">
                    Raw signals ({signals.length}) — admin access only
                  </h3>
                  <DataTable cols={["ID", "Requirement", "Source", "Status", "Brand", "Fuel", "Price", "City", "User", "Created"]}>
                    {signals.map((dg) => (
                      <tr key={dg.id} className="hover:bg-stone-50">
                        <td className="px-3 py-3"><Id id={dg.id} /></td>
                        <td className="max-w-[240px] truncate px-3 py-3 text-stone-600" title={dg.raw_requirement}>
                          {dg.raw_requirement || "—"}
                        </td>
                        <td className="px-3 py-3 text-stone-600">{dg.source}</td>
                        <td className="px-3 py-3"><Badge status={dg.status}>{dg.status}</Badge></td>
                        <td className="px-3 py-3 text-stone-600">{dg.brand || "—"}</td>
                        <td className="px-3 py-3 text-stone-600">{dg.fuel || "—"}</td>
                        <td className="px-3 py-3 whitespace-nowrap text-stone-600">
                          {dg.max_price ? formatINR(dg.max_price) : "—"}
                        </td>
                        <td className="px-3 py-3 text-stone-600">{dg.city || "—"}</td>
                        <td className="px-3 py-3"><Id id={dg.user_id} /></td>
                        <td className="px-3 py-3 whitespace-nowrap text-stone-600">{timeAgo(dg.created_at)}</td>
                      </tr>
                    ))}
                  </DataTable>
                </div>

                {matchRows.length > 0 && (
                  <div>
                    <h3 className="mb-2 text-sm font-semibold text-stone-700">
                      Stock matches ({matchRows.length}) — demand ↔ vehicle
                    </h3>
                    <DataTable cols={["Match", "Demand", "Vehicle", "Created"]}>
                      {matchRows.map((m) => (
                        <tr key={m.id} className="hover:bg-stone-50">
                          <td className="px-3 py-3"><Id id={m.id} /></td>
                          <td className="px-3 py-3"><Id id={m.demand_id} /></td>
                          <td className="px-3 py-3"><Id id={m.vehicle_id} /></td>
                          <td className="px-3 py-3 whitespace-nowrap text-stone-600">{timeAgo(m.created_at)}</td>
                        </tr>
                      ))}
                    </DataTable>
                  </div>
                )}

                {notificationRows.length > 0 && (
                  <div>
                    <h3 className="mb-2 text-sm font-semibold text-stone-700">
                      Notifications ({notificationRows.length}) — admin access only
                    </h3>
                    <DataTable cols={["ID", "Title", "Message", "Demand", "Vehicle", "User", "Read", "Created"]}>
                      {notificationRows.map((n) => (
                        <tr key={n.id} className="hover:bg-stone-50">
                          <td className="px-3 py-3"><Id id={n.id} /></td>
                          <td className="px-3 py-3 font-semibold text-stone-900">{n.title || "—"}</td>
                          <td className="max-w-[240px] truncate px-3 py-3 text-stone-600" title={n.message}>
                            {n.message || "—"}
                          </td>
                          <td className="px-3 py-3"><Id id={n.demand_id ?? ""} /></td>
                          <td className="px-3 py-3"><Id id={n.vehicle_id ?? ""} /></td>
                          <td className="px-3 py-3"><Id id={n.user_id} /></td>
                          <td className="px-3 py-3">
                            <Badge status={n.read_at ? "accepted" : "open"}>
                              {n.read_at ? "Read" : "Unread"}
                            </Badge>
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap text-stone-600">{timeAgo(n.created_at)}</td>
                        </tr>
                      ))}
                    </DataTable>
                  </div>
                )}
              </div>
            )
          ) : null}
        </div>
      </div>
    </div>
  );
}