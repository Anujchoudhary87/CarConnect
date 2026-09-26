"use client";

import { useState } from "react";
import { Button, Card, FieldError, Input, Label } from "@/components/ui";
import { LocationPicker, type PickedLocation } from "@/components/LocationPicker";
import { addressLine, hasCoordinates, locationText, sameLocation, type LocationValue } from "@/lib/location";
import { useDeviceLocation } from "@/lib/use-device-location";

export interface DealerLocationSectionProps {
  value: LocationValue;
  onChange: (next: LocationValue) => void;
  /** Persists the location; rejects/throws to surface an error in the section. */
  onSave: (options: { applyToExisting: boolean }) => Promise<{ updatedListings?: number } | void>;
  /** Shown under the heading, e.g. "ye har nayi listing ka default banega". */
  hint?: string;
}

function coord(value: string): number | null {
  const n = Number(value.trim());
  return value.trim() === "" || !Number.isFinite(n) ? null : n;
}

/** An office location is only "set" once it has a city *and* an exact point. */
function isComplete(v: LocationValue): boolean {
  return Boolean(v.city.trim()) && hasCoordinates(v);
}

function OptionButton({
  emoji,
  title,
  description,
  onClick,
  loading,
  disabled,
}: {
  emoji: string;
  title: string;
  description: string;
  onClick: () => void;
  loading?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      className="flex w-full items-start gap-3 rounded-xl border border-stone-200 bg-white p-3 text-left transition hover:border-brand/50 hover:bg-brand/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-60"
    >
      <span aria-hidden className="text-lg leading-6">
        {loading ? "⏳" : emoji}
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-stone-900">
          {loading ? "Location dhoond rahe hain…" : title}
        </span>
        <span className="mt-0.5 block text-xs text-stone-500">{description}</span>
      </span>
    </button>
  );
}

/**
 * The dealer's OFFICE LOCATION — set once here, then used as the default
 * location for every vehicle they list. Controlled by the parent so the same
 * values are saved by this section and by the surrounding profile form.
 */
export function DealerLocationSection({
  value,
  onChange,
  onSave,
  hint = "Yehi office location har nayi gaadi ka default banega. Gaadi ka location alag chahiye to listing mein change kar sakte ho.",
}: DealerLocationSectionProps) {
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);
  // Snapshot of the last value known to be persisted (from the server, or from
  // a successful save), so the "Saved" state never lies while typing.
  const [saved, setSaved] = useState<LocationValue>(value);
  const [editing, setEditing] = useState(() => !isComplete(value));
  const [manual, setManual] = useState(false);
  const [applyToExisting, setApplyToExisting] = useState(false);
  const { locating, error: locateError, locate } = useDeviceLocation();

  const summary = locationText(value);
  const isDirty = !sameLocation(value, saved);
  const hasSaved = isComplete(saved);
  const set = (patch: Partial<LocationValue>) => onChange({ ...value, ...patch });

  async function useCurrentLocation() {
    setError("");
    const point = await locate();
    if (!point) return;
    onChange({
      city: point.city || value.city,
      state: point.state || value.state,
      address: point.label || value.address,
      lat: point.lat,
      lng: point.lng,
    });
    // Fill everything, then let the dealer confirm the readable address before
    // it becomes the default — a device pin is often a few metres off indoors.
    setManual(true);
  }

  async function save() {
    setError("");
    setNotice("");
    if (!value.city.trim()) {
      setError("City likhna zaroori hai.");
      return;
    }
    if (!hasCoordinates(value)) {
      setError(
        "Exact latitude/longitude chahiye — search se pin chuno ya 📍 Use My Current Location dabao.",
      );
      return;
    }
    setSaving(true);
    try {
      const result = await onSave({ applyToExisting });
      setSaved(value);
      setEditing(false);
      setManual(false);
      setApplyToExisting(false);
      const moved = result?.updatedListings ?? 0;
      setNotice(
        moved > 0
          ? `Office location save ho gayi. ${moved} purani listing bhi nayi location par shift ki gayi${moved === 1 ? "" : "in"}.`
          : "Office location save ho gayi. Nayi listing yahin ki jayengi.",
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Office location save nahi hui");
    } finally {
      setSaving(false);
    }
  }

  function startEditing() {
    setEditing(true);
    setManual(false);
    setError("");
    setNotice("");
  }

  return (
    <div id="office-location">
      <Card className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-semibold text-stone-900">📍 Office Location *</h2>
            <p className="mt-1 text-xs text-stone-400">{hint}</p>
          </div>
          {hasSaved && !editing && (
            <span className="hidden shrink-0 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 sm:inline-block">
              ✓ Saved
            </span>
          )}
          {editing && isDirty && (
            <span className="hidden shrink-0 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700 sm:inline-block">
              Unsaved changes
            </span>
          )}
        </div>

        {!editing ? (
          <div className="mt-4 rounded-xl border border-stone-200 bg-stone-50 p-3">
            <p className="flex items-start gap-2 text-sm font-semibold text-stone-900">
              <span aria-hidden>✓</span>
              <span className="min-w-0 break-words">Office Location</span>
            </p>
            <p className="mt-1 break-words pl-5 text-sm text-stone-600">
              {addressLine(saved) || "Location set nahi hai"}
            </p>
            {hasCoordinates(saved) && (
              <p className="pl-5 pt-1 text-[11px] text-stone-400">
                {saved.lat?.toFixed(6)}, {saved.lng?.toFixed(6)}
              </p>
            )}
            <div className="mt-3 flex flex-wrap gap-2">
              <Button type="button" variant="outline" size="sm" onClick={startEditing}>
                Change Location
              </Button>
            </div>
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            <p className="text-xs text-stone-500">
              Apni office ka location ek baar set karo — har nayi listing apne aap yahin ki jayegi.
            </p>

            <div className="space-y-2">
              <OptionButton
                emoji="✏️"
                title="Enter Office Location"
                description="Office ka address search karke sahi location chuno."
                onClick={() => {
                  setError("");
                  setManual(true);
                }}
              />
              <OptionButton
                emoji="📍"
                title="Use My Current Location"
                description="Browser se current location lo aur wahi office location banao."
                onClick={useCurrentLocation}
                loading={locating}
              />
            </div>
            {locateError && <p className="text-xs text-amber-700">{locateError}</p>}

            {manual && (
              <div className="space-y-3 rounded-xl border border-stone-200 bg-stone-50/70 p-3">
                <LocationPicker
                  compact
                  lat={value.lat}
                  lng={value.lng}
                  label={summary}
                  onChange={(loc: PickedLocation) =>
                    set({
                      lat: loc.lat,
                      lng: loc.lng,
                      city: loc.city || value.city,
                      state: value.state,
                      // Only fill a blank address; a typed one is never overwritten.
                      address: value.address.trim() || loc.label,
                    })
                  }
                />

                <div>
                  <Label htmlFor="dealerCity">City *</Label>
                  <Input
                    id="dealerCity"
                    value={value.city}
                    onChange={(e) => set({ city: e.target.value })}
                    placeholder="Pilani"
                  />
                </div>
                <div>
                  <Label htmlFor="dealerState">State</Label>
                  <Input
                    id="dealerState"
                    value={value.state}
                    onChange={(e) => set({ state: e.target.value })}
                    placeholder="Rajasthan"
                  />
                </div>
                <div>
                  <Label htmlFor="dealerAddress">Full Address</Label>
                  <Input
                    id="dealerAddress"
                    value={value.address}
                    onChange={(e) => set({ address: e.target.value })}
                    placeholder="Shop 12, Main Market, Pilani"
                  />
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="dealerLat" hint="Required">
                      Latitude
                    </Label>
                    <Input
                      id="dealerLat"
                      inputMode="decimal"
                      value={value.lat ?? ""}
                      onChange={(e) => set({ lat: coord(e.target.value) })}
                      placeholder="28.367600"
                    />
                  </div>
                  <div>
                    <Label htmlFor="dealerLng" hint="Required">
                      Longitude
                    </Label>
                    <Input
                      id="dealerLng"
                      inputMode="decimal"
                      value={value.lng ?? ""}
                      onChange={(e) => set({ lng: coord(e.target.value) })}
                      placeholder="75.654400"
                    />
                  </div>
                </div>
              </div>
            )}

            {!manual && <FieldError message={error} />}

            {hasSaved && (
              <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-stone-200 bg-white p-2.5 text-xs text-stone-600">
                <input
                  type="checkbox"
                  checked={applyToExisting}
                  onChange={(e) => setApplyToExisting(e.target.checked)}
                  className="mt-0.5 size-4 accent-brand"
                />
                <span>
                  <span className="font-semibold text-stone-800">
                    Purani listings bhi nayi location par shift karo
                  </span>
                  <span className="mt-0.5 block text-stone-500">
                    Default: OFF. Sirf wahi listings update hongi jinki location abhi bhi purani
                    office location jaisi hai — car-wise custom location waise hi rahegi.
                  </span>
                </span>
              </label>
            )}

            {manual && <FieldError message={error} />}

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              {hasSaved && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    onChange(saved);
                    setEditing(false);
                    setManual(false);
                    setApplyToExisting(false);
                    setError("");
                  }}
                >
                  Cancel
                </Button>
              )}
              <Button type="button" onClick={save} loading={saving}>
                Save Office Location
              </Button>
            </div>
          </div>
        )}

        {notice && <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-800">{notice}</p>}
      </Card>
    </div>
  );
}
