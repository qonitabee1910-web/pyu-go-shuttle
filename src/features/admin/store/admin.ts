import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  pickupPoints as seedPickup,
  getSchedulesForPickup,
} from "@/shared/types/mock-data";
import { formatRupiah } from "@/shared/utils/utils";
import type { PickupPoint, VehicleType, VehicleTier } from "@/shared/types/mock-data";

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

// Legacy helpers (used by SeatLayoutGrid in other places).
export const layoutToCounts = (layout: SeatCell[][]) => {
  let seats = 0;
  layout.forEach((r) => r.forEach((c) => c.kind === "seat" && seats++));
  return seats;
};
export const renumberLayout = (layout: SeatCell[][]): SeatCell[][] => {
  let i = 1;
  return layout.map((row) =>
    row.map((cell) => (cell.kind === "seat" ? { kind: "seat" as const, label: String(i++) } : cell)),
  );
};

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

export type BookingStatus = "pending" | "confirmed" | "boarded" | "cancelled" | "refunded";

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

const VEHICLE_NAMES: Record<VehicleType, Record<VehicleTier, string>> = {
  minicar: {
    Reguler: "Toyota Avanza",
    SemiExecutive: "Honda Mobilio",
    Executive: "Toyota Veloz",
  },
  suv: {
    Reguler: "Mitsubishi Xpander",
    SemiExecutive: "Toyota Innova",
    Executive: "Toyota Fortuner",
  },
  hiace: {
    Reguler: "Toyota Hiace Commuter",
    SemiExecutive: "Toyota Hiace Premio",
    Executive: "Toyota Hiace Executive",
  },
};

// Build a simple default seatMap (column-pairs over rows) so cards aren't empty
// before admin uploads a real floor-plan image.
const defaultSeatMap = (type: VehicleType): SeatMarker[] => {
  const cap = DEFAULT_CAPACITY[type];
  const out: SeatMarker[] = [
    { id: "driver", x: 0.22, y: 0.12, kind: "driver" },
    { id: "door", x: 0.78, y: 0.12, kind: "door" },
  ];
  const cols = type === "hiace" ? 3 : 2;
  const rows = Math.ceil(cap / cols);
  let n = 1;
  for (let r = 0; r < rows && n <= cap; r++) {
    for (let c = 0; c < cols && n <= cap; c++) {
      out.push({
        id: `s-${n}`,
        x: 0.22 + (c * 0.56) / Math.max(cols - 1, 1),
        y: 0.3 + (r * 0.6) / Math.max(rows - 1, 1),
        kind: "seat",
        label: String(n),
      });
      n++;
    }
  }
  return out;
};

const seedVehicles = (): VehicleTemplate[] => {
  const plates = ["BK 1101 GO", "BK 1102 GO", "BK 1103 GO", "BK 2201 GO", "BK 2202 GO", "BK 2203 GO", "BK 3301 GO", "BK 3302 GO", "BK 3303 GO"];
  let i = 0;
  const out: VehicleTemplate[] = [];
  (["minicar", "suv", "hiace"] as VehicleType[]).forEach((type) => {
    TIER_ORDER.forEach((tier) => {
      out.push({
        id: `v-${type}-${tier.toLowerCase()}`,
        name: VEHICLE_NAMES[type][tier],
        type,
        tier,
        plate: plates[i++] ?? "BK 0000 GO",
        status: "active",
        seatMap: defaultSeatMap(type),
      });
    });
  });
  return out;
};

const seedSchedules = (vehicles: VehicleTemplate[]): AdminSchedule[] => {
  const out: AdminSchedule[] = [];
  const vById = (t: VehicleType) => vehicles.find((v) => v.type === t)!.id;
  seedPickup.forEach((p) => {
    getSchedulesForPickup(p.id).forEach((s) => {
      out.push({
        id: s.id,
        pickupId: p.id,
        vehicleId: vById(s.vehicleType),
        departureTime: s.departureTime,
        arrivalTime: s.arrivalTime,
        price: s.price,
        active: true,
      });
    });
  });
  return out;
};

const FIRST_NAMES = ["Andi", "Budi", "Citra", "Dewi", "Eka", "Fadli", "Galih", "Hana", "Indra", "Joko", "Kirana", "Lina", "Mira", "Nanda", "Oka"];
const LAST_NAMES = ["Saputra", "Wijaya", "Pratama", "Lestari", "Hidayat", "Nasution", "Tarigan", "Siregar", "Sembiring", "Hutapea"];
const STATUSES: BookingStatus[] = ["pending", "confirmed", "boarded", "cancelled", "confirmed", "confirmed"];

const seedBookings = (schedules: AdminSchedule[]): AdminBooking[] => {
  const out: AdminBooking[] = [];
  for (let i = 0; i < 28; i++) {
    const s = schedules[Math.floor(Math.random() * schedules.length)];
    const seatCount = 1 + Math.floor(Math.random() * 3);
    const seats = Array.from({ length: seatCount }, (_, k) => String(1 + Math.floor(Math.random() * 12) + k));
    const fn = FIRST_NAMES[i % FIRST_NAMES.length];
    const ln = LAST_NAMES[(i * 3) % LAST_NAMES.length];
    const daysAgo = Math.floor(Math.random() * 5);
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);
    out.push({
      id: `bk-${i}`,
      code: "PYU" + (1000 + i),
      passengerName: `${fn} ${ln}`,
      passengerPhone: "+62 812-" + (1000 + i * 7) + "-" + (2000 + i * 3),
      pickupId: s.pickupId,
      scheduleId: s.id,
      seats,
      amount: s.price * seatCount,
      status: STATUSES[i % STATUSES.length],
      createdAt: date.toISOString(),
    });
  }
  return out;
};

interface AdminState {
  pickupPoints: PickupPoint[];
  vehicles: VehicleTemplate[];
  schedules: AdminSchedule[];
  bookings: AdminBooking[];
  // pickup
  upsertPickup: (p: PickupPoint) => void;
  deletePickup: (id: string) => void;
  // vehicle
  upsertVehicle: (v: VehicleTemplate) => void;
  deleteVehicle: (id: string) => void;
  setVehicleStatus: (id: string, status: VehicleStatus) => void;
  setVehiclePlate: (id: string, plate: string) => void;
  // schedule
  upsertSchedule: (s: AdminSchedule) => void;
  deleteSchedule: (id: string) => void;
  toggleScheduleActive: (id: string) => void;
  // booking
  setBookingStatus: (id: string, status: BookingStatus, note?: string) => void;
  resetAll: () => void;
}

const buildSeed = () => {
  const vehicles = seedVehicles();
  const schedules = seedSchedules(vehicles);
  const bookings = seedBookings(schedules);
  return { vehicles, schedules, bookings, pickupPoints: seedPickup };
};

export const useAdmin = create<AdminState>()(
  persist(
    (set) => ({
      ...buildSeed(),
      upsertPickup: (p) =>
        set((st) => {
          const ex = st.pickupPoints.findIndex((x) => x.id === p.id);
          const next = [...st.pickupPoints];
          if (ex >= 0) next[ex] = p;
          else next.push(p);
          return { pickupPoints: next };
        }),
      deletePickup: (id) => set((st) => ({ pickupPoints: st.pickupPoints.filter((p) => p.id !== id) })),
      upsertVehicle: (v) =>
        set((st) => {
          const ex = st.vehicles.findIndex((x) => x.id === v.id);
          const next = [...st.vehicles];
          if (ex >= 0) next[ex] = v;
          else next.push(v);
          return { vehicles: next };
        }),
      deleteVehicle: (id) => set((st) => ({ vehicles: st.vehicles.filter((v) => v.id !== id) })),
      setVehicleStatus: (id, status) =>
        set((st) => ({
          vehicles: st.vehicles.map((v) => (v.id === id ? { ...v, status } : v)),
        })),
      setVehiclePlate: (id, plate) =>
        set((st) => ({
          vehicles: st.vehicles.map((v) => (v.id === id ? { ...v, plate } : v)),
        })),
      upsertSchedule: (s) =>
        set((st) => {
          const ex = st.schedules.findIndex((x) => x.id === s.id);
          const next = [...st.schedules];
          if (ex >= 0) next[ex] = s;
          else next.push(s);
          return { schedules: next };
        }),
      deleteSchedule: (id) => set((st) => ({ schedules: st.schedules.filter((s) => s.id !== id) })),
      toggleScheduleActive: (id) =>
        set((st) => ({
          schedules: st.schedules.map((s) => (s.id === id ? { ...s, active: !s.active } : s)),
        })),
      setBookingStatus: (id, status, note) =>
        set((st) => ({
          bookings: st.bookings.map((b) => (b.id === id ? { ...b, status, note: note ?? b.note } : b)),
        })),
      resetAll: () => set(buildSeed()),
    }),
    {
      name: "pyu-admin-v3",
    },
  ),
);
