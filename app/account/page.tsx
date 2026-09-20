import type { Metadata } from "next";
import { requireAuth } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { AccountDetails } from "./AccountDetails";
import type { UserProfile } from "@/lib/types";

export const metadata: Metadata = { title: "Mera Account" };

export default async function AccountPage() {
  const user = await requireAuth();
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("users")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-1 text-2xl font-extrabold text-stone-900">Mera Account 👤</h1>
      <p className="mb-6 text-sm text-stone-500">Apni profile aur settings ka center.</p>
      <AccountDetails
        profile={(profile as UserProfile) ?? null}
        email={user.email ?? ""}
      />
    </div>
  );
}