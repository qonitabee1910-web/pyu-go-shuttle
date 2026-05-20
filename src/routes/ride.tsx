import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { motion } from "framer-motion";
import { MapPin, Navigation, Car, Zap, Crown } from "lucide-react";
import { PageHeader } from "@/shared/components/PageHeader";
import { MapView } from "@/shared/components/MapView";
import { formatRupiah } from "@/shared/utils/utils";
import { nearbyDrivers } from "@/shared/types/shuttle";

export const Route = createFileRoute("/ride")({
  head: () => ({ meta: [{ title: "Ride Hailing — PYU-GO" }] }),
  component: RidePage,
});

const tiers = [
  { id: "eco", label: "Economy", icon: Car, eta: "3 mnt", price: 18000, desc: "Hatchback" },
  { id: "fast", label: "Express", icon: Zap, eta: "2 mnt", price: 25000, desc: "Sedan / MPV" },
  { id: "vip", label: "VIP", icon: Crown, eta: "5 mnt", price: 45000, desc: "Innova / Premium" },
];

function RidePage() {
  const [pickup, setPickup] = useState("Lokasi saya saat ini");
  const [dest, setDest] = useState("");
  const [tier, setTier] = useState("eco");
  const nav = useNavigate();

  const selected = tiers.find((t) => t.id === tier)!;
  const canBook = dest.trim().length > 2;

  return (
    <div className="min-h-screen bg-secondary/30 pb-24">
      <PageHeader title="Ride Hailing" back={false} subtitle="Pesan kendaraan dalam kota" />

      <div className="p-4">
        <MapView
          center={[3.585, 98.679]}
          zoom={14}
          points={nearbyDrivers.map((d) => ({ lat: d.lat, lng: d.lng, label: d.name }))}
          className="h-56 w-full"
        />

        {/* Input card */}
        <div className="-mt-6 mx-2 rounded-2xl bg-card p-4 shadow-float">
          <div className="flex gap-3">
            <div className="flex flex-col items-center pt-2">
              <span className="h-3 w-3 rounded-full bg-success" />
              <span className="my-1 h-8 w-px bg-border" />
              <span className="h-3 w-3 rounded-full bg-primary" />
            </div>
            <div className="flex-1 space-y-2">
              <div className="rounded-xl border border-border px-3 py-2">
                <label className="text-[10px] uppercase text-muted-foreground">Jemput</label>
                <input
                  value={pickup}
                  onChange={(e) => setPickup(e.target.value)}
                  className="w-full bg-transparent text-sm font-semibold outline-none"
                />
              </div>
              <div className="rounded-xl border border-primary/40 bg-primary-soft px-3 py-2">
                <label className="text-[10px] uppercase text-primary">Tujuan</label>
                <input
                  value={dest}
                  onChange={(e) => setDest(e.target.value)}
                  placeholder="Mau ke mana?"
                  className="w-full bg-transparent text-sm font-semibold outline-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Tier picker */}
        <div className="mt-4 space-y-2">
          {tiers.map((t) => {
            const Icon = t.icon;
            const active = tier === t.id;
            return (
              <motion.button
                key={t.id}
                whileTap={{ scale: 0.98 }}
                onClick={() => setTier(t.id)}
                className={`flex w-full items-center gap-3 rounded-2xl border-2 p-3 text-left transition ${
                  active ? "border-primary bg-primary-soft shadow-card" : "border-border bg-card"
                }`}
              >
                <div className={`grid h-12 w-12 place-items-center rounded-xl ${active ? "bg-primary text-primary-foreground" : "bg-muted text-primary"}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 text-sm font-bold">
                    {t.label}
                    <span className="rounded-full bg-success/15 px-2 py-0.5 text-[10px] font-semibold text-success">
                      {t.eta}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground">{t.desc}</div>
                </div>
                <div className="text-base font-extrabold text-primary">{formatRupiah(t.price)}</div>
              </motion.button>
            );
          })}
        </div>

        {/* Nearby drivers */}
        <div className="mt-5 rounded-2xl bg-card p-4 shadow-soft">
          <div className="mb-2 flex items-center gap-2 text-sm font-bold">
            <Navigation className="h-4 w-4 text-primary" /> {nearbyDrivers.length} driver di dekatmu
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            {nearbyDrivers.map((d) => (
              <div key={d.id} className="rounded-xl bg-muted p-2">
                <div className="text-xs font-bold">{d.name}</div>
                <div className="text-[10px] text-muted-foreground">{d.vehicle}</div>
                <div className="mt-1 text-[10px] font-semibold text-primary">{d.plate}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Sticky CTA */}
      <motion.div
        initial={{ y: 80 }}
        animate={{ y: 0 }}
        className="fixed bottom-16 left-1/2 z-30 w-full max-w-md -translate-x-1/2 px-4"
      >
        <button
          disabled={!canBook}
          onClick={() => nav({ to: "/ride/tracking" })}
          className="w-full rounded-full bg-primary py-3.5 text-sm font-bold text-primary-foreground shadow-float transition disabled:opacity-40"
        >
          {canBook ? `Pesan ${selected.label} • ${formatRupiah(selected.price)}` : "Masukkan tujuan dulu"}
        </button>
      </motion.div>
    </div>
  );
}
