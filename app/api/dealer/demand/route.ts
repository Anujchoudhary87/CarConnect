import { createClient } from "@/lib/supabase/server";
import { fetchDemandClusters } from "@/lib/demand-api";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Not authenticated" }, { status: 401 });

  // Dealer accounts only — not customers/admins.
  const { data: dealer } = await supabase
    .from("dealers")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!dealer) {
    return Response.json({ error: "Dealer account required" }, { status: 403 });
  }

  try {
    const clusters = await fetchDemandClusters(supabase);
    return Response.json({ clusters });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "Demand load fail hua" }, { status: 500 });
  }
}