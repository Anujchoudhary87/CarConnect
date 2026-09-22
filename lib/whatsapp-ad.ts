import { APP_URL } from "@/lib/env";
import { formatINR, formatKm, ownerLabel } from "@/lib/format";
import type { Dealer, Vehicle } from "@/lib/types";

export function toWellFormed(s: string): string {
  return s.replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]|[^\uD800-\uDFFF]/g, (m) => m);
}

export function buildWhatsAppAdMessage(
  vehicle: Vehicle,
  dealer: Pick<Dealer, "dealership_name" | "city" | "state" | "verified">,
): string {
  const variant = vehicle.variant ? vehicle.variant.toUpperCase() : "";
  const title = [vehicle.brand, vehicle.model, variant].filter(Boolean).join(" ");
  const lines: string[] = [];

  if (title) lines.push(`🚗 ${toWellFormed(title)} – For Sale`);
  lines.push("");

  const facts: string[] = [];
  if (vehicle.price > 0) facts.push(`💰 Price: ${formatINR(vehicle.price)}`);
  if (vehicle.year) facts.push(`📅 Year: ${vehicle.year}`);
  if (vehicle.fuel) facts.push(`⛽ Fuel: ${vehicle.fuel}`);
  if (vehicle.transmission) facts.push(`⚙️ Transmission: ${vehicle.transmission}`);
  if (vehicle.owner) facts.push(`👤 Owner: ${ownerLabel(vehicle.owner)}`);
  if (vehicle.km > 0) facts.push(`🛣️ KM Driven: ${formatKm(vehicle.km)}`);
  if (facts.length > 0) lines.push(facts.join("\n"));

  const highlights: string[] = [];
  if (dealer.verified) highlights.push("✓ Verified Dealer");
  if (highlights.length > 0) {
    lines.push("");
    lines.push("✨ Highlights:");
    lines.push(...highlights.slice(0, 4).map((h) => `• ${toWellFormed(h)}`));
  }

  const location = [dealer.dealership_name, dealer.city, dealer.state].filter(Boolean).join(", ");
  if (location) {
    lines.push("");
    lines.push(`📍 ${toWellFormed(location)}`);
  }

  lines.push("");
  lines.push("📞 Contact Dealer");
  lines.push("💬 WhatsApp Now");
  lines.push("");
  lines.push("🔗 View Full Details on Car Connect:");
  lines.push(`${APP_URL}/cars/${vehicle.id}`);

  return toWellFormed(lines.join("\n"));
}

export function whatsappShareLink(message: string): string {
  const safe = toWellFormed(message);
  const encoded = encodeURIComponent(safe);
  if (process.env.NODE_ENV !== "production") {
    console.info("[whatsapp-share]", {
      message: safe,
      textParam: encoded,
      decoded: decodeURIComponent(encoded),
    });
  }
  return `https://api.whatsapp.com/send?text=${encoded}`;
}