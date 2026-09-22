"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Spinner } from "@/components/ui";
import { uploadFile } from "@/components/PhotoUpload";
import { formatINR, formatKm, ownerLabel } from "@/lib/format";
import type { PosterComposeResponse } from "@/lib/poster/types";
import { isPosterImage } from "@/lib/poster/sort";

const W = 1080;
const H = 1350;
const PAD = 52;
const DARK = "#1c1917";
const RED = "#dc2626";
const STONE = "#44403c";
const MUTED = "#78716c";
const LIGHT = "#f5f5f4";

async function readJsonSafe(res: Response): Promise<Record<string, unknown>> {
  try {
    return (await res.json()) as Record<string, unknown>;
  } catch {
    // Server answered with non-JSON (e.g. an HTML error page). Give a useful
    // message instead of the raw "Unexpected token '<'" parser error.
    const text = (await res.text().catch(() => "")).replace(/\s+/g, " ").trim();
    const ct = res.headers.get("content-type");
    const snippet = text ? ` — ${text.slice(0, 80)}` : "";
    throw new Error(
      `Server se galat response aaya (${res.status}${ct ? `, ${ct}` : ""}${snippet})`,
    );
  }
}

function truncate(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let s = text;
  while (s.length > 1 && ctx.measureText(`${s}…`).width > maxWidth) s = s.slice(0, -1);
  return `${s}…`;
}

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Poster photo load nahi ho payi"));
    img.src = url;
  });
}

function drawHeroImage(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const scale = Math.min(w / img.naturalWidth, h / img.naturalHeight);
  const dw = img.naturalWidth * scale;
  const dh = img.naturalHeight * scale;
  const dx = x + (w - dw) / 2;
  const dy = y + (h - dh) / 2;
  ctx.save();
  roundedRect(ctx, x, y, w, h, r);
  ctx.clip();
  ctx.drawImage(img, dx, dy, dw, dh);
  ctx.restore();
}

export async function drawPoster(canvas: HTMLCanvasElement, data: PosterComposeResponse) {
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");

  canvas.width = W;
  canvas.height = H;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, W, H);

  const { vehicle, dealer, composition } = data;

  // Dark header with accent strip.
  const HEADER_H = 150;
  ctx.fillStyle = DARK;
  ctx.fillRect(0, 0, W, HEADER_H);
  ctx.fillStyle = RED;
  ctx.fillRect(0, HEADER_H - 8, W, 8);

  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.font = "600 40px system-ui, sans-serif";
  ctx.fillStyle = "#ffffff";
  ctx.fillText("Car Connect", PAD, 62);

  const badge = "✨ AI Poster";
  ctx.font = "600 32px system-ui, sans-serif";
  const badgeW = ctx.measureText(badge).width + 56;
  ctx.fillStyle = RED;
  roundedRect(ctx, W - PAD - badgeW, 30, badgeW, 52, 26);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.fillText(badge, W - PAD - badgeW + 28, 66);

  let title = `${vehicle.brand} ${vehicle.model}`;
  if (vehicle.variant) title += ` ${vehicle.variant}`;
  ctx.font = "800 76px system-ui, sans-serif";
  ctx.fillStyle = "#ffffff";
  ctx.fillText(truncate(ctx, title, W - PAD * 2), PAD, 134);

  // Fact chips row.
  const chips = [
    String(vehicle.year),
    vehicle.fuel,
    vehicle.transmission,
    ownerLabel(vehicle.owner),
  ].filter(Boolean);
  let cx = PAD;
  const chipY = HEADER_H + 46;
  ctx.font = "600 28px system-ui, sans-serif";
  for (const chip of chips) {
    const tw = ctx.measureText(chip).width;
    const cw = tw + 44;
    ctx.fillStyle = LIGHT;
    roundedRect(ctx, cx, chipY - 30, cw, 44, 22);
    ctx.fill();
    ctx.fillStyle = MUTED;
    ctx.fillText(chip, cx + 22, chipY + 2);
    cx += cw + 14;
  }

  // Hero image.
  const heroX = PAD;
  const heroY = chipY + 16;
  const heroW = W - PAD * 2;
  const heroH = 556;
  const hero = await loadImage(composition.heroUrl);
  drawHeroImage(ctx, hero, heroX, heroY, heroW, heroH, 24);

  // Price strip.
  const priceH = 96;
  const priceY = heroY + heroH - priceH;
  const priceText = formatINR(vehicle.price);
  ctx.fillStyle = RED;
  roundedRect(ctx, heroX, priceY, heroW, priceH - 14, 22);
  ctx.fill();
  ctx.font = "800 56px system-ui, sans-serif";
  ctx.fillStyle = "#ffffff";
  ctx.fillText(priceText, heroX + 34, priceY + 62);
  ctx.font = "500 27px system-ui, sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.92)";
  const exText = "on-road price may vary";
  ctx.fillText(exText, heroX + heroW - 34 - ctx.measureText(exText).width, priceY + 62);

  // Highlights.
  const labelY = priceY + priceH - 14 + 58;
  ctx.font = "800 40px system-ui, sans-serif";
  ctx.fillStyle = DARK;
  ctx.fillText("Highlights", PAD, labelY);

  ctx.font = "30px system-ui, sans-serif";
  const hls = (composition.highlights ?? []).slice(0, 3);
  let hlineY = labelY + 34;
  for (const hl of hls) {
    ctx.fillStyle = RED;
    ctx.beginPath();
    ctx.arc(PAD + 8, hlineY - 12, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = STONE;
    ctx.fillText(truncate(ctx, hl, W - PAD * 2 - 40), PAD + 34, hlineY);
    hlineY += 48;
  }

  // Specs grid.
  const gridY = hlineY + 18;
  const gridW = W - PAD * 2;
  const gap = 14;
  const cols = 3;
  const tileW = (gridW - gap * (cols - 1)) / cols;
  const tileH = 78;
  const specs = [
    ["KM Driven", formatKm(vehicle.km)],
    ["Year", String(vehicle.year)],
    ["Fuel", vehicle.fuel],
    ["Transmission", vehicle.transmission],
    ["Owner", ownerLabel(vehicle.owner)],
    ["City", vehicle.city || "—"],
  ];
  specs.forEach(([label, value], idx) => {
    const col = idx % cols;
    const row = Math.floor(idx / cols);
    const tx = PAD + col * (tileW + gap);
    const ty = gridY + row * (tileH + gap);
    ctx.fillStyle = LIGHT;
    roundedRect(ctx, tx, ty, tileW, tileH, 16);
    ctx.fill();
    ctx.font = "500 24px system-ui, sans-serif";
    ctx.fillStyle = MUTED;
    ctx.fillText(label.toUpperCase(), tx + 20, ty + 30);
    ctx.font = "700 30px system-ui, sans-serif";
    ctx.fillStyle = DARK;
    ctx.fillText(truncate(ctx, value, tileW - 40), tx + 20, ty + 64);
  });

  // Dealer bar.
  const barH = 104;
  const barY = gridY + 2 * tileH + gap + 24;
  const barX = PAD;
  const barW = W - PAD * 2;
  ctx.fillStyle = DARK;
  roundedRect(ctx, barX, barY, barW, barH, 24);
  ctx.fill();

  const nameFull = dealer.dealership_name || "Car Dealer";
  ctx.font = "700 38px system-ui, sans-serif";
  ctx.fillStyle = "#ffffff";
  ctx.fillText(truncate(ctx, nameFull, barW - 340), barX + 40, barY + 46);

  ctx.font = "500 27px system-ui, sans-serif";
  ctx.fillStyle = "#d6d3d1";
  const sub = `${dealer.city}${dealer.state ? `, ${dealer.state}` : ""}`;
  ctx.fillText(truncate(ctx, sub, barW - 340), barX + 40, barY + 84);

  if (dealer.verified) {
    const v = "✓ Verified";
    ctx.font = "600 26px system-ui, sans-serif";
    const vw = ctx.measureText(v).width + 40;
    ctx.fillStyle = "#059669";
    roundedRect(ctx, barX + 40, barY + 16, vw, 46, 23);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.fillText(v, barX + 40 + 20, barY + 49);
  }

  const cta = "📞 Call Now";
  ctx.font = "700 32px system-ui, sans-serif";
  const cw = ctx.measureText(cta).width + 56;
  ctx.fillStyle = RED;
  roundedRect(ctx, barX + barW - 40 - cw, barY + 27, cw, 50, 25);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.fillText(cta, barX + barW - 40 - cw + 28, barY + 62);
}

export function PosterGenerator({
  vehicleId,
  hasPhotos,
  onApplied,
}: {
  vehicleId: string;
  hasPhotos: boolean;
  onApplied?: () => void;
}) {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [rendering, setRendering] = useState(false);
  const [applying, setApplying] = useState(false);
  const [data, setData] = useState<PosterComposeResponse | null>(null);
  const [hasExisting, setHasExisting] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function loadCompose() {
    setLoading(true);
    setError("");
    setMessage("");
    setPreviewUrl(null);
    try {
      const res = await fetch(`/api/vehicles/${vehicleId}/poster`, { method: "POST" });
      const json = (await readJsonSafe(res)) as unknown as PosterComposeResponse & { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Poster design fail ho gaya");
      setData(json);
      setHasExisting(Boolean(json.posterUrl) || isPosterImage(json.images[0]));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Poster design fail ho gaya");
    } finally {
      setLoading(false);
    }
  }

  function openModal() {
    setOpen(true);
    void loadCompose();
  }

  function closeModal() {
    setOpen(false);
    setData(null);
    setPreviewUrl(null);
    setError("");
    setMessage("");
  }

  useEffect(() => {
    if (!open || !data || !canvasRef.current) return;
    let cancelled = false;
    (async () => {
      setRendering(true);
      try {
        await drawPoster(canvasRef.current!, data);
        if (!cancelled) setPreviewUrl(canvasRef.current!.toDataURL("image/png"));
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Poster render nahi ho paya");
      } finally {
        if (!cancelled) setRendering(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, data]);

  function download() {
    if (!previewUrl) return;
    const a = document.createElement("a");
    a.href = previewUrl;
    a.download = "car-connect-ai-poster.png";
    a.click();
  }

  async function applyCover() {
    if (!previewUrl || !canvasRef.current) return;
    setApplying(true);
    setError("");
    setMessage("");
    try {
      const dataUrl = canvasRef.current.toDataURL("image/png");
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], "car-connect-ai-poster.png", { type: "image/png" });
      const { path, url } = await uploadFile(file, "posters");
      const res = await fetch(`/api/vehicles/${vehicleId}/poster/cover`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ posterUrl: url, posterPath: path }),
      });
      const json = (await readJsonSafe(res)) as unknown as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Cover set nahi ho paya");
      setMessage("✨ Poster set as cover — gallery me sabse pehle dikhega.");
      setHasExisting(true);
      onApplied?.();
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Cover set nahi ho paya");
    } finally {
      setApplying(false);
    }
  }

  return (
    <>
      <button
        onClick={openModal}
        disabled={!hasPhotos}
        title={hasPhotos ? undefined : "Photo add karke AI Poster banayein"}
        className="rounded-lg border border-brand/30 bg-brand/5 px-3 py-1.5 text-sm font-semibold text-brand hover:bg-brand/10 disabled:cursor-not-allowed disabled:opacity-50"
      >
        ✨ AI Poster Banao
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/70 p-4"
          onClick={closeModal}
        >
          <div
            className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-label="AI Car Poster"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-stone-200 px-5 py-4">
              <div>
                <h3 className="font-bold text-stone-900">✨ AI Car Poster</h3>
                <p className="text-xs text-stone-500">
                  Har number listing se aata hai — AI kuch bhi invent nahi karta.
                </p>
              </div>
              <button onClick={closeModal} aria-label="Close" className="rounded-lg p-2 text-stone-500 hover:bg-stone-100">
                <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="max-h-[60vh] overflow-y-auto px-5 py-4">
              {(loading || rendering) && !previewUrl && (
                <div className="flex items-center justify-center gap-2 py-16 text-sm text-stone-500">
                  <Spinner label={loading ? "Composition taiyar ho rahi hai…" : "Poster draw ho raha hai…"} />
                </div>
              )}

              {error && (
                <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {error}
                </div>
              )}

              {previewUrl && (
                <div className="mx-auto max-w-sm">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={previewUrl} alt="AI generated car poster" className="w-full rounded-lg border border-stone-200 shadow" />
                  {hasExisting && (
                    <p className="mt-2 text-center text-xs text-emerald-700">
                      ✓ Poster pehle se cover hai — naya banane par replace ho jayega.
                    </p>
                  )}
                </div>
              )}

              {rendering && previewUrl && (
                <p className="mt-2 text-center text-xs text-stone-400">Dobara bana rahe hain…</p>
              )}

              {message && !error && (
                <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                  {message}
                </div>
              )}
            </div>

            <canvas ref={canvasRef} className="hidden" />

            <div className="flex flex-wrap items-center justify-end gap-2 border-t border-stone-200 px-5 py-4">
              <Button variant="outline" size="sm" onClick={loadCompose} loading={loading && !rendering}>
                ↺ Dobara Banao
              </Button>
              <Button variant="outline" size="sm" onClick={download} disabled={!previewUrl}>
                ⬇ Download Karo
              </Button>
              <Button size="sm" onClick={applyCover} loading={applying} disabled={!previewUrl}>
                Cover Bana Do
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}