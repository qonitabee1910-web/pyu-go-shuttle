import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo } from "react";
import { z } from "zod";
import { motion } from "framer-motion";
import { Phone, MessageCircle, Star, Car, X, Loader2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { PageHeader } from "@/shared/components/PageHeader";
import { MapView } from "@/shared/components/MapView";
import { getRideOrder, cancelRideOrder } from "@/features/ride/services/ride-order.functions";
import { useRideOrderRealtime } from "@/features/ride/hooks/use-ride-order";

export const Route = createFileRoute("/ride/tracking")({
  head: () => ({ meta: [{ title: "Driver dalam perjalanan — PYU-GO" }] }),
  validateSearch: z.object({ id: z.string().uuid().optional() }),
  component: RideTracking,
});

const STAGE_META: Record<string, { label: string; subtitle: string }> = {
  requested: { label: "Mencari driver terdekat...", subtitle: "Estimasi 30 detik" },
  accepted: { label: "Driver menuju lokasi jemput", subtitle: "Bersiap, driver dalam perjalanan" },
  ongoing: { label: "Sedang dalam perjalanan", subtitle: "Menuju lokasi tujuan" },
  completed: { label: "Perjalanan selesai", subtitle: "Terima kasih telah menggunakan PYU-GO" },
  cancelled: { label: "Pesanan dibatalkan", subtitle: "Order telah dibatalkan" },
};

function RideTracking() {
  const { id } = Route.useSearch();
  const nav = useNavigate();
  const qc = useQueryClient();
  const fetchOrder = useServerFn(getRideOrder);
  const cancel = useServerFn(cancelRideOrder);

  useRideOrderRealtime(id);

  const { data, isLoading } = useQuery({
    queryKey: ["ride-order", id],
    queryFn: () => fetchOrder({ data: { id: id! } }),
    enabled: !!id,
    refetchInterval: (q) => {
      const s = (q.state.data as any)?.order?.status;
      return s === "completed" || s === "cancelled" ? false : 10000;
    },
  });

  const cancelMutation = useMutation({
    mutationFn: () => cancel({ data: { id: id! } }),
    onSuccess: () => { toast.success("Pesanan dibatalkan"); qc.invalidateQueries({ queryKey: ["ride-order", id] }); },
    onError: (e: any) => toast.error(e?.message ?? "Gagal membatalkan"),
  });

  const order = data?.order as any;
  const driver = data?.driverProfile;
  const driverInfo = data?.driverInfo;
  const status = (order?.status ?? "requested") as keyof typeof STAGE_META;
  const meta = STAGE_META[status] ?? STAGE_META.requested;

  const pickup = order?.pickup as { lat: number; lng: number } | undefined;
  const dropoff = order?.dropoff as { lat: number; lng: number } | undefined;
  const mapPoints = useMemo(() => {
    const pts: { lat: number; lng: number; label?: string }[] = [];
    if (pickup) pts.push({ lat: pickup.lat, lng: pickup.lng, label: "Jemput" });
    if (dropoff) pts.push({ lat: dropoff.lat, lng: dropoff.lng, label: "Tujuan" });
    return pts;
  }, [pickup, dropoff]);

  if (!id) {
    return (
      <div className="min-h-screen bg-secondary/30 p-6 text-center">
        <PageHeader title="Status Perjalanan" />
        <div className="mt-10 text-sm text-muted-foreground">Tidak ada order aktif.</div>
        <Link to="/ride" className="mt-4 inline-block rounded-full bg-primary px-6 py-2 text-sm font-bold text-primary-foreground">Pesan sekarang</Link>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-secondary/30">
        <PageHeader title="Status Perjalanan" />
        <div className="flex items-center justify-center p-10 text-sm text-muted-foreground">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Memuat...
        </div>
      </div>
    );
  }

  const driverInitials = (driver?.full_name ?? "Driver").split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();

  return (
    <div className="min-h-screen bg-secondary/30 pb-40">
      <PageHeader title="Status Perjalanan" />

      <div className="p-4">
        <MapView
          center={pickup ? [pickup.lat, pickup.lng] : [3.585, 98.679]}
          zoom={14}
          points={mapPoints}
          route={pickup && dropoff ? [[pickup.lat, pickup.lng], [dropoff.lat, dropoff.lng]] : undefined}
          className="h-72 w-full"
        />

        <motion.div key={status} initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="mt-4 rounded-2xl bg-card p-4 shadow-card">
          {status === "requested" && (
            <div className="flex items-center gap-3">
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }} className="grid h-12 w-12 place-items-center rounded-full bg-primary-soft text-primary">
                <Car className="h-6 w-6" />
              </motion.div>
              <div>
                <div className="text-sm font-bold">{meta.label}</div>
                <div className="text-xs text-muted-foreground">{meta.subtitle}</div>
              </div>
            </div>
          )}

          {(status === "accepted" || status === "ongoing") && driver && (
            <>
              <div className="flex items-center gap-3">
                <div className="grid h-12 w-12 place-items-center rounded-full bg-primary text-primary-foreground font-bold">{driverInitials}</div>
                <div className="flex-1">
                  <div className="text-sm font-bold">{driver.full_name ?? "Driver"}</div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Star className="h-3 w-3 fill-warning text-warning" /> {driverInfo?.rating ?? 5.0}
                  </div>
                </div>
                {driver.phone && (
                  <a href={`tel:${driver.phone}`} className="grid h-10 w-10 place-items-center rounded-full bg-success text-white">
                    <Phone className="h-4 w-4" />
                  </a>
                )}
                <button className="grid h-10 w-10 place-items-center rounded-full bg-primary text-primary-foreground">
                  <MessageCircle className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-4 rounded-xl bg-primary-soft p-3">
                <div className="text-xs font-semibold text-primary">{meta.label}</div>
                <div className="mt-1 text-xl font-extrabold">{order?.eta_min ? `${order.eta_min} menit` : meta.subtitle}</div>
              </div>
            </>
          )}

          {(status === "completed" || status === "cancelled") && (
            <div className="py-2 text-center">
              <div className={`mx-auto grid h-14 w-14 place-items-center rounded-full ${status === "completed" ? "bg-success" : "bg-destructive"} text-white`}>
                {status === "completed" ? <Car className="h-6 w-6" /> : <X className="h-6 w-6" />}
              </div>
              <div className="mt-3 text-base font-bold">{meta.label}</div>
              <div className="text-sm text-muted-foreground">{meta.subtitle}</div>
              <Link to="/" className="mt-4 inline-block rounded-full bg-primary px-6 py-2.5 text-sm font-bold text-primary-foreground shadow-card">Selesai</Link>
            </div>
          )}
        </motion.div>

        {(status === "requested" || status === "accepted") && (
          <button
            disabled={cancelMutation.isPending}
            onClick={() => cancelMutation.mutate()}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-full border border-border bg-card py-3 text-sm font-semibold text-destructive disabled:opacity-50"
          >
            <X className="h-4 w-4" /> Batalkan pesanan
          </button>
        )}
      </div>
    </div>
  );
}
