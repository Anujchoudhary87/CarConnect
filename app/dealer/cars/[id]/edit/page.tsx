import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CarForm } from "@/components/CarForm";
import { requireDealer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Vehicle, VehicleImage } from "@/lib/types";

export const metadata: Metadata = { title: "Edit Car" };

export default async function EditCarPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { dealer } = await requireDealer();
  const supabase = await createClient();

  const { data: vehicle } = await supabase
    .from("vehicles")
    .select("*")
    .eq("id", id)
    .eq("dealer_id", dealer.id)
    .maybeSingle();

  if (!vehicle) redirect("/dealer/cars");

  const { data: images } = await supabase
    .from("vehicle_images")
    .select("url")
    .eq("vehicle_id", id)
    .order("position", { ascending: true });

  return (
    <div>
      <h2 className="mb-4 text-lg font-bold text-stone-900">Edit Car</h2>
      <CarForm
        initial={{
          vehicle: vehicle as Vehicle,
          images: ((images ?? []) as VehicleImage[]).map((i) => i.url),
        }}
      />
    </div>
  );
}