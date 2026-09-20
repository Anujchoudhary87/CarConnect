import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function DELETE(_request: NextRequest, ctx: RouteContext<"/api/test-drives/[id]">) {
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

  const { data: td } = await supabase
    .from("test_drive_requests")
    .select("dealer_id")
    .eq("id", id)
    .maybeSingle();
  if (!td) return Response.json({ error: "Not found" }, { status: 404 });
  if (td.dealer_id !== dealer.id) return Response.json({ error: "Not allowed" }, { status: 403 });

  const { error } = await supabase.from("test_drive_requests").delete().eq("id", id);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}