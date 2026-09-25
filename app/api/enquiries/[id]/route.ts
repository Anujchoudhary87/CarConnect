import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Task 2: follow-up choice -> when the dealer should re-approach the customer.
// Days to wait per choice (null = no follow-up).
const FOLLOWUP_DELAY_DAYS: Record<string, number | null> = {
  interested: 2, // 2 din mein dobara call
  baad_mein: 7, // ek hafte baad
  nahi_banega: null, // clear — follow-up khatam
  aa_raha_hoon: null, // test-drive decided, follow-up nahi chahiye
};

const FOLLOWUP_CHOICES = Object.keys(FOLLOWUP_DELAY_DAYS);

export async function PATCH(request: NextRequest, ctx: RouteContext<"/api/enquiries/[id]">) {
  const { id } = await ctx.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Not authenticated" }, { status: 401 });

  const { data: dealer } = await supabase
    .from("dealers")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!dealer) return Response.json({ error: "Not a dealer" }, { status: 403 });

  const { data: enq } = await supabase
    .from("enquiries")
    .select("dealer_id")
    .eq("id", id)
    .maybeSingle();
  if (!enq) return Response.json({ error: "Not found" }, { status: 404 });
  if (enq.dealer_id !== dealer.id) return Response.json({ error: "Not allowed" }, { status: 403 });

  const body = (await request.json()) as { followup_choice?: string };
  const followupChoice = body.followup_choice;
  if (!followupChoice || !FOLLOWUP_CHOICES.includes(followupChoice)) {
    return Response.json({ error: "Invalid followup_choice" }, { status: 400 });
  }

  const delayDays = FOLLOWUP_DELAY_DAYS[followupChoice];
  const nextFollowupAt = delayDays === null
    ? null
    : new Date(Date.now() + delayDays * 24 * 60 * 60 * 1000).toISOString();

  const { error } = await supabase
    .from("enquiries")
    .update({ followup_choice: followupChoice, next_followup_at: nextFollowupAt })
    .eq("id", id);
  if (error) return Response.json({ error: error.message }, { status: 500 });

  // Best-effort (security-definer RPC, idempotent) — never fails the PATCH.
  await Promise.resolve(
    supabase.rpc("sync_dealer_followup_digest", { p_dealer_id: dealer.id })
  ).then(() => {}).catch(() => {});

  return Response.json({ ok: true, next_followup_at: nextFollowupAt });
}

export async function DELETE(_request: NextRequest, ctx: RouteContext<"/api/enquiries/[id]">) {
  const { id } = await ctx.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Not authenticated" }, { status: 401 });

  const { data: dealer } = await supabase
    .from("dealers")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!dealer) return Response.json({ error: "Not a dealer" }, { status: 403 });

  const { data: enq } = await supabase
    .from("enquiries")
    .select("dealer_id")
    .eq("id", id)
    .maybeSingle();
  if (!enq) return Response.json({ error: "Not found" }, { status: 404 });
  if (enq.dealer_id !== dealer.id) return Response.json({ error: "Not allowed" }, { status: 403 });

  const { error } = await supabase.from("enquiries").delete().eq("id", id);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}