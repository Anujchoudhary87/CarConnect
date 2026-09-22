import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { DealerProfileForm } from "./DealerProfileForm";

export const metadata: Metadata = { title: "Dealer Bano" };

export default async function BecomeDealerPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login?next=/become-dealer");
  return <DealerProfileForm />;
}