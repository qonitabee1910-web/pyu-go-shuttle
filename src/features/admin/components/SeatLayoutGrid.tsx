import type { SeatCell } from "@/features/admin/store/admin";
import { cn } from "@/shared/utils/utils";

const cycle: Record<SeatCell["kind"], SeatCell["kind"]> = {
  seat: "aisle",
  aisle: "driver",
  driver: "door",
  door: "empty",
  empty: "seat",
};

const swatch: Record<SeatCell["kind"], string> = {
  seat: "bg-primary/15 text-primary border-primary/40",
  aisle: "bg-muted text-muted-foreground border-dashed border-muted-foreground/30",
  driver: "bg-foreground text-background border-foreground",
  door: "bg-amber-100 text-amber-800 border-amber-300",
  empty: "bg-transparent border-dashed border-muted-foreground/20 text-muted-foreground/50",
};

const symbol: Record<SeatCell["kind"], string> = {
  seat: "",
  aisle: "·",
  driver: "🚗",
  door: "▭",
  empty: "+",
};

interface Props {
  layout: SeatCell[][];
  editable?: boolean;
  onChange?: (layout: SeatCell[][]) => void;
}

export function SeatLayoutGrid({ layout, editable, onChange }: Props) {
  const cols = Math.max(...layout.map((r) => r.length));

  const click = (ri: number, ci: number) => {
    if (!editable || !onChange) return;
    const next = layout.map((r) => r.slice());
    const cur = next[ri][ci];
    const nextKind = cycle[cur.kind];
    next[ri][ci] = nextKind === "seat" ? { kind: "seat", label: "?" } : { kind: nextKind } as SeatCell;
    onChange(next);
  };

  return (
    <div className="rounded-2xl border-2 border-border bg-card p-3">
      <div className="mb-2 flex items-center justify-center gap-2 text-xs text-muted-foreground">
        <div className="h-px flex-1 bg-border" />
        <span className="rounded-full bg-muted px-3 py-0.5 font-medium">Depan</span>
        <div className="h-px flex-1 bg-border" />
      </div>
      <div className="space-y-1.5">
        {layout.map((row, ri) => (
          <div
            key={ri}
            className="grid gap-1.5"
            style={{ gridTemplateColumns: `repeat(${cols}, minmax(0,1fr))` }}
          >
            {Array.from({ length: cols }).map((_, ci) => {
              const cell = row[ci] ?? ({ kind: "empty" } as SeatCell);
              const label = cell.kind === "seat" ? cell.label : symbol[cell.kind];
              return (
                <button
                  key={ci}
                  type="button"
                  onClick={() => click(ri, ci)}
                  disabled={!editable}
                  className={cn(
                    "flex h-9 items-center justify-center rounded-lg border-2 text-xs font-bold transition",
                    swatch[cell.kind],
                    editable && "hover:scale-105 cursor-pointer",
                  )}
                >
                  {label}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
