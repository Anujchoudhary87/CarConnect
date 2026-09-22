import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getPosterProvider } from "@/lib/poster/provider";
import { sortVehicleImages, isPosterImage } from "@/lib/poster/sort";
import type {
  PosterComposeRequestData,
  PosterDealerFacts,
  PosterImageLike,
  PosterVehicleFacts,
} from "@/lib/poster/types";
import type { Dealer, Vehicle, VehicleImage } from "@/lib/types";

export async function POST(_request: NextRequest, ctx: RouteContext<"/api/vehicles/[id]/poster">) {
  const { id } = await ctx.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Not authenticated" }, { status: 401 });

  const { data: profile } = await supabase
    .from("users")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();
  const { data: dealerByUser } = await supabase
    .from("dealers")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  const { data: vehicle } = await supabase
    .from("vehicles")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!vehicle) return Response.json({ error: "Vehicle not found" }, { status: 404 });
  const car = vehicle as Vehicle;

  const owner = dealerByUser?.id === car.dealer_id;
  const admin = Boolean(profile?.is_admin);
  if (!owner && !admin) return Response.json({ error: "Vehicle not found" }, { status: 404 });

  const { data: dealerRow } = await supabase
    .from("dealers")
    .select("*")
    .eq("id", car.dealer_id)
    .maybeSingle();
  if (!dealerRow) return Response.json({ error: "Dealer not found" }, { status: 404 });
  const dealer = dealerRow as Dealer;

  const { data: imageRows } = await supabase
    .from("vehicle_images")
    .select("url, position, created_at")
    .eq("vehicle_id", id)
    .order("position", { ascending: true });

  const images = sortVehicleImages(
    ((imageRows ?? []) as VehicleImage[]).map<PosterImageLike>((img) => ({
      url: img.url,
      position: img.position,
      created_at: img.created_at,
    })),
  );
  if (images.length === 0) {
    return Response.json({ error: "Pehle at least ek photo upload karein" }, { status: 400 });
  }

  const vehicleFacts: PosterVehicleFacts = {
    id: car.id,
    brand: car.brand,
    model: car.model,
    variant: car.variant,
    year: car.year,
    fuel: car.fuel,
    km: car.km,
    owner: car.owner,
    transmission: car.transmission,
    price: car.price,
    city: car.city,
    description: car.description,
  };

  const dealerFacts: PosterDealerFacts = {
    dealership_name: dealer.dealership_name,
    city: dealer.city,
    state: dealer.state,
    phone: dealer.phone,
    whatsapp: dealer.whatsapp,
    verified: dealer.verified,
  };

  const request: PosterComposeRequestData = {
    vehicle: vehicleFacts,
    dealer: dealerFacts,
    images,
  };

  const composition = await getPosterProvider().compose(request);
  const posterUrl = images.find(isPosterImage)?.url ?? null;

  return Response.json(
    {
      vehicle: vehicleFacts,
      dealer: dealerFacts,
      images,
      posterUrl,
      composition,
    },
    { status: 200 },
  );
}