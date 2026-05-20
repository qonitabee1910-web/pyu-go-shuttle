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

export const nearbyDrivers = [
  { id: "d1", name: "Andi", plate: "BK 1122 AB", rating: 4.9, lat: 3.5852, lng: 98.6790, vehicle: "Avanza" },
  { id: "d2", name: "Budi", plate: "BK 3344 CD", rating: 4.8, lat: 3.5891, lng: 98.6712, vehicle: "Xenia" },
  { id: "d3", name: "Cici", plate: "BK 5566 EF", rating: 5.0, lat: 3.5805, lng: 98.6855, vehicle: "Innova" },
];

