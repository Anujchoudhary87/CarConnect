export const BRANDS = [
  "Maruti Suzuki",
  "Hyundai",
  "Tata",
  "Mahindra",
  "Honda",
  "Toyota",
  "Kia",
  "Volkswagen",
  "Skoda",
  "Renault",
  "Nissan",
  "Ford",
  "Chevrolet",
  "MG",
  "Jeep",
  "Citroën",
  "Fiat",
  "Datsun",
  "Mercedes-Benz",
  "BMW",
  "Audi",
  "Jaguar",
  "Land Rover",
  "Volvo",
  "Porsche",
  "Other",
];

export const FUELS = ["Petrol", "Diesel", "CNG", "Electric", "Hybrid", "LPG"];

export const TRANSMISSIONS = ["Manual", "Automatic", "AMT", "CVT", "DCT"];

export const OWNERS = ["1st", "2nd", "3rd", "4th"];

export const BUSINESS_TYPES = [
  { value: "showroom", label: "Showroom" },
  { value: "independent", label: "Independent Dealer" },
  { value: "online", label: "Online Dealer" },
  { value: "franchise", label: "Franchise" },
];

export const DISTANCE_OPTIONS = [
  { value: "5", label: "5 km" },
  { value: "10", label: "10 km" },
  { value: "25", label: "25 km" },
  { value: "50", label: "50 km" },
  { value: "100", label: "100 km" },
  { value: "200", label: "200 km" },
  { value: "500", label: "500 km" },
];

export const CURRENT_YEAR = new Date().getFullYear();

export const yearOptions = () => {
  const years: number[] = [];
  for (let y = CURRENT_YEAR; y >= 2000; y--) years.push(y);
  return years;
};