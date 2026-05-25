import { createFileRoute, useNavigate, Navigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Check, Wifi, Snowflake, Sofa, Star, ShieldCheck, Clock } from "lucide-react";
import { PageHeader } from "@/shared/components/PageHeader";
import { BookingStepper } from "@/features/shuttle/components/BookingStepper";
import { useBooking } from "@/features/booking/store/booking";
import { formatRupiah } from "@/shared/utils/utils";
import { KNO_AIRPORT, type VehicleTier } from "@/shared/types/shuttle";
import { useServerFn } from "@tanstack/react-start";
import { getTierSummary } from "@/features/shuttle/services/shuttle.functions";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/shared/components/ui/skeleton";
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

const UUID_RE = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

function ServicePage() {
  const { pickup, setTier } = useBooking();
  const nav = useNavigate();
  if (!pickup) return <Navigate to="/shuttle/pickup" />;
  // Guard: legacy/mock pickup ids may not be valid UUIDs — bounce back to picker.
  if (!UUID_RE.test(pickup.id)) return <Navigate to="/shuttle/pickup" />;

  const fetchSummary = useServerFn(getTierSummary);
  const { data: summary, isLoading } = useQuery({
    queryKey: ["tier-summary", pickup.id],
    queryFn: () => fetchSummary({ data: { pickupId: pickup.id } }),
    enabled: UUID_RE.test(pickup.id),
  });

  const tiers: VehicleTier[] = ["Reguler", "SemiExecutive", "Executive"];

  return (
    <div className="min-h-screen bg-secondary/40 pb-10">
      <PageHeader
        title="Pilih Jenis Service"
        subtitle={`${pickup.name} → ${KNO_AIRPORT.code}`}
      />
      <BookingStepper />

      <div className="mx-auto max-w-md space-y-4 p-4">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-2xl bg-card p-5 space-y-4 shadow-soft">
              <div className="flex justify-between items-start">
                <div className="space-y-2">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-6 w-32" />
                  <Skeleton className="h-3 w-48" />
                </div>
                <div className="space-y-2 text-right">
                  <Skeleton className="h-3 w-16 ml-auto" />
                  <Skeleton className="h-6 w-24 ml-auto" />
                </div>
              </div>
              <div className="flex gap-2">
                <Skeleton className="h-6 w-12 rounded-full" />
                <Skeleton className="h-6 w-12 rounded-full" />
              </div>
              <div className="grid grid-cols-3 gap-2 border-t border-dashed border-border pt-4">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
              </div>
            </div>
          ))
        ) : (
          tiers.map((t, i) => {
            const stats = summary?.[t] || { min: 0, max: 0, count: 0, earliest: null };
            const info = TIER_INFO[t];
            const disabled = stats.count === 0;

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
                className="relative block w-full overflow-hidden rounded-2xl bg-card p-5 text-left shadow-soft transition disabled:opacity-50"
              >
                <div
                  className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${info.accent}`}
                />
                <div className="relative">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">
                        Service
                      </div>
                      <div className="text-xl font-extrabold tracking-tight">{TIER_LABEL[t]}</div>
                      <div className="mt-0.5 text-xs text-muted-foreground">{info.desc}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Mulai dari</div>
                      <div className="text-lg font-extrabold text-primary">
                        {formatRupiah(stats.min)}
                      </div>
                      {stats.max > stats.min && (
                        <div className="text-[10px] font-medium text-muted-foreground">
                          s/d {formatRupiah(stats.max)}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {info.facilities.map((f) => {
                      const I = f.icon;
                      return (
                        <span
                          key={f.label}
                          className="flex items-center gap-1.5 rounded-full border border-border bg-background/60 px-2.5 py-1 text-[11px] font-bold text-foreground backdrop-blur-sm"
                        >
                          <I className="h-3 w-3 text-primary" /> {f.label}
                        </span>
                      );
                    })}
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-2 border-t border-dashed border-border pt-4 text-[11px]">
                    <div>
                      <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Kendaraan</div>
                      <div className="font-extrabold">{stats.count} tersedia</div>
                    </div>
                    <div>
                      <div className="flex items-center gap-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                        <Clock className="h-3 w-3" /> Mulai
                      </div>
                      <div className="font-extrabold">{stats.earliest ?? "—"}</div>
                    </div>
                    <div>
                      <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Durasi</div>
                      <div className="font-extrabold">±1j 30m</div>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-[11px] font-bold text-success uppercase tracking-widest">
                      <Check className="h-3.5 w-3.5" /> Tersedia
                    </span>
                    <span className="text-[11px] font-bold text-primary uppercase tracking-widest">Pilih Service →</span>
                  </div>
                </div>
              </motion.button>
            );
          })
        )}
      </div>
    </div>
  );
}
