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

// ===== Constants & helpers (formerly in store/admin.ts) =====

export const VEHICLE_STATUS_LABEL: Record<VehicleStatus, string> = {
  active: "Aktif",
  maintenance: "Maintenance",
  offline: "Offline",
};

export const TIER_ORDER: VehicleTier[] = ["Reguler", "SemiExecutive", "Executive"];
export const TYPE_LABEL: Record<VehicleType, string> = {
  minicar: "Minicar",
  suv: "SUV",
  hiace: "Hiace",
};
export const TIER_LABEL: Record<VehicleTier, string> = {
  Reguler: "Reguler",
  SemiExecutive: "Semi Executive",
  Executive: "Executive",
};
export const DEFAULT_CAPACITY: Record<VehicleType, number> = {
  minicar: 6,
  suv: 7,
  hiace: 12,
};

export const countSeatsInMap = (markers: SeatMarker[] | undefined) =>
  (markers ?? []).filter((m) => m.kind === "seat").length;

export const renumberSeatMap = (markers: SeatMarker[], rowGap = 0.06): SeatMarker[] => {
  const seats = markers
    .filter((m) => m.kind === "seat")
    .slice()
    .sort((a, b) => a.y - b.y);
  const buckets: SeatMarker[][] = [];
  for (const s of seats) {
    const b = buckets[buckets.length - 1];
    if (b && Math.abs(s.y - b[0].y) < rowGap) b.push(s);
    else buckets.push([s]);
  }
  const idx = new Map<string, number>();
  let i = 1;
  for (const b of buckets) {
    b.sort((a, c) => a.x - c.x).forEach((m) => idx.set(m.id, i++));
  }
  return markers.map((m) => {
    if (m.kind === "seat") return { ...m, label: String(idx.get(m.id)) };
    const { label: _label, ...rest } = m;
    return rest;
  });
};
