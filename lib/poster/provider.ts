import type { PosterComposeRequestData, PosterComposition } from "./types";
import { formatINR, formatKm, ownerLabel } from "@/lib/format";
import { GeminiPosterProvider } from "./gemini";

export interface PosterProvider {
  name: string;
  compose(request: PosterComposeRequestData): Promise<PosterComposition>;
}

function claim(vehicle: PosterComposeRequestData["vehicle"], fallback: string): string {
  const sentence = vehicle.description
    .split(/[.!?\n]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0)[0];
  if (sentence && sentence.length > 8 && sentence.length <= 72) return sentence;
  return fallback;
}

export class FallbackPosterProvider implements PosterProvider {
  name = "Car Connect Poster Designer";

  compose(request: PosterComposeRequestData): Promise<PosterComposition> {
    const { vehicle, dealer, images } = request;
    const highlights = [
      `${vehicle.year} • ${vehicle.fuel} • ${vehicle.transmission}`,
      `${ownerLabel(vehicle.owner)} • ${formatKm(vehicle.km)}`,
      claim(
        vehicle,
        dealer.city ? `${dealer.city} me dealer se direct deal` : "Dealer se direct deal",
      ),
    ];
    return Promise.resolve({
      heroUrl: images.length > 0 ? images[0].url : "",
      highlights: highlights.slice(0, 3),
    });
  }
}

function cleanText(text: string, maxWords: number): string {
  return text
    .split(/\s+/)
    .map((w) => w.replace(/[^\p{L}\p{N}₹•.,&%'()-]/gu, ""))
    .filter((w) => w.length > 0 && w.length <= 24)
    .slice(0, maxWords)
    .join(" ")
    .trim();
}

interface FuzzyResponse {
  highlights?: string[];
}

const AI_TIMEOUT_MS = 15_000;

// Words that must never appear in marketing highlights. The poster renderer
// draws these facts itself from the database (never from the AI), so any AI
// output containing them would duplicate/forge a fact-numeric. Reject.
const FORBIDDEN_FACT_WORDS =
  /(?:owner|variant|registration|insur(?:e|ance)|fuel|petrol|diesel|cng|lpg|\bev\b|hybrid|electric|manual|automatic|amt|cvt|dct|gear|kilomet(?:er|ers)|kms?)/i;

function containsForbiddenFact(text: string): boolean {
  const lower = text.toLowerCase();
  if (/[0-9₹]/.test(text)) return true;
  if (/(?:rs\.?|inr|lakh|lac|crore|\bcr\b)/i.test(lower)) return true;
  return FORBIDDEN_FACT_WORDS.test(lower);
}

interface FuzzyResponse {
  highlights?: string[];
}

export class AIPosterProvider implements PosterProvider {
  name = "AI Poster (LLM)";
  private fallback: PosterProvider;
  private apiKey: string;
  private baseUrl: string;
  private model: string;

  constructor() {
    this.fallback = new FallbackPosterProvider();
    this.apiKey = process.env.POSTER_AI_API_KEY ?? "";
    this.baseUrl = (process.env.POSTER_AI_BASE_URL ?? "https://api.openai.com/v1").replace(/\/$/, "");
    this.model = process.env.POSTER_AI_MODEL ?? "gpt-4o-mini";
  }

  private buildPrompt(request: PosterComposeRequestData): string {
    const v = request.vehicle;
    const d = request.dealer;
    const safe = [
      v.brand,
      v.model,
      v.variant,
      String(v.year),
      v.fuel,
      String(v.km),
      v.owner,
      v.transmission,
      formatINR(v.price),
      v.city,
      d.dealership_name,
      d.city,
      d.verified ? "verified" : "",
    ]
      .filter(Boolean)
      .join(", ");
    return [
      "Write short marketing copy for a used car poster.",
      "Use ONLY the facts below. Do not invent prices, years, claims or numbers.",
      "Do not repeat the price, KM, year, owner count, fuel, transmission or registration in the highlights.",
      `Facts: ${safe}`,
    ].join("\n");
  }

  private buildSystem(): string {
    return [
      "You write concise factual marketing copy for a used car poster.",
      "Reply with JSON only: {\"highlights\": [string, string, string]}",
    ].join("\n");
  }

  async compose(request: PosterComposeRequestData): Promise<PosterComposition> {
    const fallback = await this.fallback.compose(request);
    try {
      const res = await fetch(`${this.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: this.model,
          temperature: 0.7,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: this.buildSystem() },
            { role: "user", content: this.buildPrompt(request) },
          ],
        }),
        signal: AbortSignal.timeout(AI_TIMEOUT_MS),
      });
      if (!res.ok) return fallback;
      const json = (await res.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const content = json.choices?.[0]?.message?.content;
      if (!content) return fallback;
      const parsed = JSON.parse(content) as FuzzyResponse;
      const highlights = (parsed.highlights ?? [])
        .map((h) => cleanText(h, 6))
        .filter((h) => h.length > 0 && !containsForbiddenFact(h))
        .slice(0, 3);
      if (highlights.length < 2) return fallback;
      return {
        heroUrl: fallback.heroUrl,
        highlights,
      };
    } catch {
      return fallback;
    }
  }
}

export function getPosterProvider(): PosterProvider {
  if (process.env.GEMINI_API_KEY) return new GeminiPosterProvider();
  if (process.env.POSTER_AI_API_KEY) return new AIPosterProvider();
  return new FallbackPosterProvider();
}

export async function refineWithFacts(
  request: PosterComposeRequestData,
): Promise<PosterComposition> {
  return getPosterProvider().compose(request);
}
