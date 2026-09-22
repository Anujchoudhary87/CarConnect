import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// Marks a single notification as read (idempotent). Only the owner's own rows
// are ever touchable — RLS enforces user_id = auth.uid().
export async function POST(_request: Request, ctx: RouteContext<"/api/notifications/[id]">) {
  const { id } = await ctx.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Not authenticated" }, { status: 401 });

  const { error } = await supabase
    .from("customer_notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}