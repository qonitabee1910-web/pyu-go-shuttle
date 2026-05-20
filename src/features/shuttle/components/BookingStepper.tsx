import { useLocation } from "@tanstack/react-router";
import { Check } from "lucide-react";

const STEPS = [
  { key: "pickup", label: "Jemput", path: "/shuttle/pickup" },
  { key: "service", label: "Service", path: "/shuttle/service" },
  { key: "schedule", label: "Jadwal", path: "/shuttle/schedule" },
  { key: "seats", label: "Kursi", path: "/shuttle/seats" },
  { key: "passenger", label: "Penumpang", path: "/shuttle/passenger" },
  { key: "payment", label: "Bayar", path: "/shuttle/payment" },
];

export function BookingStepper() {
  const { pathname } = useLocation();
  const activeIdx = Math.max(
    0,
    STEPS.findIndex((s) => pathname.startsWith(s.path)),
  );

  return (
    <div className="sticky top-[57px] z-20 border-b border-border bg-card/95 px-3 py-2.5 backdrop-blur">
      <div className="mx-auto flex max-w-md items-center gap-1">
        {STEPS.map((s, i) => {
          const done = i < activeIdx;
          const active = i === activeIdx;
          return (
            <div key={s.key} className="flex flex-1 items-center gap-1">
              <div className="flex flex-col items-center gap-1">
                <div
                  className={`grid h-6 w-6 place-items-center rounded-full text-[10px] font-bold transition ${
                    done
                      ? "bg-primary text-primary-foreground"
                      : active
                        ? "bg-primary text-primary-foreground ring-4 ring-primary/20"
                        : "bg-muted text-muted-foreground"
                  }`}
                >
                  {done ? <Check className="h-3 w-3" /> : i + 1}
                </div>
                <span
                  className={`text-[9px] font-semibold leading-none ${
                    active ? "text-primary" : done ? "text-foreground" : "text-muted-foreground"
                  }`}
                >
                  {s.label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div
                  className={`mb-3 h-0.5 flex-1 rounded-full ${
                    i < activeIdx ? "bg-primary" : "bg-muted"
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
