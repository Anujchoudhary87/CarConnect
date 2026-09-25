"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Vehicle } from "@/lib/types";
import {
  Button,
  Card,
  FieldError,
  Input,
  Label,
  Select,
  Textarea,
} from "@/components/ui";
import { PhotoUpload } from "@/components/PhotoUpload";
import { LocationPicker, type PickedLocation } from "@/components/LocationPicker";
import { BRANDS, FUELS, OWNERS, TRANSMISSIONS, yearOptions } from "@/lib/constants";
import { formatINR } from "@/lib/format";

interface CarFormProps {
  initial?: { vehicle: Vehicle; images: string[] };
}

export function CarForm({ initial }: CarFormProps) {
  const router = useRouter();
  const editing = Boolean(initial);
  const v = initial?.vehicle;

  const [form, setForm] = useState({
    brand: v?.brand ?? "",
    model: v?.model ?? "",
    variant: v?.variant ?? "",
    year: v?.year?.toString() ?? "",
    fuel: v?.fuel ?? "",
    km: v?.km?.toString() ?? "",
    owner: v?.owner ?? "",
    transmission: v?.transmission ?? "",
    price: v?.price?.toString() ?? "",
    downPayment: v?.down_payment?.toString() ?? "",
    financeRate: v?.finance_interest_rate?.toString() ?? "",
    seatingCapacity: v?.seating_capacity?.toString() ?? "",
    city: v?.city ?? "",
    description: v?.description ?? "",
  });
  const [lat, setLat] = useState<number | null>(v?.lat ?? null);
  const [lng, setLng] = useState<number | null>(v?.lng ?? null);
  const [locationLabel, setLocationLabel] = useState(v?.city ?? "");
  const [images, setImages] = useState<string[]>(initial?.images ?? []);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const seatingText = form.seatingCapacity.trim();
    const seatingCapacity = seatingText === "" ? null : Number(seatingText);
    if (seatingCapacity !== null && (!Number.isInteger(seatingCapacity) || seatingCapacity < 1)) {
      setError("Seating capacity positive whole number hona chahiye.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...form,
        year: Number(form.year),
        km: Number(form.km),
        price: Number(form.price),
        down_payment: form.downPayment.trim() === "" ? null : Number(form.downPayment),
        finance_interest_rate: form.financeRate.trim() === "" ? null : Number(form.financeRate),
        seating_capacity: seatingCapacity,
        lat,
        lng,
        images,
      };
      const res = await fetch(editing ? `/api/vehicles/${v!.id}` : "/api/vehicles", {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Save nahi hua");
      router.push("/dealer/cars");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Car save nahi hui");
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <Card className="p-5">
        <h2 className="font-semibold text-stone-900">Car Details</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="brand">Brand *</Label>
            <Select id="brand" required value={form.brand} onChange={set("brand")}>
              <option value="">Brand chuno</option>
              {BRANDS.map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="model">Model *</Label>
            <Input id="model" required value={form.model} onChange={set("model")} placeholder="e.g. Swift" />
          </div>
          <div>
            <Label htmlFor="variant">Variant</Label>
            <Input id="variant" value={form.variant} onChange={set("variant")} placeholder="e.g. VXI CNG" />
          </div>
          <div>
            <Label htmlFor="year">Year *</Label>
            <Select id="year" required value={form.year} onChange={set("year")}>
              <option value="">Year chuno</option>
              {yearOptions().map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="fuel">Fuel *</Label>
            <Select id="fuel" required value={form.fuel} onChange={set("fuel")}>
              <option value="">Fuel chuno</option>
              {FUELS.map((f) => (
                <option key={f} value={f}>{f}</option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="km">Kilometres Driven (KM) *</Label>
            <Input id="km" type="number" required min={0} value={form.km} onChange={set("km")} placeholder="45000" />
          </div>
          <div>
            <Label htmlFor="owner">Owner *</Label>
            <Select id="owner" required value={form.owner} onChange={set("owner")}>
              <option value="">Owner chuno</option>
              {OWNERS.map((o) => (
                <option key={o} value={o}>{o === "4th" ? "4th or more" : o === "1st" ? "1st" : `${o}`} Owner</option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="transmission">Transmission *</Label>
            <Select id="transmission" required value={form.transmission} onChange={set("transmission")}>
              <option value="">Transmission chuno</option>
              {TRANSMISSIONS.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="price">Price (₹) *</Label>
            <Input id="price" type="number" required min={0} step={1000} value={form.price} onChange={set("price")} placeholder="550000" />
          </div>
          <div>
            <Label htmlFor="downPayment">Down Payment (₹)</Label>
            <Input id="downPayment" type="number" min={0} step={1000} value={form.downPayment} onChange={set("downPayment")} placeholder="150000" />
          </div>
          <div>
            <Label htmlFor="financeRate">Finance Interest Rate (%)</Label>
            <Input id="financeRate" type="number" min={0} max={30} step={0.05} value={form.financeRate} onChange={set("financeRate")} placeholder="10" />
            <p className="mt-1 text-[11px] text-stone-400">
              Optional — EMI calculator pe default rate ke roop mein dikhega. Customer change kar sakta hai.
            </p>
          </div>
          <div>
            <Label htmlFor="seatingCapacity" hint="Optional">Seating Capacity</Label>
            <Input
              id="seatingCapacity"
              type="number"
              min={1}
              step={1}
              inputMode="numeric"
              value={form.seatingCapacity}
              onChange={set("seatingCapacity")}
              placeholder="e.g. 5, 7"
              aria-describedby="seatingCapacityHelp"
            />
            <p id="seatingCapacityHelp" className="mt-1 text-[11px] text-stone-400">
              Positive whole number only, jaise 5, 7, 13 ya 15.
            </p>
          </div>
          <div>
            <Label htmlFor="city">City</Label>
            <Input id="city" value={form.city} onChange={set("city")} placeholder="Jaipur" />
          </div>
          {(() => {
            const priceNum = Number(form.price);
            const downNum = form.downPayment.trim() === "" ? null : Number(form.downPayment);
            const hasPrice = Number.isFinite(priceNum) && priceNum > 0;
            const hasDown = downNum !== null && Number.isFinite(downNum);
            if (hasPrice && hasDown && downNum! > priceNum) {
              return (
                <p className="sm:col-span-2 text-xs font-medium text-red-600">
                  Down payment vehicle price se zyada nahi ho sakta.
                </p>
              );
            }
            if (hasPrice && hasDown && downNum! >= 0) {
              return (
                <p className="sm:col-span-2 text-xs text-emerald-700">
                  Finance Amount: {formatINR(priceNum - downNum!)} (Price − Down Payment, automatically calculated)
                </p>
              );
            }
            return null;
          })()}
          <div className="sm:col-span-2">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" rows={3} value={form.description} onChange={set("description")} placeholder="Condition, service history, koi kaam baaki…" />
          </div>
        </div>
      </Card>

      <Card className="p-5">
        <h2 className="font-semibold text-stone-900">Photos</h2>
        <p className="mt-1 text-xs text-stone-400">Front, back, interior, boot – jitna zyada photo, utna bharosa.</p>
        <div className="mt-4">
          <PhotoUpload urls={images} onChange={setImages} folder="vehicles" />
        </div>
      </Card>

      <Card className="p-5">
        <h2 className="font-semibold text-stone-900">Location</h2>
        <p className="mt-1 text-xs text-stone-400">Gaadi kahan hai? Map pe pin karo — customers ko distance milegi.</p>
        <div className="mt-4">
          <LocationPicker
            lat={lat}
            lng={lng}
            label={locationLabel}
            onChange={(loc: PickedLocation) => {
              setLat(loc.lat);
              setLng(loc.lng);
              setLocationLabel(loc.label);
              setForm((f) => ({ ...f, city: loc.city || f.city }));
            }}
          />
        </div>
      </Card>

      <FieldError message={error} />

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" onClick={() => router.push("/dealer/cars")}>
          Cancel Karo
        </Button>
        <Button type="submit" loading={saving}>
          {editing ? "Changes Save Karo" : "Gaadi Dalo →"}
        </Button>
      </div>
    </form>
  );
}