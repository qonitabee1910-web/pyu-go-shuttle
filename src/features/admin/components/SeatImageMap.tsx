import type { SeatMarker } from "@/features/admin/store/admin";
import { cn } from "@/shared/utils/utils";
import { Car, DoorOpen } from "lucide-react";
import { SeatGlyph } from "./SeatGlyph";

interface Props {
  imageUrl?: string;
  markers: SeatMarker[];
  selected?: string[];
  booked?: string[];
  onToggle?: (label: string) => void;
  aspectRatio?: number; // used when imageUrl is missing (default 3/4 portrait-ish)
}

export function SeatImageMap({ imageUrl, markers, selected = [], booked = [], onToggle, aspectRatio = 3 / 4 }: Props) {
  return (
    <div className="relative w-full overflow-hidden rounded-2xl border-2 border-border bg-card">
      {imageUrl ? (
        <img src={imageUrl} alt="Denah kursi" className="block h-auto w-full" draggable={false} />
      ) : (
        <div
          aria-hidden
          className="w-full bg-gradient-to-b from-muted/60 to-muted/20"
          style={{ aspectRatio: `${aspectRatio}` }}
        />
      )}
      {markers.map((m) => {
        if (m.kind === "driver") {
          return (
            <div
              key={m.id}
              className="absolute flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-foreground text-background shadow-md"
              style={{ left: `${m.x * 100}%`, top: `${m.y * 100}%` }}
              aria-label="Sopir"
            >
              <Car className="h-3.5 w-3.5" />
            </div>
          );
        }
        if (m.kind === "door") {
          return (
            <div
              key={m.id}
              className="absolute flex h-7 w-5 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-sm bg-amber-400 text-amber-950 shadow-md"
              style={{ left: `${m.x * 100}%`, top: `${m.y * 100}%` }}
              aria-label="Pintu"
            >
              <DoorOpen className="h-3 w-3" />
            </div>
          );
        }
        const label = m.label ?? "?";
        const isBooked = booked.includes(label);
        const isSelected = selected.includes(label);
        const state = isBooked ? "booked" : isSelected ? "selected" : "available";
        return (
          <button
            key={m.id}
            type="button"
            disabled={isBooked || !onToggle}
            aria-pressed={isSelected}
            aria-label={`Kursi ${label}${isBooked ? " (terisi)" : ""}`}
            onClick={() => onToggle?.(label)}
            className={cn(
              "absolute -translate-x-1/2 -translate-y-1/2 transition-transform rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              isBooked && "cursor-not-allowed",
              isSelected && "scale-110",
              !isBooked && !isSelected && "hover:scale-105",
            )}
            style={{ left: `${m.x * 100}%`, top: `${m.y * 100}%` }}
          >
            <SeatGlyph label={label} state={state} rotation={m.rotation ?? 0} size={34} />
          </button>
        );
      })}
    </div>
  );
}
