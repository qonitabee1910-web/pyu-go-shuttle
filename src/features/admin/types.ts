import type { PickupPoint, VehicleType, VehicleTier } from "@/shared/types/shuttle";

// Legacy grid cell — kept for backward compatibility with SeatLayoutGrid.
export type SeatCell =
  | { kind: "seat"; label: string }
  | { kind: "aisle" }
  | { kind: "driver" }
  | { kind: "door" }
  | { kind: "empty" };

export interface SeatMarker {
  id: string;
  x: number; // 0..1 relative to image width
  y: number; // 0..1 relative to image height
  kind: "seat" | "driver" | "door";
  label?: string;
  rotation?: 0 | 90 | 180 | 270;
}

export type VehicleStatus = "active" | "maintenance" | "offline";

export interface VehicleTemplate {
  id: string;
  name: string;
  type: VehicleType;
  plate: string;
  tier: VehicleTier;
  status?: VehicleStatus; // default "active"
  imageUrl?: string;
  seatMap?: SeatMarker[];
}

export interface AdminSchedule {
  id: string;
  pickupId: string;
  vehicleId: string;
  departureTime: string;
  arrivalTime: string;
  price: number;
  active: boolean;
  seatQuota?: number; // override kursi yang dijual; default = kapasitas kendaraan
}

export type BookingStatus = "pending" | "confirmed" | "paid" | "completed" | "boarded" | "cancelled" | "refunded";

export interface AdminBooking {
  id: string;
  code: string;
  passengerName: string;
  passengerPhone: string;
  pickupId: string;
  scheduleId: string;
  seats: string[];
  amount: number;
  status: BookingStatus;
  createdAt: string;
  note?: string;
}
