import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Navigation, Car, Zap, Crown, Loader2 } from "lucide-react";
import { PageHeader } from "@/shared/components/PageHeader";
import { MapView } from "@/shared/components/MapView";
import { formatRupiah } from "@/shared/utils/utils";
import { useAuth } from "@/shared/hooks/use-auth";
import { createRideOrder } from "@/features/ride/services/ride-order.functions";
import { listOnlineDriversNearby } from "@/features/ride/services/drivers.functions";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/ride")({
  head: () => ({ meta: [{ title: "Ride Hailing — PYU-GO" }] }),
  component: RidePage,
});

const tiers = [
  { id: "eco", label: "Economy", icon: Car, eta: 3, price: 18000, desc: "Hatchback" },
  { id: "fast", label: "Express", icon: Zap, eta: 2, price: 25000, desc: "Sedan / MPV" },
  { id: "vip", label: "VIP", icon: Crown, eta: 5, price: 45000, desc: "Innova / Premium" },
];

const DEFAULT_PICKUP = { lat: 3.585, lng: 98.679, address: "Lokasi saya saat ini" };
const DEFAULT_DROPOFF = { lat: 3.642, lng: 98.879, address: "" };

function RidePage() {
  const [pickup, setPickup] = useState(DEFAULT_PICKUP.address);
  const [dest, setDest] = useState("");
  const [tier, setTier] = useState("eco");
  const [drivers, setDrivers] = useState<any[]>([]);
  const nav = useNavigate();
  const { user } = useAuth();
  const createOrder = useServerFn(createRideOrder);
  const listDriversFn = useServerFn(listOnlineDriversNearby);

  // Initial fetch
  const { data: initialDrivers } = useQuery({
    queryKey: ["ride", "nearby-drivers"],
    queryFn: () => listDriversFn({ data: { lat: DEFAULT_PICKUP.lat, lng: DEFAULT_PICKUP.lng } }),
    enabled: !!user,
  });

  useEffect(() => {
    if (initialDrivers) setDrivers(initialDrivers);
  }, [initialDrivers]);

  // Realtime subscription
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("driver_locations_nearby")
      .on(
        "postgres_changes",
        { event: "*", table: "driver_locations", schema: "public" },
        async (payload: any) => {
          // Update driver position in local state
          const updated = payload.new;
          if (!updated || !updated.driver_id) return;

          setDrivers((prev) => 
            prev.map((d) => 
              d.id === updated.driver_id 
                ? { ...d, lat: updated.lat, lng: updated.lng } 
                : d
            )
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const selected = tiers.find((t) => t.id === tier)!;
  const canBook = dest.trim().length > 2;

  const mutation = useMutation({
    mutationFn: async () => createOrder({
      data: {
        pickup: { ...DEFAULT_PICKUP, address: pickup },
        dropoff: { ...DEFAULT_DROPOFF, address: dest },
        tier,
        fare: selected.price,
        etaMin: selected.eta,
      },
    }),
    onSuccess: ({ id }) => {
      toast.success("Order dibuat — mencari driver");
      nav({ to: "/ride/tracking", search: { id } as any });
    },
    onError: (e: any) => toast.error(e?.message ?? "Gagal membuat order"),
  });

  const handleBook = () => {
    if (!user) { nav({ to: "/auth/login", search: { redirect: "/ride" } as any }); return; }
    if (!canBook) return;
    mutation.mutate();
  };

  return (
    <div className="min-h-screen bg-secondary/30 pb-24">
      <PageHeader title="Ride Hailing" back={false} subtitle="Pesan kendaraan dalam kota" />

      <div className="p-4">
        <MapView
          center={[3.585, 98.679]}
          zoom={14}
          points={drivers.map((d) => ({ lat: d.lat, lng: d.lng, label: d.name }))}
          className="h-56 w-full"
        />

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
                <input value={pickup} onChange={(e) => setPickup(e.target.value)} className="w-full bg-transparent text-sm font-semibold outline-none" />
              </div>
              <div className="rounded-xl border border-primary/40 bg-primary-soft px-3 py-2">
                <label className="text-[10px] uppercase text-primary">Tujuan</label>
                <input value={dest} onChange={(e) => setDest(e.target.value)} placeholder="Mau ke mana?" className="w-full bg-transparent text-sm font-semibold outline-none" />
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 space-y-2">
          {tiers.map((t) => {
            const Icon = t.icon;
            const active = tier === t.id;
            return (
              <motion.button
                key={t.id}
                whileTap={{ scale: 0.98 }}
                onClick={() => setTier(t.id)}
                className={`flex w-full items-center gap-3 rounded-2xl border-2 p-3 text-left transition ${active ? "border-primary bg-primary-soft shadow-card" : "border-border bg-card"}`}
              >
                <div className={`grid h-12 w-12 place-items-center rounded-xl ${active ? "bg-primary text-primary-foreground" : "bg-muted text-primary"}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 text-sm font-bold">
                    {t.label}
                    <span className="rounded-full bg-success/15 px-2 py-0.5 text-[10px] font-semibold text-success">{t.eta} mnt</span>
                  </div>
                  <div className="text-xs text-muted-foreground">{t.desc}</div>
                </div>
                <div className="text-base font-extrabold text-primary">{formatRupiah(t.price)}</div>
              </motion.button>
            );
          })}
        </div>

        <div className="mt-4 rounded-2xl bg-card p-4 shadow-soft">
          <div className="mb-2 flex items-center gap-2 text-sm font-bold">
            <Navigation className="h-4 w-4 text-primary" /> {drivers.length} driver di dekatmu
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            {drivers.map((d) => (
              <div key={d.id} className="rounded-xl bg-muted p-2">
                <div className="text-xs font-bold">{d.name}</div>
                <div className="text-[10px] text-muted-foreground">{d.vehicle}</div>
                <div className="mt-1 text-[10px] font-semibold text-primary">{d.plate}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <motion.div initial={{ y: 80 }} animate={{ y: 0 }} className="fixed bottom-16 left-1/2 z-30 w-full max-w-md -translate-x-1/2 px-4">
        <button
          disabled={!canBook || mutation.isPending}
          onClick={handleBook}
          className="flex w-full items-center justify-center gap-2 rounded-full bg-primary py-3.5 text-sm font-bold text-primary-foreground shadow-float transition disabled:opacity-40"
        >
          {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          {canBook ? `Pesan ${selected.label} • ${formatRupiah(selected.price)}` : "Masukkan tujuan dulu"}
        </button>
      </motion.div>
    </div>
  );
}
