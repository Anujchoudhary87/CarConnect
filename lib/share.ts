import { APP_URL } from "@/lib/env";
import { formatINR, formatKm, formatPriceShort, ownerLabel } from "@/lib/format";
import type { Vehicle } from "@/lib/types";
import { toWellFormed, whatsappShareLink } from "@/lib/whatsapp-ad";

// Customer-facing "Share" helpers. Only publicly visible vehicle details are
// included — no dealer/customer private information. Reuses the existing APP_URL
// resolution and whatsapp-app encoding utilities so production links never use
// localhost and the dealer WhatsApp Ad flow stays untouched.

export function publicVehicleUrl(vehicleId: string): string {
  return `${APP_URL}/cars/${vehicleId}`;
}

export function vehicleShareTitle(vehicle: Vehicle): string {
  return toWellFormed([vehicle.brand, vehicle.model, vehicle.variant].filter(Boolean).join(" "));
}

export function buildVehicleShareText(vehicle: Vehicle): string {
  const title = vehicleShareTitle(vehicle);
  const facts = [vehicle.year, vehicle.fuel, formatKm(vehicle.km), ownerLabel(vehicle.owner)]
    .filter(Boolean)
    .join(" • ");
  const lines: string[] = [];
  if (title) lines.push(`🚗 ${title}`);
  lines.push(formatINR(vehicle.price));
  if (facts) lines.push(facts);
  if (vehicle.city) {
    lines.push("");
    lines.push(`📍 ${toWellFormed(vehicle.city)}`);
  }
  lines.push("");
  lines.push("View this car on Car Connect:");
  lines.push(publicVehicleUrl(vehicle.id));
  return toWellFormed(lines.join("\n"));
}

export function whatsappShareUrl(vehicle: Vehicle): string {
  return whatsappShareLink(buildVehicleShareText(vehicle));
}

export function telegramShareUrl(vehicle: Vehicle): string {
  const url = publicVehicleUrl(vehicle.id);
  const text = toWellFormed(
    `🚗 ${vehicleShareTitle(vehicle)} — ${formatPriceShort(vehicle.price)}\nCar Connect\n${url}`,
  );
  return `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
}

export function facebookShareUrl(vehicle: Vehicle): string {
  return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(publicVehicleUrl(vehicle.id))}`;
}