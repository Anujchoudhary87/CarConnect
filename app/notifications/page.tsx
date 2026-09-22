import type { Metadata } from "next";
import { requireAuth } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { NotificationsList } from "./NotificationsList";
import type { DemandNotification } from "@/lib/types";

export const metadata: Metadata = { title: "Notifications" };

export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  await requireAuth();
  const supabase = await createClient();

  let notifications: DemandNotification[] = [];
  try {
    const { data } = await supabase
      .from("customer_notifications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);
    notifications = (data ?? []) as DemandNotification[];
  } catch {
    notifications = [];
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-1 text-2xl font-extrabold text-stone-900">🔔 Notifications</h1>
      <p className="mb-6 text-sm text-stone-500">
        Aapke demand ke liye stock ka in-app update. Sirf yahan milenge — koi SMS ya WhatsApp nahi.
      </p>
      <NotificationsList initial={notifications} />
    </div>
  );
}