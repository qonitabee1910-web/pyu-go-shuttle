import { useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Bell, Search, Plane, Car, MapPin, ArrowUpRight, Sparkles, Wallet, Gift, ShieldCheck, Clock } from "lucide-react";
import logo from "@/assets/logo.png";
import { KNO_AIRPORT } from "@/shared/types/shuttle";
import { formatRupiah, getJakartaNow } from "@/shared/utils/utils";
import { useServerFn } from "@tanstack/react-start";
import { listHomePageData } from "@/features/shuttle/services/shuttle.functions";
import { useQuery } from "@tanstack/react-query";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "PYU-GO — Shuttle KNO & Ride Hailing" },
      { name: "description", content: "Pesan shuttle bandara KNO dan ride hailing premium di Medan. Mudah, cepat, aman." },
    ],
  }),
  component: HomePage,
});

const ease = [0.22, 1, 0.36, 1] as const;
const fade = { initial: { opacity: 0, y: 14 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.7, ease } };

function HomePage() {
  const greeting = useMemo(() => {
    const hour = getJakartaNow().getHours();
    if (hour < 11) return "Selamat pagi";
    if (hour < 15) return "Selamat siang";
    if (hour < 19) return "Selamat sore";
    return "Selamat malam";
  }, []);

  const fetchHome = useServerFn(listHomePageData);
  const { data, isLoading } = useQuery({
    queryKey: ["home-data"],
    queryFn: () => fetchHome(),
    staleTime: 60_000,
  });

  const pickupPoints = data?.pickups ?? [];
  const popularRoutes = data?.popularRoutes ?? [];

  return (
    <div className="min-h-screen relative">
      {/* Aurora background layer */}
      <div className="bg-hero-gradient pointer-events-none absolute inset-x-0 top-0 h-[460px]" />

      <div className="relative px-5 pt-6">
        {/* Top bar */}
        <div className="flex items-center justify-between">
          <img src={logo} alt="PYU-GO" className="h-9 w-auto brightness-0 invert opacity-90" width={140} height={36} />
          <button aria-label="Notifikasi" className="glass relative grid h-10 w-10 place-items-center rounded-full">
            <Bell className="h-4 w-4 text-foreground" />
            <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-accent glow-pulse" />
          </button>
        </div>

        {/* Greeting */}
        <motion.div {...fade} className="mt-7">
          <p className="label-eyebrow">{greeting}</p>
          <h1 className="mt-2 text-[28px] font-semibold leading-[1.1] tracking-tight">
            Mau ke mana <span className="text-gradient">hari ini?</span>
          </h1>
        </motion.div>

        {/* Search */}
        <motion.div {...fade} transition={{ duration: 0.7, ease, delay: 0.06 }}
          className="glass-strong mt-5 flex items-center gap-3 rounded-2xl px-4 py-3.5 shadow-elegant">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            placeholder="Cari titik jemput, tujuan, kode booking…"
            className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          <kbd className="hidden rounded-md border border-border bg-card px-1.5 py-0.5 text-[10px] text-muted-foreground sm:inline">⌘K</kbd>
        </motion.div>

        {/* Bento grid */}
        <motion.div {...fade} transition={{ duration: 0.7, ease, delay: 0.12 }}
          className="mt-5 grid grid-cols-6 gap-3">

          {/* Big primary card — Shuttle */}
          <Link to="/shuttle/pickup" className="col-span-6 group">
            <div className="relative overflow-hidden rounded-3xl bg-primary-gradient p-5 shadow-glow">
              <div className="absolute -right-10 -top-10 h-44 w-44 rounded-full bg-white/15 blur-2xl" />
              <div className="absolute right-6 top-6 grid h-12 w-12 place-items-center rounded-2xl bg-white/15 backdrop-blur-xl">
                <Plane className="h-5 w-5 text-white" />
              </div>
              <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-white backdrop-blur">
                <Sparkles className="h-3 w-3" /> Populer
              </span>
              <div className="mt-12 text-white">
                <div className="text-2xl font-semibold leading-tight">Shuttle Bandara</div>
                <div className="mt-1 text-sm text-white/80">KNO Express — antar-jemput tepat waktu</div>
              </div>
              <div className="mt-5 flex items-center justify-between text-white/90">
                <div className="text-xs">Mulai {formatRupiah(75000)}</div>
                <div className="grid h-9 w-9 place-items-center rounded-full bg-white/15 transition group-hover:translate-x-1">
                  <ArrowUpRight className="h-4 w-4" />
                </div>
              </div>
            </div>
          </Link>

          {/* Ride hailing */}
          <Link to="/ride" className="col-span-3 group">
            <div className="glass relative h-full overflow-hidden rounded-3xl p-4">
              <div className="absolute -bottom-8 -right-8 h-32 w-32 rounded-full bg-accent/30 blur-2xl" />
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-accent/15 text-accent">
                <Car className="h-5 w-5" />
              </div>
              <div className="mt-8">
                <div className="text-base font-semibold leading-tight">Ride Hailing</div>
                <div className="text-xs text-muted-foreground">Dalam kota</div>
              </div>
              <ArrowUpRight className="absolute right-4 top-4 h-4 w-4 text-muted-foreground transition group-hover:text-foreground" />
            </div>
          </Link>

          {/* Live trips KPI */}
          <div className="col-span-3">
            <div className="glass h-full rounded-3xl p-4">
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-success glow-pulse" />
                <span className="label-eyebrow">Live hari ini</span>
              </div>
              <div className="mt-7 font-display text-3xl font-semibold tracking-tight">
                {isLoading ? "—" : (data?.pickups.length ?? 0) * 3}
              </div>
              <div className="text-xs text-muted-foreground">trip aktif jaringan</div>
            </div>
          </div>

          {/* Quick highlights row */}
          <div className="col-span-6">
            <div className="glass grid grid-cols-3 gap-2 rounded-2xl p-2">
              <QuickAction icon={<Wallet className="h-4 w-4" />} label="PYU Pay" />
              <QuickAction icon={<Gift className="h-4 w-4" />} label="Promo" />
              <QuickAction icon={<ShieldCheck className="h-4 w-4" />} label="Asuransi" />
            </div>
          </div>
        </motion.div>
      </div>

      {/* Popular routes */}
      <section className="mt-8">
        <SectionHeader title="Rute populer ke KNO" cta="Semua rute" />
        <div className="space-y-2 px-5">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="glass flex items-center gap-3 rounded-2xl p-3">
                <div className="shimmer h-11 w-11 rounded-xl" />
                <div className="flex-1 space-y-2">
                  <div className="shimmer h-3 w-32 rounded" />
                  <div className="shimmer h-2 w-24 rounded" />
                </div>
              </div>
            ))
          ) : (
            popularRoutes.map((r, i) => (
              <motion.div
                key={r.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease, delay: i * 0.05 }}
              >
                <Link
                  to="/shuttle/pickup"
                  className="glass group flex items-center gap-3 rounded-2xl p-3 transition hover:bg-white/[0.07]"
                >
                  <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary/15 text-primary">
                    <Plane className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 text-sm font-semibold">
                      <span className="truncate">{r.from}</span>
                      <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground rotate-45" />
                      <span className="truncate text-muted-foreground">{r.to}</span>
                    </div>
                    <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" /> {r.duration}
                      <span>•</span>
                      <span className="font-medium text-foreground">{formatRupiah(r.price)}</span>
                    </div>
                  </div>
                  <ArrowUpRight className="h-4 w-4 text-muted-foreground transition group-hover:text-foreground group-hover:translate-x-0.5" />
                </Link>
              </motion.div>
            ))
          )}
        </div>
      </section>

      {/* Nearby pickup */}
      <section className="mt-7">
        <SectionHeader title="Titik jemput terdekat" cta="Lihat peta" />
        <div className="no-scrollbar flex snap-x snap-mandatory gap-3 overflow-x-auto px-5 pb-2">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="glass w-56 shrink-0 snap-start rounded-2xl p-3 space-y-3">
                <div className="shimmer h-3 w-20 rounded-full" />
                <div className="shimmer h-4 w-full rounded" />
                <div className="shimmer h-8 w-full rounded" />
              </div>
            ))
          ) : (
            pickupPoints.slice(0, 5).map((p: any) => (
              <Link
                key={p.id}
                to="/shuttle/pickup"
                className="glass w-56 shrink-0 snap-start rounded-2xl p-3 transition hover:bg-white/[0.07]"
              >
                <div className="flex items-center gap-2 text-[11px] font-semibold">
                  <span className="rounded-full bg-primary/15 px-2 py-0.5 text-primary">{p.rayon ?? "Rayon A"}</span>
                  <span className="text-muted-foreground">{p.distance_km ?? 2.4} km</span>
                </div>
                <div className="mt-2 line-clamp-1 text-sm font-semibold">{p.name}</div>
                <div className="mt-0.5 flex items-start gap-1 text-xs text-muted-foreground">
                  <MapPin className="mt-0.5 h-3 w-3 shrink-0" />
                  <span className="line-clamp-2">{p.address}</span>
                </div>
                <div className="mt-3 flex items-center justify-between border-t border-border pt-2 text-xs">
                  <span className="text-muted-foreground">ETA</span>
                  <span className="font-semibold text-foreground">{p.eta_min ?? 8} mnt</span>
                </div>
              </Link>
            ))
          )}
        </div>
      </section>

      {/* Upcoming schedule teaser */}
      <section className="mt-6 px-5">
        <div className="glass-strong relative overflow-hidden rounded-2xl p-4">
          <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-primary/20 blur-3xl" />
          <div className="relative flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="label-eyebrow text-primary">Jadwal berikutnya</div>
              <div className="mt-1 truncate text-base font-semibold">
                {pickupPoints[0]?.name ?? "Hermes Palace"} → {KNO_AIRPORT.code}
              </div>
              <div className="text-xs text-muted-foreground">Berangkat 14:30 • Toyota Hiace</div>
            </div>
            <Link
              to="/shuttle/pickup"
              className="shrink-0 rounded-full bg-primary-gradient px-4 py-2 text-xs font-semibold text-primary-foreground shadow-glow"
            >
              Pesan
            </Link>
          </div>
        </div>
      </section>

      <div className="h-10" />
    </div>
  );
}

function QuickAction({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <button className="flex flex-col items-center gap-1 rounded-xl py-3 text-xs font-medium text-foreground transition hover:bg-white/[0.06]">
      <span className="grid h-9 w-9 place-items-center rounded-full bg-primary/15 text-primary">{icon}</span>
      {label}
    </button>
  );
}

function SectionHeader({ title, cta }: { title: string; cta?: string }) {
  return (
    <div className="mb-3 flex items-end justify-between px-5">
      <h2 className="font-display text-base font-semibold tracking-tight">{title}</h2>
      {cta && <button className="text-xs font-semibold text-primary hover:text-accent transition">{cta}</button>}
    </div>
  );
}
