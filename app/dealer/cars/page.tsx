import type { Metadata } from "next";
import Link from "next/link";
import { requireDealer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ButtonLink, EmptyState } from "@/components/ui";
import { CarManageItem } from "@/components/CarManageItem";
import type { Vehicle, VehicleImage } from "@/lib/types";

export const metadata: Metadata = { title: "My Cars" };

export default async function MyCarsPage() {
  const { dealer } = await requireDealer();
  const supabase = await createClient();

  const { data: vehicles } = await supabase
    .from("vehicles")
    .select("*")
    .eq("dealer_id", dealer.id)
    .order("created_at", { ascending: false });

  const cars = (vehicles ?? []) as Vehicle[];

  let imageMap: Record<string, string[]> = {};
  if (cars.length > 0) {
    const { data: images } = await supabase
      .from("vehicle_images")
      .select("vehicle_id, url, position")
      .in("vehicle_id", cars.map((c) => c.id))
      .order("position", { ascending: true });
    imageMap = ((images ?? []) as VehicleImage[]).reduce<Record<string, string[]>>((acc, img) => {
      (acc[img.vehicle_id] ??= []).push(img.url);
      return acc;
    }, {});
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-stone-900">Meri Gaadiyan ({cars.length})</h2>
        <ButtonLink href="/dealer/cars/new" size="sm">+ Add Car</ButtonLink>
      </div>

      <div className="mt-4 space-y-3">
        {cars.length === 0 && (
          <EmptyState
            icon="🚗"
            title="Koi car nahi hai"
            description="'+ Add Car' dabao aur pehli gaadi online karo."
            action={<ButtonLink href="/dealer/cars/new">+ Add Car</ButtonLink>}
          />
        )}
        {cars.map((car) => (
          <CarManageItem
            key={car.id}
            vehicle={car}
            images={imageMap[car.id] ?? []}
            editHref={`/dealer/cars/${car.id}/edit`}
            viewHref={`/cars/${car.id}`}
          />
        ))}
      </div>

      {cars.length > 0 && (
        <p className="mt-4 text-xs text-stone-400">
          Tip: Sold mark karne se listing customers se hide ho jati hai.
        </p>
      )}
    </div>
  );
}