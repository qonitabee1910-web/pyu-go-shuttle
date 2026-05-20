import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Bell, Search, Plane, Car, MapPin, ChevronRight, Sparkles, Wallet, Gift, ShieldCheck } from "lucide-react";
import logo from "@/assets/logo.png";
import heroBg from "@/assets/hero-bg.jpg";
import promo1 from "@/assets/promo-1.jpg";
import promo2 from "@/assets/promo-2.jpg";
import { pickupPoints, popularRoutes, KNO_AIRPORT } from "@/shared/types/mock-data";
import { formatRupiah } from "@/shared/utils/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "PYU-GO — Shuttle KNO & Ride Hailing" },
      { name: "description", content: "Pesan shuttle bandara KNO dan ride hailing premium di Medan. Mudah, cepat, aman." },
    ],
  }),
  component: HomePage,
});

const fade = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 } };

function HomePage() {
  const promoImgs = [promo1, promo2];
  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <img src={heroBg} alt="" className="h-full w-full object-cover" width={1536} height={832} />
          <div className="absolute inset-0 bg-hero-gradient opacity-90" />
        </div>
        <div className="relative px-5 pb-24 pt-6 text-primary-foreground">
          <div className="flex items-center justify-between">
            <img src={logo} alt="PYU-GO" className="h-9 w-auto brightness-0 invert" width={140} height={36} />
            <button aria-label="Notifikasi" className="relative rounded-full bg-white/15 p-2 backdrop-blur">
              <Bell className="h-5 w-5" />
              <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-warning" />
            </button>
          </div>

          <motion.div {...fade} className="mt-6">
            <p className="text-sm/5 opacity-90">Halo, selamat pagi 👋</p>
            <h1 className="mt-1 text-2xl font-extrabold tracking-tight">Mau ke mana hari ini?</h1>
          </motion.div>

          <motion.div {...fade} transition={{ delay: 0.05 }} className="mt-4 flex items-center gap-2 rounded-2xl bg-white/95 px-4 py-3 text-foreground shadow-float">
            <Search className="h-5 w-5 text-muted-foreground" />
            <input
              placeholder="Cari titik jemput, tujuan, kode booking..."
              className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </motion.div>
        </div>
      </section>

      {/* Service tiles overlapping hero */}
      <section className="-mt-20 px-5">
        <motion.div {...fade} transition={{ delay: 0.1 }} className="grid grid-cols-2 gap-3">
          <ServiceCard
            to="/shuttle/pickup"
            title="Shuttle Bandara"
            subtitle="KNO Express"
            icon={<Plane className="h-6 w-6" />}
            accent="from-primary to-[oklch(0.7_0.15_220)]"
            badge="Populer"
          />
          <ServiceCard
            to="/ride"
            title="Ride Hailing"
            subtitle="Antar dalam kota"
            icon={<Car className="h-6 w-6" />}
            accent="from-[oklch(0.65_0.2_320)] to-[oklch(0.7_0.16_252)]"
          />
        </motion.div>

        {/* Quick highlights */}
        <div className="mt-3 grid grid-cols-3 gap-2 rounded-2xl bg-card p-3 shadow-soft">
          <Highlight icon={<Wallet className="h-4 w-4" />} label="PYU Pay" />
          <Highlight icon={<Gift className="h-4 w-4" />} label="Promo" />
          <Highlight icon={<ShieldCheck className="h-4 w-4" />} label="Asuransi" />
        </div>
      </section>

      {/* Promo carousel */}
      <section className="mt-6">
        <SectionHeader title="Promo Spesial" cta="Lihat semua" />
        <div className="no-scrollbar flex snap-x snap-mandatory gap-3 overflow-x-auto px-5 pb-1">
          {promoImgs.map((src, i) => (
            <motion.div
              key={i}
              whileTap={{ scale: 0.97 }}
              className="relative h-32 w-72 shrink-0 snap-start overflow-hidden rounded-2xl shadow-card"
            >
              <img src={src} alt="" className="h-full w-full object-cover" loading="lazy" width={1024} height={512} />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <div className="absolute bottom-3 left-3 text-white">
                <div className="flex items-center gap-1 text-xs font-medium opacity-90">
                  <Sparkles className="h-3 w-3" /> PYU-GO Promo
                </div>
                <div className="mt-0.5 text-base font-bold">
                  {i === 0 ? "Weekend Shuttle 25% OFF" : "Cashback Ride 15rb"}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Popular routes */}
      <section className="mt-6">
        <SectionHeader title="Rute Populer ke KNO" cta="Semua rute" />
        <div className="space-y-2 px-5">
          {popularRoutes.map((r) => (
            <Link
              key={r.id}
              to="/shuttle/pickup"
              className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3 shadow-soft transition hover:shadow-card"
            >
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary-soft text-primary">
                <Plane className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1 text-sm font-semibold">
                  <span className="truncate">{r.from}</span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  <span className="truncate">{r.to}</span>
                </div>
                <div className="text-xs text-muted-foreground">{r.duration} • mulai {formatRupiah(r.price)}</div>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </Link>
          ))}
        </div>
      </section>

      {/* Nearby pickup */}
      <section className="mt-6">
        <SectionHeader title="Titik Jemput Terdekat" cta="Lihat peta" />
        <div className="no-scrollbar flex snap-x snap-mandatory gap-3 overflow-x-auto px-5 pb-2">
          {pickupPoints.slice(0, 5).map((p) => (
            <Link
              key={p.id}
              to="/shuttle/pickup"
              className="w-56 shrink-0 snap-start rounded-2xl border border-border bg-card p-3 shadow-soft"
            >
              <div className="flex items-center gap-2 text-xs font-semibold text-primary">
                <span className="rounded-full bg-primary-soft px-2 py-0.5">{p.rayon}</span>
                <span className="text-muted-foreground">{p.distanceKm} km</span>
              </div>
              <div className="mt-2 line-clamp-1 text-sm font-bold">{p.name}</div>
              <div className="mt-0.5 flex items-start gap-1 text-xs text-muted-foreground">
                <MapPin className="mt-0.5 h-3 w-3 shrink-0" />
                <span className="line-clamp-2">{p.address}</span>
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-border pt-2 text-xs">
                <span className="text-muted-foreground">ETA</span>
                <span className="font-semibold">{p.etaMin} mnt</span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Upcoming schedule teaser */}
      <section className="mt-6 px-5">
        <div className="rounded-2xl bg-card-gradient p-4 shadow-card">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-primary">Jadwal Berikutnya</div>
              <div className="mt-1 text-base font-bold">Hermes Palace → {KNO_AIRPORT.code}</div>
              <div className="text-xs text-muted-foreground">Berangkat 14:30 • Toyota Hiace</div>
            </div>
            <Link
              to="/shuttle/pickup"
              className="rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow-card"
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

function ServiceCard({ to, title, subtitle, icon, accent, badge }: {
  to: string; title: string; subtitle: string; icon: React.ReactNode; accent: string; badge?: string;
}) {
  return (
    <Link to={to as any}>
      <motion.div
        whileTap={{ scale: 0.97 }}
        className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${accent} p-4 text-white shadow-float`}
      >
        {badge && (
          <span className="absolute right-2 top-2 rounded-full bg-warning px-2 py-0.5 text-[10px] font-bold text-warning-foreground">
            {badge}
          </span>
        )}
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-white/20 backdrop-blur">
          {icon}
        </div>
        <div className="mt-6 text-sm font-bold leading-tight">{title}</div>
        <div className="text-xs opacity-90">{subtitle}</div>
      </motion.div>
    </Link>
  );
}

function Highlight({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <button className="flex flex-col items-center gap-1 rounded-xl py-2 text-xs font-medium text-foreground hover:bg-muted">
      <span className="grid h-9 w-9 place-items-center rounded-full bg-primary-soft text-primary">{icon}</span>
      {label}
    </button>
  );
}

function SectionHeader({ title, cta }: { title: string; cta?: string }) {
  return (
    <div className="mb-3 flex items-end justify-between px-5">
      <h2 className="text-base font-bold">{title}</h2>
      {cta && <button className="text-xs font-semibold text-primary">{cta}</button>}
    </div>
  );
}
