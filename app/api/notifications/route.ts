import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// Customer's own in-app notifications + unread count (used by the header bell
// and the /notifications page). Returns empty when the notifications SQL is not
// yet applied so the UI degrades gracefully instead of erroring.
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Not authenticated" }, { status: 401 });

  const { data, error } = await supabase
    .from("customer_notifications")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) return Response.json({ notifications: [], unread: 0 });

  const notifications = (data ?? []) as {
    id: string;
    user_id: string;
    type: string;
    demand_id: string | null;
    vehicle_id: string | null;
    title: string;
    message: string;
    read_at: string | null;
    created_at: string;
  }[];
  const unread = notifications.filter((n) => n.read_at == null).length;

  return Response.json({ notifications, unread });
}