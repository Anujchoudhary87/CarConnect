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

// Finance-style formatting used on the car details page, e.g. ₹8.50 Lakh.
export function formatLakh(value: number | string | null | undefined): string {
  const n = Number(value ?? 0);
  if (!Number.isFinite(n)) return "₹0";
  const lakh = n / 100000;
  return `₹${lakh.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Lakh`;
}

export function formatKm(value: number | string | null | undefined): string {
  const n = Number(value ?? 0);
  if (isNaN(n)) return "0 km";
  return n.toLocaleString("en-IN") + " km";
}

export function timeAgo(date: string): string {
  const diff = Date.now() - new Date(date).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "abhi abhi";
  if (minutes < 60) return `${minutes} min pehle`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr pehle`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} din pehle`;
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