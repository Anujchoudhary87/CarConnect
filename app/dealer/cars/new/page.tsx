import type { Metadata } from "next";
import { CarForm } from "@/components/CarForm";
import { requireDealer } from "@/lib/auth";

export const metadata: Metadata = { title: "Gaadi Dalo" };

export default async function AddCarPage() {
  const { dealer } = await requireDealer();
  return (
    <div>
      <h2 className="mb-4 text-lg font-bold text-stone-900">+ Gaadi Dalo</h2>
      <CarForm
        dealerLocation={{
          city: dealer.city,
          state: dealer.state,
          address: dealer.address,
          lat: dealer.lat,
          lng: dealer.lng,
        }}
      />
    </div>
  );
}