import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// Customer toggles "Stock milne par mujhe batana" for one of their demands.
// Turning it off must NOT delete the demand — it only flips the notify flag.
export async function PATCH(request: NextRequest, ctx: RouteContext<"/api/demands/[id]">) {
  const { id } = await ctx.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Not authenticated" }, { status: 401 });

  const body = (await request.json().catch(() => null)) as { notify?: unknown } | null;
  if (!body || typeof body.notify !== "boolean") {
    return Response.json({ error: "Invalid body" }, { status: 400 });
  }

  const { error } = await supabase
    .from("customer_demands")
    .update({ notify: body.notify })
    .eq("id", id);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true, notify: body.notify });
}