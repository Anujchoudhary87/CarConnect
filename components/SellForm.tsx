"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Card, FieldError, Input, Label, Select, Textarea } from "@/components/ui";
import { PhotoUpload } from "@/components/PhotoUpload";
import { LocationPicker, type PickedLocation } from "@/components/LocationPicker";
import { BRANDS, FUELS, OWNERS, TRANSMISSIONS, yearOptions } from "@/lib/constants";

export function SellForm() {
  const router = useRouter();
  const [form, setForm] = useState({
    brand: "",
    model: "",
    variant: "",
    year: "",
    km: "",
    fuel: "",
    owner: "",
    transmission: "",
    expected_price: "",
    city: "",
    description: "",
    contact_name: "",
    contact_phone: "",
  });
  const [photos, setPhotos] = useState<string[]>([]);
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [createdId, setCreatedId] = useState<string | null>(null);

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const res = await fetch("/api/sell-listings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          year: Number(form.year),
          km: Number(form.km),
          expected_price: Number(form.expected_price),
          lat,
          lng,
          photos,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Submit nahi hua");
      setCreatedId(data.listing.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Submit nahi hua");
      setSaving(false);
    }
  }

  if (createdId) {
    return (
      <Card className="mx-auto max-w-lg p-8 text-center">
        <span className="text-5xl">🎉</span>
        <h2 className="mt-3 text-xl font-bold text-stone-900">Listing is live!</h2>
        <p className="mt-1 text-sm text-stone-500">
          Aapke area ke verified dealers ab aapki gaadi dekh sakte hain aur offers bhejenge.
        </p>
        <div className="mt-6 flex flex-col gap-2">
          <Button onClick={() => router.push(`/sell/${createdId}`)}>View Listing & Offers</Button>
          <Button variant="outline" onClick={() => router.push("/sell/my-listings")}>
            My Listings
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <Card className="p-5">
        <h2 className="font-semibold text-stone-900">Apni Gaadi Ke Details 🚗</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="brand">Brand *</Label>
            <Select id="brand" required value={form.brand} onChange={set("brand")}>
              <option value="">Select brand</option>
              {BRANDS.map((b) => <option key={b} value={b}>{b}</option>)}
            </Select>
          </div>
          <div>
            <Label htmlFor="model">Model *</Label>
            <Input id="model" required value={form.model} onChange={set("model")} placeholder="e.g. Alto" />
          </div>
          <div>
            <Label htmlFor="variant">Variant</Label>
            <Input id="variant" value={form.variant} onChange={set("variant")} placeholder="e.g. LXi" />
          </div>
          <div>
            <Label htmlFor="year">Year *</Label>
            <Select id="year" required value={form.year} onChange={set("year")}>
              <option value="">Select year</option>
              {yearOptions().map((y) => <option key={y} value={y}>{y}</option>)}
            </Select>
          </div>
          <div>
            <Label htmlFor="km">Kilometres *</Label>
            <Input id="km" type="number" required min={0} value={form.km} onChange={set("km")} placeholder="60000" />
          </div>
          <div>
            <Label htmlFor="fuel">Fuel *</Label>
            <Select id="fuel" required value={form.fuel} onChange={set("fuel")}>
              <option value="">Select fuel</option>
              {FUELS.map((f) => <option key={f} value={f}>{f}</option>)}
            </Select>
          </div>
          <div>
            <Label htmlFor="owner">Owner *</Label>
            <Select id="owner" required value={form.owner} onChange={set("owner")}>
              <option value="">Select owner</option>
              {OWNERS.map((o) => <option key={o} value={o}>{o} Owner</option>)}
            </Select>
          </div>
          <div>
            <Label htmlFor="transmission">Transmission</Label>
            <Select id="transmission" value={form.transmission} onChange={set("transmission")}>
              <option value="">Select</option>
              {TRANSMISSIONS.map((t) => <option key={t} value={t}>{t}</option>)}
            </Select>
          </div>
          <div>
            <Label htmlFor="expected_price">Expected Price (₹) *</Label>
            <Input id="expected_price" type="number" required min={0} step={1000} value={form.expected_price} onChange={set("expected_price")} placeholder="400000" />
          </div>
          <div>
            <Label htmlFor="city">City/Location</Label>
            <Input id="city" value={form.city} onChange={set("city")} placeholder="Delhi" />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" rows={3} value={form.description} onChange={set("description")} placeholder="Service history, tyres, any scratches — details batane se behtar price milega." />
          </div>
        </div>
      </Card>

      <Card className="p-5">
        <h2 className="font-semibold text-stone-900">Photos</h2>
        <div className="mt-3">
          <PhotoUpload urls={photos} onChange={setPhotos} folder="sell-listings" />
        </div>
      </Card>

      <Card className="p-5">
        <h2 className="font-semibold text-stone-900">Location (optional)</h2>
        <div className="mt-3">
          <LocationPicker lat={lat} lng={lng} onChange={(loc: PickedLocation) => {
            setLat(loc.lat);
            setLng(loc.lng);
            setForm((f) => ({ ...f, city: loc.city || f.city }));
          }} />
        </div>
      </Card>

      <Card className="p-5">
        <h2 className="font-semibold text-stone-900">Contact Details</h2>
        <p className="mt-1 text-xs text-stone-400">Dealers inke through aapse contact karenge.</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="contact_name">Your Name *</Label>
            <Input id="contact_name" required value={form.contact_name} onChange={set("contact_name")} placeholder="Rajesh Kumar" />
          </div>
          <div>
            <Label htmlFor="contact_phone">Phone / WhatsApp *</Label>
            <Input id="contact_phone" type="tel" required pattern="[0-9+ ]{10,15}" value={form.contact_phone} onChange={set("contact_phone")} placeholder="98765 43210" />
          </div>
        </div>
      </Card>

      <FieldError message={error} />
      <Button type="submit" loading={saving} className="w-full" size="lg">
        List Your Car →
      </Button>
      <p className="text-center text-xs text-stone-400">
        Listing submit karte hi aapke area ke verified dealers ko dikhne lagegi.
      </p>
    </form>
  );
}