export interface VehicleInput {
  brand?: string;
  model?: string;
  variant?: string;
  year?: number;
  fuel?: string;
  km?: number;
  owner?: string;
  transmission?: string;
  price?: number;
  city?: string;
  description?: string;
  lat?: number | null;
  lng?: number | null;
  images?: string[];
}

const REQUIRED = ["brand", "model", "year", "fuel", "km", "owner", "transmission", "price"];

export function validateInput(body: VehicleInput): string | null {
  for (const key of REQUIRED) {
    const v = body[key as keyof VehicleInput];
    if (v === undefined || v === "" || v === null) return `${key} is required`;
  }
  const year = Number(body.year);
  const km = Number(body.km);
  const price = Number(body.price);
  if (isNaN(year) || year < 1980 || year > 2100) return "Year is invalid";
  if (isNaN(km) || km < 0) return "KM is invalid";
  if (isNaN(price) || price <= 0) return "Price is invalid";
  return null;
}