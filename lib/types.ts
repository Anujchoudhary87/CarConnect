export type Role = "customer" | "dealer" | "admin";

export interface UserProfile {
  id: string;
  full_name: string;
  phone: string;
  role: Role;
  is_admin: boolean;
  created_at: string;
  updated_at: string;
}

export interface Dealer {
  id: string;
  user_id: string;
  dealership_name: string;
  owner_name: string;
  phone: string;
  whatsapp: string;
  email: string;
  business_type: string;
  gstin: string;
  city: string;
  state: string;
  address: string;
  lat: number | null;
  lng: number | null;
  bio: string;
  verified: boolean;
  verified_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DealerVerification {
  id: string;
  dealer_id: string;
  user_id: string;
  id_proof_path: string;
  business_proof_path: string;
  notes: string;
  status: string;
  admin_note: string;
  submitted_at: string;
  reviewed_at: string | null;
}

export interface Vehicle {
  id: string;
  dealer_id: string;
  brand: string;
  model: string;
  variant: string;
  year: number;
  fuel: string;
  km: number;
  owner: string;
  transmission: string;
  price: number;
  down_payment: number | null;
  finance_interest_rate: number | null;
  seating_capacity: number | null;
  city: string;
  state: string;
  address: string;
  description: string;
  lat: number | null;
  lng: number | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface VehicleImage {
  id: string;
  vehicle_id: string;
  url: string;
  position: number;
  created_at: string;
  kind?: string;
}

export interface VehicleWithInfo extends Vehicle {
  vehicle_images: VehicleImage[];
  dealer: Dealer | null;
  distance_km?: number | null;
  is_favorite?: boolean;
}

export interface CustomerSellListing {
  id: string;
  user_id: string;
  brand: string;
  model: string;
  variant: string;
  year: number;
  km: number;
  fuel: string;
  owner: string;
  transmission: string;
  city: string;
  lat: number | null;
  lng: number | null;
  expected_price: number;
  description: string;
  photos: string[];
  contact_name: string;
  contact_phone: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface DealerOffer {
  id: string;
  listing_id: string;
  dealer_id: string;
  offer_price: number;
  message: string;
  status: string;
  created_at: string;
  updated_at: string;
  dealer?: Dealer;
}

export interface Enquiry {
  id: string;
  vehicle_id: string;
  dealer_id: string;
  user_id: string | null;
  name: string;
  phone: string;
  message: string;
  type: string;
  created_at: string;
  vehicle?: Vehicle;
}

export interface TestDriveRequest {
  id: string;
  vehicle_id: string;
  dealer_id: string;
  user_id: string | null;
  name: string;
  phone: string;
  preferred_date: string | null;
  preferred_time: string;
  status: string;
  created_at: string;
  vehicle?: Vehicle;
}

export interface DealerInterest {
  id: string;
  vehicle_id: string;
  from_dealer_id: string;
  to_dealer_id: string;
  message: string;
  offer_price: number | null;
  status: string;
  created_at: string;
  updated_at: string;
  vehicle?: Vehicle;
  from_dealer?: Dealer;
  to_dealer?: Dealer;
}

export interface Favorite {
  id: string;
  user_id: string;
  vehicle_id: string;
  created_at: string;
}

export interface MarketplaceFilters {
  q?: string;
  brand?: string;
  model?: string;
  fuel?: string;
  transmission?: string;
  min_price?: string;
  max_price?: string;
  min_year?: string;
  max_year?: string;
  max_km?: string;
  owner?: string;
  seats?: string;
  radius_km?: string;
  lat?: string;
  lng?: string;
  sort?: string;
}

export type DemandSource = "ai_advisor" | "marketplace";

export interface CustomerDemand {
  id: string;
  user_id: string;
  source: DemandSource;
  brand: string;
  model: string;
  fuel: string;
  transmission: string;
  seating_capacity: number | null;
  min_year: number | null;
  max_price: number | null;
  min_price: number | null;
  city: string;
  lat: number | null;
  lng: number | null;
  radius_km: number | null;
  status: string;
  fingerprint: string;
  cluster_key: string;
  raw_requirement: string;
  notify: boolean;
  created_at: string;
}

export interface DemandCluster {
  cluster_key: string;
  brand: string;
  model: string;
  fuel: string;
  seating_capacity: number | null;
  min_year: number | null;
  max_price: number | null;
  city: string;
  customers: number;
  signals: number;
  last_requested: string;
  matching_available?: number;
}

export interface DemandVehicleMatch {
  id: string;
  demand_id: string;
  vehicle_id: string;
  created_at: string;
}

export interface DemandNotification {
  id: string;
  user_id: string;
  type: string;
  demand_id: string | null;
  vehicle_id: string | null;
  title: string;
  message: string;
  read_at: string | null;
  created_at: string;
}