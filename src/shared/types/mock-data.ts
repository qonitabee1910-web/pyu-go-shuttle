// Mock data for PYU-GO — Phase 1 (no backend yet)
export type VehicleType = "minicar" | "suv" | "hiace";
export type VehicleTier = "Reguler" | "SemiExecutive" | "Executive";

export interface PickupPoint {
  id: string;
  rayon: string;
  name: string;
  address: string;
  city: string;
  distanceKm: number;
  etaMin: number;
  lat: number;
  lng: number;
}

export interface Schedule {
  id: string;
  pickupId: string;
  departureTime: string; // HH:mm
  arrivalTime: string;
  vehicleType: VehicleType;
  vehicleName: string;
  className: VehicleTier;
  price: number;
  seatsTotal: number;
  seatsBooked: string[]; // seat numbers booked
  plate: string;
}

export const KNO_AIRPORT = {
  name: "Kualanamu Intl. Airport (KNO)",
  code: "KNO",
  lat: 3.6422,
  lng: 98.8853,
};

export const pickupPoints: PickupPoint[] = [
  { id: "pp-1", rayon: "Rayon A", name: "Hermes Palace Hotel", address: "Jl. Pemuda No.1, Medan", city: "Medan", distanceKm: 2.4, etaMin: 8, lat: 3.5852, lng: 98.6789 },
  { id: "pp-2", rayon: "Rayon B", name: "Cambridge City Square", address: "Jl. S. Parman, Medan", city: "Medan", distanceKm: 3.1, etaMin: 11, lat: 3.5723, lng: 98.6671 },
  { id: "pp-3", rayon: "Rayon C", name: "Hotel TD Pardede", address: "Jl. Ir. H. Juanda, Medan", city: "Medan", distanceKm: 4.5, etaMin: 14, lat: 3.5685, lng: 98.6841 },
  { id: "pp-4", rayon: "Rayon A", name: "Sun Plaza", address: "Jl. Zainul Arifin, Medan", city: "Medan", distanceKm: 2.9, etaMin: 10, lat: 3.5811, lng: 98.6745 },
  { id: "pp-5", rayon: "Rayon B", name: "Centre Point Mall", address: "Jl. Jawa No.8, Medan", city: "Medan", distanceKm: 3.6, etaMin: 12, lat: 3.5901, lng: 98.6952 },
  { id: "pp-6", rayon: "Rayon C", name: "Adimulia Hotel", address: "Jl. Diponegoro, Medan", city: "Medan", distanceKm: 4.1, etaMin: 13, lat: 3.5772, lng: 98.6699 },
  { id: "pp-7", rayon: "Rayon A", name: "Grand Aston City Hall", address: "Jl. Balai Kota, Medan", city: "Medan", distanceKm: 2.7, etaMin: 9, lat: 3.5876, lng: 98.6803 },
  { id: "pp-8", rayon: "Rayon B", name: "JW Marriott Medan", address: "Jl. Putri Hijau, Medan", city: "Medan", distanceKm: 3.3, etaMin: 11, lat: 3.5921, lng: 98.6781 },
];

const seatPool = (total: number, bookedCount: number) => {
  const all = Array.from({ length: total }, (_, i) => `${i + 1}`);
  const shuffled = [...all].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, bookedCount);
};

const baseSchedules = (pickupId: string): Schedule[] => [
  { id: `${pickupId}-s1`, pickupId, departureTime: "05:00", arrivalTime: "06:30", vehicleType: "hiace", vehicleName: "Toyota Hiace Executive", className: "Executive", price: 180000, seatsTotal: 12, seatsBooked: seatPool(12, 4), plate: "BK 1234 GO" },
  { id: `${pickupId}-s2`, pickupId, departureTime: "08:00", arrivalTime: "09:30", vehicleType: "suv", vehicleName: "Toyota Innova Reborn", className: "SemiExecutive", price: 140000, seatsTotal: 7, seatsBooked: seatPool(7, 3), plate: "BK 4567 GO" },
  { id: `${pickupId}-s3`, pickupId, departureTime: "11:30", arrivalTime: "13:00", vehicleType: "hiace", vehicleName: "Toyota Hiace Commuter", className: "Reguler", price: 130000, seatsTotal: 12, seatsBooked: seatPool(12, 2), plate: "BK 7890 GO" },
  { id: `${pickupId}-s4`, pickupId, departureTime: "14:30", arrivalTime: "16:00", vehicleType: "minicar", vehicleName: "Toyota Avanza", className: "Reguler", price: 110000, seatsTotal: 6, seatsBooked: seatPool(6, 2), plate: "BK 2345 GO" },
  { id: `${pickupId}-s5`, pickupId, departureTime: "17:00", arrivalTime: "18:30", vehicleType: "hiace", vehicleName: "Toyota Hiace Premio", className: "SemiExecutive", price: 160000, seatsTotal: 12, seatsBooked: seatPool(12, 7), plate: "BK 6789 GO" },
  { id: `${pickupId}-s6`, pickupId, departureTime: "20:00", arrivalTime: "21:30", vehicleType: "suv", vehicleName: "Mitsubishi Xpander", className: "Executive", price: 170000, seatsTotal: 7, seatsBooked: seatPool(7, 2), plate: "BK 1357 GO" },
];

export const getSchedulesForPickup = (pickupId: string) => baseSchedules(pickupId);

export const formatRupiah = (n: number) =>
  "Rp " + n.toLocaleString("id-ID");

export const promos = [
  { id: "p1", title: "Weekend Shuttle", subtitle: "Diskon 25% ke KNO", code: "PYUWEEKEND", img: "promo-1" },
  { id: "p2", title: "Ride Cashback", subtitle: "Cashback 15rb tiap perjalanan", code: "PYURIDE", img: "promo-2" },
];

export const popularRoutes = [
  { id: "r1", from: "Hermes Palace", to: "KNO Airport", price: 150000, duration: "1j 30m" },
  { id: "r2", from: "Cambridge", to: "KNO Airport", price: 120000, duration: "1j 30m" },
  { id: "r3", from: "TD Pardede", to: "KNO Airport", price: 145000, duration: "1j 30m" },
  { id: "r4", from: "Sun Plaza", to: "KNO Airport", price: 140000, duration: "1j 25m" },
];

export const nearbyDrivers = [
  { id: "d1", name: "Andi", plate: "BK 1122 AB", rating: 4.9, lat: 3.5852, lng: 98.6790, vehicle: "Avanza" },
  { id: "d2", name: "Budi", plate: "BK 3344 CD", rating: 4.8, lat: 3.5891, lng: 98.6712, vehicle: "Xenia" },
  { id: "d3", name: "Cici", plate: "BK 5566 EF", rating: 5.0, lat: 3.5805, lng: 98.6855, vehicle: "Innova" },
];
