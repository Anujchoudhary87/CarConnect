export interface PosterImageLike {
  url: string;
  position: number | null;
  created_at?: string | null;
  kind?: string | null;
}

export interface PosterPhotoSelections {
  front: string | null;
  side: string | null;
  rear: string | null;
  interior: string | null;
  dashboard: string | null;
}

export interface PosterVehicleFacts {
  id: string;
  brand: string;
  model: string;
  variant: string;
  year: number;
  fuel: string;
  km: number;
  owner: string;
  transmission: string;
  price: number;
  city: string;
  description: string;
}

export interface PosterDealerFacts {
  dealership_name: string;
  city: string;
  state: string;
  phone: string;
  whatsapp: string;
  verified: boolean;
}

export interface PosterComposeRequestData {
  vehicle: PosterVehicleFacts;
  dealer: PosterDealerFacts;
  images: PosterImageLike[];
}

export interface PosterComposition {
  heroUrl: string;
  highlights: string[];
  photoSelections?: PosterPhotoSelections;
}

export interface PosterComposeResponse {
  vehicle: PosterVehicleFacts;
  dealer: PosterDealerFacts;
  images: PosterImageLike[];
  posterUrl: string | null;
  composition: PosterComposition;
}
