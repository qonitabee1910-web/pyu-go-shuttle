export type VehicleType = "minicar" | "suv" | "hiace";
export type VehicleTier = "Reguler" | "SemiExecutive" | "Executive";

export interface PickupPoint {
  id: string;
  rayon: string;
  name: string;
  address: string;
  city?: string;
  distanceKm: number;
  etaMin: number;
  lat: number;
  lng: number;
  imageUrl?: string;
  gallery?: string[];
}

export interface Schedule {
  id: string;
  pickupId: string;
  vehicleId: string;
  departureTime: string;
  arrivalTime: string;
  vehicleType: string;
  vehicleName: string;
  className: string;
  price: number;
  seatsTotal: number;
  seatsBooked: string[];
  plate: string;
}

export const KNO_AIRPORT = {
  name: "Kualanamu Intl. Airport (KNO)",
  code: "KNO",
  lat: 3.6422,
  lng: 98.8853,
};

