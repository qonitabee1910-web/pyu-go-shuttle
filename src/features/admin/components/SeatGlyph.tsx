import { cn } from "@/shared/utils/utils";

export type SeatState = "available" | "selected" | "booked" | "editor";

interface Props {
  label?: string;
  state?: SeatState;
  rotation?: 0 | 90 | 180 | 270;
  size?: number;
  className?: string;
  selectedInEditor?: boolean;
}

/**
 * Airline-style seat glyph. Renders an SVG of a seat (backrest + cushion +
 * armrests) with a numeric label in the center. Uses semantic tokens so the
 * same component works in both editor and booking views.
 */
export function SeatGlyph({
  label,
  state = "available",
  rotation = 0,
  size = 36,
  className,
  selectedInEditor,
}: Props) {
  // Colors via semantic tokens (Tailwind classes resolved to CSS vars).
  const palette =
    state === "selected"
      ? { fill: "hsl(var(--primary))", stroke: "hsl(var(--primary))", text: "hsl(var(--primary-foreground))" }
      : state === "booked"
        ? { fill: "hsl(var(--muted))", stroke: "hsl(var(--muted-foreground) / 0.4)", text: "hsl(var(--muted-foreground))" }
        : { fill: "hsl(var(--background))", stroke: "hsl(var(--primary) / 0.7)", text: "hsl(var(--foreground))" };

  const h = Math.round(size * 1.12);
  return (
    <div
      className={cn("relative inline-flex items-center justify-center", className)}
      style={{
        width: size,
        height: h,
        transform: `rotate(${rotation}deg)`,
        filter: "drop-shadow(0 1px 2px rgb(0 0 0 / 0.18))",
      }}
    >
      <svg viewBox="0 0 40 44" width={size} height={h} className="overflow-visible">
        {/* Backrest */}
        <rect x="6" y="2" width="28" height="18" rx="5" fill={palette.fill} stroke={palette.stroke} strokeWidth="1.6" />
        {/* Cushion */}
        <rect x="3" y="16" width="34" height="22" rx="6" fill={palette.fill} stroke={palette.stroke} strokeWidth="1.6" />
        {/* Armrests */}
        <rect x="1" y="20" width="4" height="14" rx="2" fill={palette.stroke} opacity="0.85" />
        <rect x="35" y="20" width="4" height="14" rx="2" fill={palette.stroke} opacity="0.85" />
        {/* Booked diagonal stripe */}
        {state === "booked" && (
          <>
            <defs>
              <pattern id="seat-stripe" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                <line x1="0" y1="0" x2="0" y2="6" stroke="hsl(var(--muted-foreground) / 0.35)" strokeWidth="2" />
              </pattern>
            </defs>
            <rect x="3" y="2" width="34" height="36" rx="6" fill="url(#seat-stripe)" />
          </>
        )}
        {selectedInEditor && (
          <rect x="0.5" y="0.5" width="39" height="43" rx="7" fill="none" stroke="hsl(var(--ring))" strokeWidth="1.5" strokeDasharray="3 2" />
        )}
      </svg>
      {label && (
        <span
          className="pointer-events-none absolute inset-0 flex items-center justify-center text-[10px] font-bold tabular-nums"
          style={{ color: palette.text, transform: `rotate(${-rotation}deg)`, paddingTop: 4 }}
        >
          {label}
        </span>
      )}
    </div>
  );
}
