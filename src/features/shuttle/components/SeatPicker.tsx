import { motion } from "framer-motion";
import type { VehicleType } from "@/shared/types/mock-data";
import { SeatGlyph } from "@/features/admin/components/SeatGlyph";
import { cn } from "@/shared/utils/utils";

interface SeatPickerProps {
  vehicle: VehicleType;
  booked: string[];
  selected: string[];
  onToggle: (seat: string) => void;
  maxSelect?: number;
}

// Each layout: array of rows, each row is array of cells (seat number or "" empty/aisle)
const LAYOUTS: Record<VehicleType, string[][]> = {
  hiace: [
    ["D", "", "", ""],
    ["1", "2", "", "3"],
    ["4", "5", "", "6"],
    ["7", "8", "", "9"],
    ["10", "11", "12", ""],
  ],
  suv: [
    ["D", "", "1"],
    ["2", "", "3"],
    ["4", "5", "6"],
    ["", "7", ""],
  ],
  minicar: [
    ["D", "", "1"],
    ["2", "3", "4"],
    ["5", "", "6"],
  ],
};

export function SeatPicker({
  vehicle,
  booked,
  selected,
  onToggle,
  maxSelect = 4,
}: SeatPickerProps) {
  const layout = LAYOUTS[vehicle];
  const cols = Math.max(...layout.map((r) => r.length));

  const status = (n: string) => {
    if (n === "D") return "driver";
    if (booked.includes(n)) return "booked";
    if (selected.includes(n)) return "selected";
    return "available";
  };

  return (
    <div className="mx-auto w-full max-w-xs">
      {/* Front of vehicle */}
      <div className="mb-3 flex items-center justify-center gap-2 text-xs text-muted-foreground">
        <div className="h-px flex-1 bg-border" />
        <span className="rounded-full bg-muted px-3 py-1 font-medium">Depan kendaraan</span>
        <div className="h-px flex-1 bg-border" />
      </div>

      <div
        className="rounded-3xl border-2 border-border bg-card-gradient p-4 shadow-card"
      >
        <div className="space-y-2">
          {layout.map((row, ri) => (
            <div
              key={ri}
              className="grid gap-2"
              style={{ gridTemplateColumns: `repeat(${cols}, minmax(0,1fr))` }}
            >
              {row.map((cell, ci) => {
                if (!cell) return <div key={ci} />;
                const s = status(cell);
                if (s === "driver") {
                  return (
                    <div
                      key={ci}
                      className="col-span-1 flex h-10 items-center justify-center rounded-xl bg-muted text-xs font-semibold text-muted-foreground"
                    >
                      🚗
                    </div>
                  );
                }
                const isBooked = s === "booked";
                const isSelected = s === "selected";
                return (
                  <motion.button
                    key={ci}
                    type="button"
                    disabled={isBooked}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => {
                      if (isBooked) return;
                      if (!isSelected && selected.length >= maxSelect) return;
                      onToggle(cell);
                    }}
                    className={[
                      "relative h-10 w-full rounded-xl text-xs font-bold transition-all",
                      "border-2",
                      isSelected
                        ? "bg-primary text-primary-foreground border-primary shadow-card"
                        : isBooked
                          ? "bg-destructive/15 text-destructive border-destructive/30 cursor-not-allowed line-through"
                          : "bg-primary-soft text-primary border-transparent hover:border-primary",
                    ].join(" ")}
                  >
                    {cell}
                  </motion.button>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap justify-center gap-3 text-xs">
        <LegendDot color="bg-primary-soft border-primary-soft" label="Tersedia" />
        <LegendDot color="bg-primary border-primary" label="Dipilih" />
        <LegendDot color="bg-destructive/15 border-destructive/30" label="Terisi" />
      </div>
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5 text-muted-foreground">
      <span className={`h-3.5 w-3.5 rounded border-2 ${color}`} />
      {label}
    </span>
  );
}
