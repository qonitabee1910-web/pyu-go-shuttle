import type { PickupPoint, VehicleType, VehicleTier } from "@/shared/types/shuttle";
import type { SeatMarker, VehicleStatus, VehicleTemplate, AdminSchedule, BookingStatus, AdminBooking } from "./types";

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

// Default seatMap (column-pairs over rows)
export const defaultSeatMap = (type: VehicleType): SeatMarker[] => {
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
