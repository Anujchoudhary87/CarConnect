import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CarGallery } from "@/components/CarGallery";
import { ContactBar } from "@/components/ContactBar";
import { StaticMap } from "@/components/StaticMap";
import { Card, Badge } from "@/components/ui";
import { formatINR, formatKm, ownerLabel, timeAgo } from "@/lib/format";
import type { Dealer, Vehicle, VehicleImage } from "@/lib/types";

export const metadata: Metadata = { title: "Car Details" };

export default async function CarDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: vehicle } = await supabase
    .from("vehicles")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!vehicle) notFound();
  const car = vehicle as Vehicle;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Private cars (pending/sold/rejected) are only visible to their owner / admin.
  if (car.status !== "active") {
    const { data: ownerDealer } = await supabase
      .from("dealers")
      .select("user_id")
      .eq("id", car.dealer_id)
      .maybeSingle();
    const { data: profile } = user
      ? await supabase.from("users").select("is_admin").eq("id", user.id).maybeSingle()
      : { data: null };
    const allowed = ownerDealer?.user_id === user?.id || profile?.is_admin;
    if (!allowed) notFound();
  }

  const { data: images } = await supabase
    .from("vehicle_images")
    .select("url, position")
    .eq("vehicle_id", id)
    .order("position");
  const { data: dealer } = await supabase
    .from("dealers")
    .select("*")
    .eq("id", car.dealer_id)
    .maybeSingle();
  const { data: fav } = user
    ? await supabase
        .from("favorites")
        .select("id")
        .eq("vehicle_id", id)
        .eq("user_id", user.id)
        .maybeSingle()
    : { data: null };

  const dealerRow = (dealer as Dealer) ?? null;
  const imageUrls = ((images ?? []) as VehicleImage[]).map((i) => i.url);
  const isFavorite = Boolean((fav as { id: string } | null)?.id);

  const specs = [
    { label: "Year", value: String(car.year) },
    { label: "KM Driven", value: formatKm(car.km) },
    { label: "Fuel", value: car.fuel },
    { label: "Transmission", value: car.transmission },
    { label: "Ownership", value: ownerLabel(car.owner) },
    { label: "Variant", value: car.variant || "—" },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <p className="mb-3 text-xs text-stone-400">Listed {timeAgo(car.created_at)}</p>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="min-w-0">
          <h1 className="text-2xl font-extrabold text-stone-900">
            {car.brand} {car.model} {car.variant}
          </h1>
          <div className="mt-2 flex items-center gap-2 text-sm text-stone-500">
            <Badge status={car.status}>{car.status}</Badge>
            <span>{car.city || "Location not set"}</span>
          </div>

          <div className="mt-4">
            <CarGallery images={imageUrls} title={`${car.brand} ${car.model}`} />
          </div>

          <Card className="mt-5 p-5">
            <h2 className="font-semibold text-stone-900">Car Details</h2>
            <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
              {specs.map((s) => (
                <div key={s.label} className="rounded-lg bg-stone-50 p-3">
                  <dt className="text-xs font-medium text-stone-400">{s.label}</dt>
                  <dd className="mt-0.5 font-semibold text-stone-800">{s.value}</dd>
                </div>
              ))}
            </dl>
            {car.description && (
              <div className="mt-4">
                <h3 className="text-sm font-semibold text-stone-900">Description</h3>
                <p className="mt-1 whitespace-pre-line text-sm text-stone-600">{car.description}</p>
              </div>
            )}
          </Card>

          {car.lat && car.lng && (
            <Card className="mt-5 p-5">
              <h2 className="mb-3 font-semibold text-stone-900">Location</h2>
              <StaticMap lat={car.lat} lng={car.lng} />
            </Card>
          )}
        </div>

        <aside className="space-y-4">
          <Card className="p-5">
            <p className="text-3xl font-extrabold text-brand-dark">{formatINR(car.price)}</p>
            <p className="mt-0.5 text-xs text-stone-400">On-road price expected, dealer se confirm karein.</p>
            <div className="mt-4">
              <ContactBar
                vehicle={car}
                dealer={dealerRow}
                isFavorite={isFavorite}
              />
            </div>
          </Card>

          {dealerRow && (
            <Card className="p-5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-semibold text-stone-900">{dealerRow.dealership_name}</h3>
                  <p className="text-sm text-stone-500">
                    {dealerRow.city}
                    {dealerRow.state ? `, ${dealerRow.state}` : ""}
                  </p>
                </div>
                {dealerRow.verified && (
                  <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-bold text-emerald-700">
                    ✓ Verified
                  </span>
                )}
              </div>
              {dealerRow.bio && <p className="mt-3 text-sm text-stone-600">{dealerRow.bio}</p>}
            </Card>
          )}
        </aside>
      </div>
    </div>
  );
}