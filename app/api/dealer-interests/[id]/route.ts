import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function PUT(request: NextRequest, ctx: RouteContext<"/api/dealer-interests/[id]">) {
  const { id } = await ctx.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Not authenticated" }, { status: 401 });

  const { status } = await request.json();
  if (!["accepted", "rejected", "withdrawn"].includes(status)) {
    return Response.json({ error: "Invalid status" }, { status: 400 });
  }

  const { data: interest } = await supabase
    .from("dealer_interests")
    .select("id, from_dealer_id, to_dealer_id")
    .eq("id", id)
    .maybeSingle();
  if (!interest) return Response.json({ error: "Not found" }, { status: 404 });

  const { data: dealer } = await supabase
    .from("dealers")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!dealer) return Response.json({ error: "Not a dealer" }, { status: 403 });

  const isFrom = dealer.id === interest.from_dealer_id && status === "withdrawn";
  const isTo = dealer.id === interest.to_dealer_id;
  if (!isFrom && !isTo) return Response.json({ error: "Not allowed" }, { status: 403 });

  const { error } = await supabase
    .from("dealer_interests")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}