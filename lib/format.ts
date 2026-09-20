export function formatINR(value: number | string | null | undefined): string {
  const n = Number(value ?? 0);
  if (isNaN(n)) return "₹0";
  return "₹" + n.toLocaleString("en-IN", { maximumFractionDigits: 0 });
}

export function formatPriceShort(value: number | string | null | undefined): string {
  const n = Number(value ?? 0);
  if (isNaN(n)) return "₹0";
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)} Cr`;
  if (n >= 100000) return `₹${(n / 100000).toFixed(2)} L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(0)} K`;
  return `₹${n}`;
}

export function formatKm(value: number | string | null | undefined): string {
  const n = Number(value ?? 0);
  if (isNaN(n)) return "0 km";
  return n.toLocaleString("en-IN") + " km";
}

export function timeAgo(date: string): string {
  const diff = Date.now() - new Date(date).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} day${days > 1 ? "s" : ""} ago`;
  return new Date(date).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function ownerLabel(owner: string): string {
  return owner.endsWith("th") ? `${owner} Owner` : `${owner} Owner`;
}

export function whatsappLink(phone: string, message?: string): string {
  const digits = phone.replace(/\D/g, "");
  const base = `https://wa.me/91${digits}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}

export function telLink(phone: string): string {
  return `tel:+91${phone.replace(/\D/g, "")}`;
}