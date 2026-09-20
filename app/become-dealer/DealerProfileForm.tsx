"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { Dealer, DealerVerification } from "@/lib/types";
import { Button, Card, FieldError, Input, Label, Select, Spinner, Textarea } from "@/components/ui";
import { LocationPicker, type PickedLocation } from "@/components/LocationPicker";
import { DocUpload } from "@/components/DocUpload";
import { BUSINESS_TYPES } from "@/lib/constants";

const empty = {
  dealership_name: "",
  owner_name: "",
  phone: "",
  whatsapp: "",
  email: "",
  business_type: "showroom",
  gstin: "",
  city: "",
  state: "",
  address: "",
  lat: null as number | null,
  lng: null as number | null,
  bio: "",
};

export function DealerProfileForm() {
  const router = useRouter();
  const [form, setForm] = useState<typeof empty>(empty);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [locationLabel, setLocationLabel] = useState("");
  const [idProof, setIdProof] = useState("");
  const [businessProof, setBusinessProof] = useState("");
  const [verifNotes, setVerifNotes] = useState("");

  useEffect(() => {
    fetch("/api/dealer/profile")
      .then((r) => r.json())
      .then((d) => {
        if (d.dealer) {
          const de: Dealer = d.dealer;
          setForm({
            dealership_name: de.dealership_name,
            owner_name: de.owner_name,
            phone: de.phone,
            whatsapp: de.whatsapp,
            email: de.email,
            business_type: de.business_type,
            gstin: de.gstin,
            city: de.city,
            state: de.state,
            address: de.address,
            lat: de.lat,
            lng: de.lng,
            bio: de.bio,
          });
          setLocationLabel(de.city || "");
        }
      })
      .finally(() => setLoading(false));

    fetch("/api/dealer/verification")
      .then((r) => r.json())
      .then((d: { verification?: DealerVerification }) => {
        if (d.verification) {
          setIdProof(d.verification.id_proof_path);
          setBusinessProof(d.verification.business_proof_path);
          setVerifNotes(d.verification.notes);
        }
      })
      .catch(() => {});
  }, []);

  const set = (key: keyof typeof empty) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  async function save() {
    setError("");
    setSaving(true);
    try {
      const res = await fetch("/api/dealer/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Save failed");

      await fetch("/api/dealer/verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id_proof_path: idProof,
          business_proof_path: businessProof,
          notes: verifNotes,
        }),
      }).catch(() => {});

      router.push("/dealer");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save profile");
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner label="Loading…" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-bold text-stone-900">Become a Dealer 🏪</h1>
      <p className="mt-1 text-sm text-stone-500">
        Apni dealership ki details bharo. Verification ke baad aap customers ko dikhayi doge aur unki
        sell-your-car listings par offers bhej sakoge.
      </p>

      <div className="mt-6 space-y-6">
        <Card className="p-5">
          <h2 className="font-semibold text-stone-900">Dealership Details</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label htmlFor="dealership_name">Dealership Name *</Label>
              <Input id="dealership_name" required value={form.dealership_name} onChange={set("dealership_name")} placeholder="e.g. Sharma Motors" />
            </div>
            <div>
              <Label htmlFor="owner_name">Owner Name</Label>
              <Input id="owner_name" value={form.owner_name} onChange={set("owner_name")} placeholder="Your name" />
            </div>
            <div>
              <Label htmlFor="business_type">Business Type</Label>
              <Select id="business_type" value={form.business_type} onChange={set("business_type")}>
                {BUSINESS_TYPES.map((b) => (
                  <option key={b.value} value={b.value}>{b.label}</option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" type="tel" value={form.phone} onChange={set("phone")} placeholder="98765 43210" />
            </div>
            <div>
              <Label htmlFor="whatsapp">WhatsApp</Label>
              <Input id="whatsapp" type="tel" value={form.whatsapp} onChange={set("whatsapp")} placeholder="98765 43210" />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={form.email} onChange={set("email")} placeholder="dealer@example.com" />
            </div>
            <div>
              <Label htmlFor="gstin">GSTIN (optional)</Label>
              <Input id="gstin" value={form.gstin} onChange={set("gstin")} placeholder="22AAAAA0000A1Z5" />
            </div>
            <div>
              <Label htmlFor="city">City</Label>
              <Input id="city" value={form.city} onChange={set("city")} placeholder="Jaipur" />
            </div>
            <div>
              <Label htmlFor="state">State</Label>
              <Input id="state" value={form.state} onChange={set("state")} placeholder="Rajasthan" />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="address">Address</Label>
              <Input id="address" value={form.address} onChange={set("address")} placeholder="Shop number, area, city" />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="bio">About your dealership</Label>
              <Textarea id="bio" rows={3} value={form.bio} onChange={set("bio")} placeholder="Kuch lines apni dealership ke baare mein…" />
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="font-semibold text-stone-900">Location (map pe pin karo)</h2>
          <p className="mt-1 text-xs text-stone-400">Isse customers ko distance dikhayi degi.</p>
          <div className="mt-4">
            <LocationPicker
              lat={form.lat}
              lng={form.lng}
              label={locationLabel}
              onChange={(loc: PickedLocation) => {
                setForm((f) => ({ ...f, lat: loc.lat, lng: loc.lng, city: loc.city || f.city }));
                setLocationLabel(loc.label);
              }}
            />
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="font-semibold text-stone-900">Verification Documents</h2>
          <p className="mt-1 text-xs text-stone-400">
            Optional for MVP – photo of your ID (Aadhaar / PAN) and business proof. Verified dealers get a
            badge and access to customer sell listings.
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <Label>ID Proof (Aadhaar / PAN)</Label>
              <div className="mt-1.5">
                <DocUpload folder={`verification/${Date.now()}`} value={idProof} onChange={setIdProof} label="Upload ID proof" />
              </div>
            </div>
            <div>
              <Label>Business Proof (optional)</Label>
              <div className="mt-1.5">
                <DocUpload folder={`verification/${Date.now()}`} value={businessProof} onChange={setBusinessProof} label="Upload business proof" />
              </div>
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="verifNotes">Extra note for verification</Label>
              <Textarea id="verifNotes" rows={2} value={verifNotes} onChange={(e) => setVerifNotes(e.target.value)} />
            </div>
          </div>
        </Card>

        <FieldError message={error} />

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={() => router.push("/dealer")}>
            Skip for now
          </Button>
          <Button onClick={save} loading={saving}>
            Save Dealer Profile →
          </Button>
        </div>
      </div>
    </div>
  );
}