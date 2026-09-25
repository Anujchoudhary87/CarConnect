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
  down_payment?: number | null;
  finance_interest_rate?: number | null;
  seating_capacity?: number | null;
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

  const downPayment = body.down_payment;
  if (downPayment !== undefined && downPayment !== null) {
    if (typeof downPayment !== "number" || isNaN(downPayment)) return "Down payment is invalid";
    if (downPayment < 0) return "Down payment cannot be negative";
    if (downPayment > price) return "Down payment cannot exceed vehicle price";
  }

  const rate = body.finance_interest_rate;
  if (rate !== undefined && rate !== null) {
    if (typeof rate !== "number" || isNaN(rate)) return "Interest rate is invalid";
    if (rate < 0 || rate > 30) return "Interest rate must be between 0 and 30";
  }

  const seats = body.seating_capacity;
  if (seats !== undefined && seats !== null) {
    if (typeof seats !== "number" || !Number.isInteger(seats) || seats < 1) {
      return "Seating capacity must be a positive whole number";
    }
  }

  return null;
}