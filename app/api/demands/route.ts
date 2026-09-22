import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { clusterKeyOf, fingerprintOf, isMeaningful, type DemandFields } from "@/lib/demand";

export const dynamic = "force-dynamic";

const DAILY_CAP = 30;
const DEDUPE_HOURS = 24;

function intOrNull(v: unknown): number | null {
  const n = typeof v === "string" ? parseInt(v, 10) : typeof v === "number" ? Math.round(v) : NaN;
  return Number.isFinite(n) ? n : null;
}

function numOrNull(v: unknown): number | null {
  const n = typeof v === "number" ? v : parseFloat(String(v ?? ""));
  return Number.isFinite(n) ? n : null;
}

// Customer-facing: list the signed-in customer's own demand records. Used by
// the account "Stock milne par mujhe batana" preferences. Empty when the
// demand feature SQL is not yet applied — never 500s a customer out.
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Not authenticated" }, { status: 401 });

  const { data, error } = await supabase
    .from("customer_demands")
    .select(
      "id, source, brand, model, fuel, transmission, min_year, max_price, min_price, city, status, notify, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) return Response.json({ demands: [] });
  return Response.json({ demands: data ?? [] });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  // Demand capture is only possible through authenticated application flows.
  if (!user) return Response.json({ error: "Not authenticated" }, { status: 401 });

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return Response.json({ error: "Invalid body" }, { status: 400 });

  const fields: DemandFields = {
    source: body.source === "marketplace" ? "marketplace" : "ai_advisor",
    rawRequirement: String(body.rawRequirement ?? "").trim().slice(0, 500),
    brand: String(body.brand ?? "").trim().slice(0, 48),
    model: String(body.model ?? "").trim().slice(0, 48),
    fuel: String(body.fuel ?? "").trim().slice(0, 24),
    transmission: String(body.transmission ?? "").trim().slice(0, 24),
    minYear: intOrNull(body.minYear),
    maxPrice: numOrNull(body.maxPrice),
    minPrice: numOrNull(body.minPrice),
    city: String(body.city ?? "").trim().slice(0, 128),
    lat: numOrNull(body.lat),
    lng: numOrNull(body.lng),
    radiusKm: intOrNull(body.radiusKm),
  };

  // Never record vague searches ("xyz", empty query) as demand.
  if (!isMeaningful(fields)) return Response.json({ ok: false, reason: "not-meaningful" }, { status: 200 });
  if (fields.minYear != null && (fields.minYear < 1980 || fields.minYear > 2100)) {
    return Response.json({ error: "Invalid year" }, { status: 400 });
  }
  if (fields.maxPrice != null && (fields.maxPrice < 0 || fields.maxPrice > 1_000_000_000)) {
    return Response.json({ error: "Invalid price" }, { status: 400 });
  }
  if (fields.radiusKm != null && (fields.radiusKm < 1 || fields.radiusKm > 2000)) {
    fields.radiusKm = null;
  }

  const status = body.status === "partial" ? "partial" : "unmet";
  const fingerprint = fingerprintOf(fields);
  const clusterKey = clusterKeyOf(fields);

  // Soft rate-limit per user.
  const cutoff = new Date(Date.now() - DEDUPE_HOURS * 3600 * 1000).toISOString();
  const { count } = await supabase
    .from("customer_demands")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .gte("created_at", cutoff);
  if ((count ?? 0) >= DAILY_CAP) {
    return Response.json({ ok: false, reason: "rate-limit" }, { status: 200 });
  }

  // Don't create separate rows for the same requirement repeated within the
  // dedupe window — just refresh freshness.
  const { data: existing } = await supabase
    .from("customer_demands")
    .select("id, notify")
    .eq("user_id", user.id)
    .eq("fingerprint", fingerprint)
    .eq("status", status)
    .gte("created_at", cutoff)
    .limit(1);
  if (existing && existing.length > 0) {
    await supabase
      .from("customer_demands")
      .update({ created_at: new Date().toISOString() })
      .eq("id", existing[0].id);
    return Response.json({ ok: true, deduped: true, id: existing[0].id }, { status: 200 });
  }

  const { data: inserted, error } = await supabase
    .from("customer_demands")
    .insert([
      {
        user_id: user.id,
        source: fields.source,
        brand: fields.brand,
        model: fields.model,
        fuel: fields.fuel,
        transmission: fields.transmission,
        min_year: fields.minYear,
        max_price: fields.maxPrice,
        min_price: fields.minPrice,
        city: fields.city,
        lat: fields.lat,
        lng: fields.lng,
        radius_km: fields.radiusKm,
        status,
        fingerprint,
        cluster_key: clusterKey,
        raw_requirement: fields.rawRequirement,
      },
    ])
    .select("id")
    .single();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true, id: inserted.id }, { status: 201 });
}