"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Dealer, Vehicle } from "@/lib/types";
import { Button, Card, Input, Label, Textarea } from "@/components/ui";
import { telLink, whatsappLink } from "@/lib/format";

export function ContactBar({
  vehicle,
  dealer,
  isFavorite,
}: {
  vehicle: Vehicle;
  dealer: Dealer | null;
  isFavorite: boolean;
}) {
  const router = useRouter();
  const [favoriteState, setFavoriteState] = useState(isFavorite);
  const [panel, setPanel] = useState<"enquiry" | "test" | null>(null);
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [preferredDate, setPreferredDate] = useState("");
  const [preferredTime, setPreferredTime] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  const phone = dealer?.phone || dealer?.whatsapp || "";

  async function post(url: string, body: Record<string, unknown>) {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.status === 401) {
      router.push(`/auth/login?next=/cars/${vehicle.id}`);
      return null;
    }
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Something went wrong");
    return data;
  }

  async function sendEnquiry(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const data = await post("/api/enquiries", { vehicle_id: vehicle.id, message, name });
      if (data) {
        setSent(true);
        setPanel(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send");
    } finally {
      setBusy(false);
    }
  }

  async function sendTestDrive(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const data = await post("/api/test-drives", {
        vehicle_id: vehicle.id,
        preferred_date: preferredDate,
        preferred_time: preferredTime,
        name,
      });
      if (data) {
        setSent(true);
        setPanel(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send");
    } finally {
      setBusy(false);
    }
  }

  async function favorite() {
    const data = await post("/api/favorites", { vehicle_id: vehicle.id });
    if (data) {
      setFavoriteState(data.favorite);
    }
  }

  return (
    <div className="space-y-3">
      {sent && (
        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          ✅ Request sent! Dealer aapse jald contact karega.
        </p>
      )}

      <div className="grid grid-cols-2 gap-2">
        {phone && (
          <>
            <a
              href={telLink(phone)}
              className="flex items-center justify-center gap-2 rounded-lg bg-stone-900 px-3 py-2.5 text-sm font-semibold text-white hover:bg-stone-800"
            >
              📞 Call Dealer
            </a>
            <a
              href={whatsappLink(phone, `Hi, main ${vehicle.brand} ${vehicle.model} (${vehicle.year}) ke baare mein poochh raha tha.`)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-3 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
            >
              💬 WhatsApp
            </a>
          </>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Button variant="outline" onClick={() => setPanel(panel === "enquiry" ? null : "enquiry")}>
          ✉️ Send Enquiry
        </Button>
        <Button variant="outline" onClick={() => setPanel(panel === "test" ? null : "test")}>
          🚗 Test Drive
        </Button>
      </div>

      <Button variant="outline" onClick={favorite} className="w-full">
        {favoriteState ? "❤️ Saved — tap to remove" : "♡ Save this car"}
      </Button>

      {panel === "enquiry" && (
        <Card className="p-4">
          <h3 className="font-semibold text-stone-900">Send Enquiry</h3>
          <form onSubmit={sendEnquiry} className="mt-3 space-y-3">
            <div>
              <Label htmlFor="enq-name">Your name</Label>
              <Input id="enq-name" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
            </div>
            <div>
              <Label htmlFor="enq-msg">Message</Label>
              <Textarea id="enq-msg" rows={3} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Gaadi available hai? Random price negotiate kar sakte hain?" />
            </div>
            {error && <p className="text-xs text-red-600">{error}</p>}
            <Button type="submit" loading={busy} className="w-full">Send Enquiry</Button>
          </form>
        </Card>
      )}

      {panel === "test" && (
        <Card className="p-4">
          <h3 className="font-semibold text-stone-900">Request Test Drive</h3>
          <form onSubmit={sendTestDrive} className="mt-3 space-y-3">
            <div>
              <Label htmlFor="td-name">Your name</Label>
              <Input id="td-name" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="td-date">Preferred date</Label>
                <Input id="td-date" type="date" value={preferredDate} onChange={(e) => setPreferredDate(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="td-time">Preferred time</Label>
                <Input id="td-time" type="time" value={preferredTime} onChange={(e) => setPreferredTime(e.target.value)} />
              </div>
            </div>
            {error && <p className="text-xs text-red-600">{error}</p>}
            <Button type="submit" loading={busy} className="w-full">Request Test Drive</Button>
          </form>
        </Card>
      )}
    </div>
  );
}