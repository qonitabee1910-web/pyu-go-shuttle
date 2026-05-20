import { createFileRoute, useNavigate, Navigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Check, Wifi, Snowflake, Sofa, Star, ShieldCheck, Clock } from "lucide-react";
import { PageHeader } from "@/shared/components/PageHeader";
import { BookingStepper } from "@/features/shuttle/components/BookingStepper";
import { useBooking } from "@/features/booking/store/booking";
import { formatRupiah } from "@/shared/utils/utils";
import {
  getSchedulesForPickup,
  type VehicleTier,
  KNO_AIRPORT,
} from "@/shared/types/mock-data";
import { TIER_LABEL } from "@/features/admin/store/admin";

export const Route = createFileRoute("/shuttle/service")({
  head: () => ({ meta: [{ title: "Pilih Service — PYU-GO" }] }),
  component: ServicePage,
});

const TIER_INFO: Record<
  VehicleTier,
  { desc: string; facilities: { icon: any; label: string }[]; accent: string }
> = {
  Reguler: {
    desc: "Perjalanan nyaman dengan harga terbaik.",
    facilities: [
      { icon: Snowflake, label: "AC" },
      { icon: ShieldCheck, label: "Asuransi" },
    ],
    accent: "from-sky-500/15 to-sky-500/0",
  },
  SemiExecutive: {
    desc: "Kursi lebih lega dengan fasilitas tambahan.",
    facilities: [
      { icon: Snowflake, label: "AC" },
      { icon: Sofa, label: "Reclining" },
      { icon: Wifi, label: "Wi-Fi" },
    ],
    accent: "from-violet-500/15 to-violet-500/0",
  },
  Executive: {
    desc: "Premium experience dengan layanan terbaik.",
    facilities: [
      { icon: Snowflake, label: "AC" },
      { icon: Sofa, label: "Recliner" },
      { icon: Wifi, label: "Wi-Fi" },
      { icon: Star, label: "Snack" },
    ],
    accent: "from-amber-500/20 to-amber-500/0",
  },
};

function ServicePage() {
  const { pickup, setTier } = useBooking();
  const nav = useNavigate();
  if (!pickup) return <Navigate to="/shuttle/pickup" />;

  const schedules = getSchedulesForPickup(pickup.id);
  const tiers: VehicleTier[] = ["Reguler", "SemiExecutive", "Executive"];

  return (
    <div className="min-h-screen bg-secondary/40 pb-10">
      <PageHeader
        title="Pilih Jenis Service"
        subtitle={`${pickup.name} → ${KNO_AIRPORT.code}`}
      />
      <BookingStepper />

      <div className="mx-auto max-w-md space-y-3 p-4">
        {tiers.map((t, i) => {
          const list = schedules.filter((s) => s.className === t);
          const prices = list.map((s) => s.price);
          const min = prices.length ? Math.min(...prices) : 0;
          const max = prices.length ? Math.max(...prices) : 0;
          const earliest = list
            .map((s) => s.departureTime)
            .sort()[0];
          const info = TIER_INFO[t];
          const disabled = list.length === 0;

          return (
            <motion.button
              key={t}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              whileTap={{ scale: 0.98 }}
              disabled={disabled}
              onClick={() => {
                setTier(t);
                nav({ to: "/shuttle/schedule" });
              }}
              className="relative block w-full overflow-hidden rounded-2xl bg-card p-4 text-left shadow-soft transition disabled:opacity-50"
            >
              <div
                className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${info.accent}`}
              />
              <div className="relative">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-xs font-semibold uppercase text-muted-foreground">
                      Service
                    </div>
                    <div className="text-lg font-extrabold">{TIER_LABEL[t]}</div>
                    <div className="mt-0.5 text-xs text-muted-foreground">{info.desc}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] text-muted-foreground">Mulai dari</div>
                    <div className="text-base font-extrabold text-primary">
                      {formatRupiah(min)}
                    </div>
                    {max > min && (
                      <div className="text-[10px] text-muted-foreground">
                        s/d {formatRupiah(max)}
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-1.5">
                  {info.facilities.map((f) => {
                    const I = f.icon;
                    return (
                      <span
                        key={f.label}
                        className="flex items-center gap-1 rounded-full border border-border bg-background/70 px-2 py-0.5 text-[11px] font-semibold text-foreground"
                      >
                        <I className="h-3 w-3" /> {f.label}
                      </span>
                    );
                  })}
                </div>

                <div className="mt-3 grid grid-cols-3 gap-2 border-t border-dashed border-border pt-3 text-[11px]">
                  <div>
                    <div className="text-muted-foreground">Kendaraan</div>
                    <div className="font-bold">{list.length} tersedia</div>
                  </div>
                  <div>
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Clock className="h-3 w-3" /> Mulai
                    </div>
                    <div className="font-bold">{earliest ?? "—"}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Durasi</div>
                    <div className="font-bold">±1j 30m</div>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1 text-success">
                    <Check className="h-3 w-3" /> Tersedia
                  </span>
                  <span className="font-semibold text-primary">Pilih →</span>
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
