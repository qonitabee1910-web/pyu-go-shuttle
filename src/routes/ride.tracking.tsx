import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Phone, MessageCircle, Star, Car, X } from "lucide-react";
import { PageHeader } from "@/shared/components/PageHeader";
import { MapView } from "@/shared/components/MapView";

export const Route = createFileRoute("/ride/tracking")({
  head: () => ({ meta: [{ title: "Driver dalam perjalanan — PYU-GO" }] }),
  component: RideTracking,
});

function RideTracking() {
  const [stage, setStage] = useState<"matching" | "incoming" | "ontrip" | "done">("matching");
  useEffect(() => {
    const t1 = setTimeout(() => setStage("incoming"), 2500);
    const t2 = setTimeout(() => setStage("ontrip"), 8000);
    const t3 = setTimeout(() => setStage("done"), 16000);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  return (
    <div className="min-h-screen bg-secondary/30 pb-40">
      <PageHeader title="Status Perjalanan" />

      <div className="p-4">
        <MapView
          center={[3.585, 98.679]}
          zoom={14}
          points={[{ lat: 3.585, lng: 98.679 }, { lat: 3.592, lng: 98.685 }]}
          route={[[3.585, 98.679], [3.592, 98.685]]}
          className="h-72 w-full"
        />

        <motion.div
          key={stage}
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="mt-4 rounded-2xl bg-card p-4 shadow-card"
        >
          {stage === "matching" && (
            <div className="flex items-center gap-3">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                className="grid h-12 w-12 place-items-center rounded-full bg-primary-soft text-primary"
              >
                <Car className="h-6 w-6" />
              </motion.div>
              <div>
                <div className="text-sm font-bold">Mencari driver terdekat...</div>
                <div className="text-xs text-muted-foreground">Estimasi 30 detik</div>
              </div>
            </div>
          )}

          {(stage === "incoming" || stage === "ontrip") && (
            <>
              <div className="flex items-center gap-3">
                <div className="grid h-12 w-12 place-items-center rounded-full bg-primary text-primary-foreground font-bold">BS</div>
                <div className="flex-1">
                  <div className="text-sm font-bold">Budi Santoso</div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Star className="h-3 w-3 fill-warning text-warning" /> 4.8 • Toyota Avanza
                  </div>
                  <div className="text-xs font-semibold text-primary">BK 3344 CD</div>
                </div>
                <button className="grid h-10 w-10 place-items-center rounded-full bg-success text-white">
                  <Phone className="h-4 w-4" />
                </button>
                <button className="grid h-10 w-10 place-items-center rounded-full bg-primary text-primary-foreground">
                  <MessageCircle className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-4 rounded-xl bg-primary-soft p-3">
                <div className="text-xs font-semibold text-primary">
                  {stage === "incoming" ? "Driver menuju lokasi jemput" : "Sedang dalam perjalanan ke tujuan"}
                </div>
                <div className="mt-1 text-xl font-extrabold">
                  {stage === "incoming" ? "3 menit lagi" : "12 menit"}
                </div>
              </div>
            </>
          )}

          {stage === "done" && (
            <div className="py-2 text-center">
              <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-success text-white">
                <Car className="h-6 w-6" />
              </div>
              <div className="mt-3 text-base font-bold">Perjalanan selesai 🎉</div>
              <div className="text-sm text-muted-foreground">Terima kasih telah menggunakan PYU-GO</div>
              <Link
                to="/"
                className="mt-4 inline-block rounded-full bg-primary px-6 py-2.5 text-sm font-bold text-primary-foreground shadow-card"
              >
                Selesai
              </Link>
            </div>
          )}
        </motion.div>

        {stage !== "done" && (
          <button className="mt-3 flex w-full items-center justify-center gap-2 rounded-full border border-border bg-card py-3 text-sm font-semibold text-destructive">
            <X className="h-4 w-4" /> Batalkan pesanan
          </button>
        )}
      </div>
    </div>
  );
}
