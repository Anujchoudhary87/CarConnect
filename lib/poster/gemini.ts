import type { PosterComposeRequestData, PosterComposition } from "./types";
import type { PosterProvider } from "./provider";
import { formatINR, formatKm, ownerLabel } from "@/lib/format";

const GEMINI_TIMEOUT_MS = 15_000;
const GEMINI_MAX_IMAGES = 6;
const FORBIDDEN_FACT_WORDS =
  /(?:owner|variant|registration|insur(?:e|ance)|fuel|petrol|diesel|cng|lpg|\bev\b|hybrid|electric|manual|automatic|amt|cvt|dct|gear|kilomet(?:er|ers)|kms?)/i;

function cleanText(text: string, maxWords: number): string {
  const cleaned = text
    .split(/\s+/)
    .map((w) => w.replace(/[^\p{L}\p{N}₹•.,&%'()-]/gu, ""))
    .filter((w) => w.length > 0 && w.length <= 22)
    .slice(0, maxWords)
    .join(" ")
    .trim();
  return cleaned;
}

function hasForbiddenFact(text: string): boolean {
  const lower = text.toLowerCase();
  if (/[0-9₹]/.test(text)) return true;
  if (/(?:rs\.?|inr|lakh|lac|crore|\bcr\b)/i.test(lower)) return true;
  return FORBIDDEN_FACT_WORDS.test(lower);
}

function deterministicFallback(request: PosterComposeRequestData): PosterComposition {
  const { vehicle, dealer, images } = request;
  const highlights = [
    `${vehicle.year} • ${vehicle.fuel} • ${vehicle.transmission}`,
    `${ownerLabel(vehicle.owner)} • ${formatKm(vehicle.km)}`,
    dealer.city ? `${dealer.city} me dealer se direct deal` : "Dealer se direct deal",
  ];
  return {
    heroUrl: images.length > 0 ? images[0].url : "",
    highlights: highlights.slice(0, 3),
  };
}

interface GeminiCandidate {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
  }>;
}

interface GeminiSelection {
  bestHero?: string | null;
  photoSelections?: {
    front?: string | null;
    side?: string | null;
    rear?: string | null;
    interior?: string | null;
    dashboard?: string | null;
  } | null;
  highlights?: string[];
}

interface InlineImage {
  mimeType: string;
  data: string;
}

export class GeminiPosterProvider implements PosterProvider {
  name = "Gemini Vision Poster";
  private apiKey: string;
  private baseUrl: string;
  private model: string;

  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY ?? "";
    this.baseUrl = (
      process.env.GEMINI_BASE_URL ?? "https://generativelanguage.googleapis.com/v1beta"
    ).replace(/\/$/, "");
    this.model = process.env.GEMINI_MODEL ?? "gemini-2.0-flash";
  }

  private buildPrompt(request: PosterComposeRequestData, allowlist: string[]): string {
    const v = request.vehicle;
    const d = request.dealer;
    const facts = [
      v.brand,
      v.model,
      v.variant,
      String(v.year),
      v.fuel,
      formatKm(v.km),
      ownerLabel(v.owner),
      v.transmission,
      formatINR(v.price),
      v.city,
      d.dealership_name,
      d.city,
    ]
      .filter(Boolean)
      .join(", ");
    return [
      "You are a used-car poster photo director.",
      `Allowed photos (use ONLY these IMAGE_ tags; never invent or reuse a URL):\n${allowlist
        .map((url, i) => `IMAGE_${i}=${url}`)
        .join("\n")}`,
      "",
      "Choose exactly ONE hero and per-category picks from the allowed photos.",
      "Return STRICT JSON with no markdown and no extra text:",
      '{"bestHero":"IMAGE_<n>","photoSelections":{"front":"IMAGE_<n>"|null,"side":"IMAGE_<n>"|null,"rear":"IMAGE_<n>"|null,"interior":"IMAGE_<n>"|null,"dashboard":"IMAGE_<n>"|null},"highlights":["string","string","string"]}',
      "",
      "Rules:",
      "- bestHero MUST be one of the IMAGE_ tags.",
      "- photoSelections values MUST be IMAGE_<n> or null; a category without a suitable photo is null.",
      "- each allowed photo may be used at most once.",
      "- highlights: short factual marketing lines. NEVER include price, KM, year, owner, fuel, transmission, registration, insurance, variant, or any number/currency/₹. If unsure, omit.",
      `Facts (context only, never repeat price/km/year/owner/fuel/transmission/registration/insurance): ${facts}`,
    ].join("\n\n");
  }

  private async loadImage(url: string): Promise<InlineImage | null> {
    try {
      const res = await fetch(url, {
        signal: AbortSignal.timeout(Math.min(GEMINI_TIMEOUT_MS, 8_000)),
      });
      if (!res.ok) return null;
      const mime = (res.headers.get("content-type") ?? "image/jpeg")
        .split(";")[0]
        .trim();
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.byteLength === 0 || buf.byteLength > 4 * 1024 * 1024) return null;
      return {
        mimeType: /^image\/.+/.test(mime) ? mime : "image/jpeg",
        data: buf.toString("base64"),
      };
    } catch {
      return null;
    }
  }

  async compose(request: PosterComposeRequestData): Promise<PosterComposition> {
    const fallback = deterministicFallback(request);
    if (!this.apiKey) return fallback;

    const allowlist = request.images
      .map((i) => i.url)
      .filter((u) => typeof u === "string" && u.trim().length > 0);
    if (allowlist.length === 0) return fallback;

    const used = new Set<string>();
    const resolve = (ref: unknown): string | null => {
      if (typeof ref !== "string") return null;
      const t = ref.trim();
      const m = /^IMAGE_(\d+)$/i.exec(t);
      const url = m ? allowlist[Number(m[1])] : allowlist.includes(t) ? t : undefined;
      if (!url || used.has(url)) return null;
      used.add(url);
      return url;
    };

    try {
      const imageParts: Array<Record<string, unknown>> = [];
      const toSend = allowlist.slice(0, GEMINI_MAX_IMAGES);
      for (const url of toSend) {
        const img = await this.loadImage(url);
        if (img) imageParts.push({ inlineData: img });
      }
      if (imageParts.length === 0) return fallback;

      const res = await fetch(
        `${this.baseUrl}/models/${this.model}:generateContent`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": this.apiKey,
          },
          body: JSON.stringify({
            contents: [
              {
                role: "user",
                parts: [
                  { text: this.buildPrompt(request, allowlist) },
                  ...imageParts.map((p) => ({ inlineData: p.inlineData })),
                ],
              },
            ],
            generationConfig: {
              temperature: 0.2,
              maxOutputTokens: 1024,
              responseMimeType: "application/json",
            },
          }),
          signal: AbortSignal.timeout(GEMINI_TIMEOUT_MS),
        },
      );
      if (!res.ok) return fallback;
      const json = (await res.json()) as GeminiCandidate;
      const text =
        json.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
      if (!text) return fallback;

      const jsonText = text.replace(/^```(?:json)?\s*|\s*```$/g, "").trim();
      const parsed = JSON.parse(jsonText) as GeminiSelection;

      const hero = resolve(parsed.bestHero);
      const photoSelections = {
        front: resolve(parsed.photoSelections?.front),
        side: resolve(parsed.photoSelections?.side),
        rear: resolve(parsed.photoSelections?.rear),
        interior: resolve(parsed.photoSelections?.interior),
        dashboard: resolve(parsed.photoSelections?.dashboard),
      };

      const highlights = (parsed.highlights ?? [])
        .map((h) => cleanText(h, 6))
        .filter((h) => h.length > 0 && !hasForbiddenFact(h))
        .slice(0, 3);
      if (highlights.length < 2) return fallback;

      return {
        heroUrl: hero ?? fallback.heroUrl,
        highlights,
        photoSelections,
      };
    } catch {
      return fallback;
    }
  }
}