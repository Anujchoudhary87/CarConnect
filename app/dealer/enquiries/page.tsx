import type { Metadata } from "next";
import { requireDealer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { EnquiriesList } from "./EnquiriesList";

export const metadata: Metadata = { title: "Customer Enquiries" };

export default async function EnquiriesPage() {
  const { dealer } = await requireDealer();
  const supabase = await createClient();

  const [{ data: enquiries }, { data: testDrives }] = await Promise.all([
    supabase
      .from("enquiries")
      .select("*, vehicle:vehicles(brand, model, year, id)")
      .eq("dealer_id", dealer.id)
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("test_drive_requests")
      .select("*, vehicle:vehicles(brand, model, year, id)")
      .eq("dealer_id", dealer.id)
      .order("created_at", { ascending: false })
      .limit(100),
  ]);

  return (
    <div>
      <h2 className="mb-1 text-lg font-bold text-stone-900">Customer Enquiries 💬</h2>
      <p className="mb-4 text-sm text-stone-500">
        Customers jo aapki gaadiyon mein interested hain — unka message turant reply karein.
      </p>
      <EnquiriesList enquiries={enquiries ?? []} testDrives={testDrives ?? []} />
    </div>
  );
}