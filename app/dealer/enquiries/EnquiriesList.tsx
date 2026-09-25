"use client";

import { useEffect, useState } from "react";
import { Badge, Button, EmptyState } from "@/components/ui";
import { telLink, timeAgo, whatsappLink } from "@/lib/format";

interface VehicleRef {
  brand?: string;
  model?: string;
  year?: number;
  id?: string;
}

interface Enquiry {
  id: string;
  name: string;
  phone: string;
  message: string;
  type: string;
  created_at: string;
  followup_choice?: string | null;
  next_followup_at?: string | null;
  vehicle?: VehicleRef | null;
}

const FOLLOWUP_OPTIONS: { value: string; label: string }[] = [
  { value: "interested", label: "👍 Interested — 2 din mein call" },
  { value: "baad_mein", label: "🕒 Baad mein — 1 hafte mein" },
  { value: "nahi_banega", label: "⛔ Nahi banega — band" },
  { value: "aa_raha_hoon", label: "🚗 Test drive decide — done" },
];

interface TestDrive {
  id: string;
  name: string;
  phone: string;
  preferred_date: string | null;
  preferred_time: string;
  status: string;
  created_at: string;
  vehicle?: VehicleRef | null;
}

export function EnquiriesList({
  enquiries,
  testDrives,
}: {
  enquiries: Enquiry[];
  testDrives: TestDrive[];
}) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [dueToday, setDueToday] = useState(0);

  // Fresh on mount and every 60s: a follow-up is "due today" once its
  // next_followup_at has arrived.
  useEffect(() => {
    const compute = () =>
      setDueToday(
        enquiries.filter(
          (e) => e.next_followup_at && new Date(e.next_followup_at).getTime() <= Date.now(),
        ).length,
      );
    compute();
    const id = window.setInterval(compute, 60_000);
    return () => window.clearInterval(id);
  }, [enquiries]);

  async function remove(path: string, id: string) {
    setBusyId(id);
    try {
      await fetch(path, { method: "DELETE" });
      window.location.reload();
    } finally {
      setBusyId(null);
    }
  }

  async function setFollowup(id: string, choice: string) {
    setBusyId(id);
    try {
      await fetch(`/api/enquiries/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ followup_choice: choice }),
        headers: { "content-type": "application/json" },
      });
      window.location.reload();
    } finally {
      setBusyId(null);
    }
  }

  const carTitle = (vehicle?: VehicleRef | null) =>
    vehicle ? `${vehicle.brand ?? ""} ${vehicle.model ?? ""} (${vehicle.year ?? ""})` : "Car";

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-semibold text-stone-900">Enquiries ({enquiries.length})</h3>
        {dueToday > 0 && (
          <div className="mt-2 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-900">
            🔔 Aaj call karne hain ({dueToday}) — inke follow-up aaj due hain.
          </div>
        )}
        <div className="mt-2 space-y-2">
          {enquiries.length === 0 && (
            <EmptyState icon="📭" title="Koi enquiry nahi" description="Jab customers aapki cars pe interest dikhayenge, yahan dikhegi." />
          )}
          {enquiries.map((enq) => (
            <div key={enq.id}>
              <div className="flex flex-col gap-2 rounded-xl border border-stone-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-stone-900">{enq.name}</span>
                  <span className="text-xs text-stone-400">{timeAgo(enq.created_at)}</span>
                </div>
                <p className="text-sm text-stone-500">
                  Car: <span className="font-medium">{carTitle(enq.vehicle)}</span>
                </p>
                {enq.message && <p className="mt-1 text-sm text-stone-600">“{enq.message}”</p>}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <a href={telLink(enq.phone)} className="rounded-lg bg-stone-900 px-3 py-1.5 text-sm font-semibold text-white">
                  📞 Call
                </a>
                <a href={whatsappLink(enq.phone, `Hi ${enq.name}, main aapke Car Connect enquiry ka reply de raha hoon.`)} target="_blank" rel="noopener noreferrer" className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white">
                  💬 WhatsApp
                </a>
                <Button variant="ghost" size="sm" loading={busyId === enq.id} onClick={() => remove(`/api/enquiries/${enq.id}`, enq.id)}>
                  ✕
                </Button>
              </div>
            </div>
            <div className="mt-1 rounded-lg bg-stone-50 p-2">
              <p className="text-xs font-medium text-stone-500">Follow-up:</p>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {FOLLOWUP_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    disabled={busyId === enq.id}
                    onClick={() => setFollowup(enq.id, opt.value)}
                    className={`rounded-lg px-2 py-1 text-xs font-medium transition ${
                      enq.followup_choice === opt.value
                        ? "bg-stone-900 text-white"
                        : "bg-white text-stone-600 ring-1 ring-stone-200 hover:bg-stone-100"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ))}
        </div>
      </div>
      <div>
        <h3 className="font-semibold text-stone-900">Test Drive Requests ({testDrives.length})</h3>
        <div className="mt-2 space-y-2">
          {testDrives.length === 0 && (
            <p className="rounded-lg bg-stone-50 px-3 py-4 text-sm text-stone-500">
              Abhi koi test drive request nahi.
            </p>
          )}
          {testDrives.map((td) => (
            <div key={td.id} className="flex flex-col gap-2 rounded-xl border border-stone-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-stone-900">{td.name}</span>
                  <Badge status={td.status}>{td.status}</Badge>
                </div>
                <p className="text-sm text-stone-500">
                  {carTitle(td.vehicle)} · {td.preferred_date ?? "koi bhi date"} {td.preferred_time && `· ${td.preferred_time}`}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <a href={telLink(td.phone)} className="rounded-lg bg-stone-900 px-3 py-1.5 text-sm font-semibold text-white">📞 Call</a>
                <a href={whatsappLink(td.phone, `Hi ${td.name}, test drive slot confirm karne ke liye message kiya tha.`)} target="_blank" rel="noopener noreferrer" className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white">💬 WhatsApp</a>
                <Button variant="ghost" size="sm" loading={busyId === td.id} onClick={() => remove(`/api/test-drives/${td.id}`, td.id)}>✕</Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-lg bg-brand-light px-3 py-2 text-xs text-brand-dark">
        💡 Enquiries ka jaldi reply do — jo dealer turant jawab deta hai, usse zyada sales hoti hai!
      </div>
    </div>
  );
}