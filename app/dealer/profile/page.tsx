import type { Metadata } from "next";
import { requireDealer } from "@/lib/auth";
import { DealerProfileForm } from "@/app/become-dealer/DealerProfileForm";

export const metadata: Metadata = { title: "Dealer Profile" };

export default async function DealerProfilePage() {
  await requireDealer();
  return (
    <div>
      <h2 className="mb-1 text-lg font-bold text-stone-900">Dealer Profile 🏪</h2>
      <p className="mb-4 text-sm text-stone-500">
        Apni dealership ki details, location aur verification documents yahan se update karo.
      </p>
      <DealerProfileForm />
    </div>
  );
}