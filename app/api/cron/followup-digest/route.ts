import { NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Task 2 daily follow-up digest — triggered once per day by Vercel Cron
// (see /vercel.json). Calls the existing sync_dealer_followup_digest RPC for
// every dealer; the RPC itself is idempotent (one digest per dealer per day),
// so this endpoint is safe to re-run / retry.
//
// Secured like Vercel's documented pattern: when CRON_SECRET is set, Vercel
// sends "Authorization: Bearer <CRON_SECRET>" on cron invocations. We fail
// closed when the header is missing, wrong, or the secret is unset — this URL
// is never an unauthenticated public path.
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const svc = createServiceClient();
  if (!svc) return Response.json({ error: "Service not configured" }, { status: 503 });

  const { data: dealers, error } = await svc.from("dealers").select("id");
  if (error) return Response.json({ error: error.message }, { status: 500 });

  let created = 0;
  for (const dealer of dealers ?? []) {
    const { data } = await svc.rpc("sync_dealer_followup_digest", {
      p_dealer_id: dealer.id,
    });
    created += Number(data ?? 0);
  }

  return Response.json({ ok: true, dealers: (dealers ?? []).length, created });
}