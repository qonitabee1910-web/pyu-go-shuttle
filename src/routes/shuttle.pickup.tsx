import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, Search, Clock, Navigation, Ruler, ChevronRight, Loader2 } from "lucide-react";
import { PageHeader } from "@/shared/components/PageHeader";
import { BookingStepper } from "@/features/shuttle/components/BookingStepper";
import { MapView } from "@/shared/components/MapView";
import { KNO_AIRPORT, type PickupPoint } from "@/shared/types/shuttle";
import { useBooking } from "@/features/booking/store/booking";
import { useOsrmRoute } from "@/shared/hooks/use-osrm-route";
import { useServerFn } from "@tanstack/react-start";
import { listPickupPoints } from "@/features/shuttle/services/shuttle.functions";
import { Skeleton } from "@/shared/components/ui/skeleton";

export const Route = createFileRoute("/shuttle/pickup")({
  head: () => ({ meta: [{ title: "Pilih Titik Jemput — PYU-GO" }] }),
  component: PickupPage,
});

function PickupPage() {
  const [q, setQ] = useState("");
  const [rayon, setRayon] = useState<string>("Semua");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const nav = useNavigate();
  const setPickup = useBooking((s) => s.setPickup);

  const fetchPickups = useServerFn(listPickupPoints);
  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["pickup-points"],
    queryFn: () => fetchPickups(),
  });

  const pickupPoints: PickupPoint[] = useMemo(
    () =>
      rows.map((r: any) => ({
        id: r.id,
        rayon: r.rayon ?? "Rayon A",
        name: r.name,
        address: r.address ?? "",
        city: r.city ?? "Medan",
        distanceKm: Number(r.distance_km ?? 0),
        etaMin: Number(r.eta_min ?? 0),
        lat: Number(r.lat),
        lng: Number(r.lng),
      })),
    [rows],
  );

  const rayons = ["Semua", "Rayon A", "Rayon B", "Rayon C"];
  const filtered = pickupPoints.filter(
    (p) =>
      (rayon === "Semua" || p.rayon === rayon) &&
      (p.name.toLowerCase().includes(q.toLowerCase()) || p.address.toLowerCase().includes(q.toLowerCase())),
  );

  const selected = filtered.find((p) => p.id === selectedId) ?? null;

  const mapPoints = useMemo(
    () => [
      ...filtered.map((p) => ({ lat: p.lat, lng: p.lng, label: p.name })),
      { lat: KNO_AIRPORT.lat, lng: KNO_AIRPORT.lng, label: KNO_AIRPORT.name },
    ],
    [filtered],
  );
  const airportIdx = filtered.length;
  const highlightIdx = selected ? filtered.findIndex((p) => p.id === selected.id) : undefined;

  const mapCenter: [number, number] = selected
    ? [(selected.lat + KNO_AIRPORT.lat) / 2, (selected.lng + KNO_AIRPORT.lng) / 2]
    : filtered.length > 0
      ? [(filtered.reduce((a, p) => a + p.lat, 0) / filtered.length + KNO_AIRPORT.lat) / 2, (filtered.reduce((a, p) => a + p.lng, 0) / filtered.length + KNO_AIRPORT.lng) / 2]
      : [KNO_AIRPORT.lat, KNO_AIRPORT.lng];
  const mapZoom = selected ? 11 : 10;

  const { data: osrm } = useOsrmRoute(
    selected ? { lat: selected.lat, lng: selected.lng } : null,
    selected ? { lat: KNO_AIRPORT.lat, lng: KNO_AIRPORT.lng } : null,
  );
  const routePath: [number, number][] | undefined = selected
    ? osrm?.path ?? [[selected.lat, selected.lng], [KNO_AIRPORT.lat, KNO_AIRPORT.lng]]
    : undefined;

  return (
    <div className="min-h-screen bg-secondary/40 pb-32">
      <PageHeader title="Pilih Titik Jemput" subtitle={`Tujuan: ${KNO_AIRPORT.name}`} />
      <BookingStepper />

      <div className="mx-auto max-w-md space-y-4 p-4">
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-56 w-full rounded-3xl" />
            <div className="flex gap-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-16 rounded-full" />
              ))}
            </div>
            <Skeleton className="h-12 w-full rounded-2xl" />
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4">
                  <Skeleton className="h-10 w-10 rounded-xl" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <>
            <div className="relative">
              <MapView
                key={`${selectedId ?? "all"}-${rayon}-${filtered.length}`}
                center={mapCenter}
                zoom={mapZoom}
                className="h-56 w-full"
                points={mapPoints}
                airportIndex={airportIdx}
                highlightIndex={highlightIdx}
                route={routePath}
                onPointClick={(i) => { if (i < filtered.length) setSelectedId(filtered[i].id); }}
              />
              <div className="absolute bottom-3 left-3 flex gap-1.5">
                <div className="flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1.5 text-[10px] font-bold text-foreground shadow-card backdrop-blur">
                  <div className="h-2 w-2 rounded-full bg-primary" /> TITIK JEMPUT
                </div>
                <div className="flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1.5 text-[10px] font-bold text-foreground shadow-card backdrop-blur">
                  <div className="h-2 w-2 rounded-full bg-warning" /> BANDARA KNO
                </div>
              </div>
            </div>

            <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
              {rayons.map((r) => (
                <button
                  key={r}
                  onClick={() => setRayon(r)}
                  className={`shrink-0 rounded-full px-4 py-1.5 text-xs font-bold transition ${rayon === r ? "bg-primary text-primary-foreground shadow-card" : "bg-card text-muted-foreground border border-border"}`}
                >
                  {r}
                </button>
              ))}
            </div>

            <div className="relative">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Cari lokasi atau hotel..."
                className="w-full rounded-2xl border border-border bg-card py-3.5 pl-11 pr-4 text-sm outline-none shadow-soft focus:border-primary/50"
              />
            </div>

            <div className="space-y-3">
              <AnimatePresence mode="popLayout">
                {filtered.map((p) => (
                  <motion.div
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    key={p.id}
                    onClick={() => setSelectedId(p.id)}
                    className={`group relative flex cursor-pointer items-center gap-4 rounded-3xl border p-4 transition-all duration-300 ${selectedId === p.id ? "border-primary bg-primary/5 shadow-float ring-1 ring-primary/20" : "border-border bg-card hover:border-primary/30 shadow-soft"}`}
                  >
                    <div className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl transition-colors ${selectedId === p.id ? "bg-primary text-primary-foreground" : "bg-secondary text-primary"}`}>
                      <MapPin className="h-6 w-6" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold tracking-tight text-foreground">{p.name}</span>
                        <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-bold text-primary">{p.rayon}</span>
                      </div>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">{p.address}</p>
                      <div className="mt-2.5 flex items-center gap-4">
                        <div className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
                          <Navigation className="h-3.5 w-3.5 text-primary" /> {p.distanceKm} km
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
                          <Clock className="h-3.5 w-3.5 text-primary" /> {p.etaMin} mnt
                        </div>
                      </div>
                    </div>
                    {selectedId === p.id && (
                      <motion.button
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setPickup(p);
                          nav({ to: "/shuttle/schedule" });
                        }}
                        className="rounded-full bg-primary p-2.5 text-primary-foreground shadow-card"
                      >
                        <ChevronRight className="h-5 w-5" />
                      </motion.button>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>

              {filtered.length === 0 && (
                <div className="py-12 text-center">
                  <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-secondary text-primary">
                    <Search className="h-8 w-8" />
                  </div>
                  <h3 className="mt-4 text-sm font-bold">Lokasi tidak ditemukan</h3>
                  <p className="mt-1 text-xs text-muted-foreground">Coba gunakan kata kunci lain atau pilih rayon berbeda.</p>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      <AnimatePresence>
        {selected && (
          <motion.div initial={{ y: 120, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 120, opacity: 0 }} transition={{ type: "spring", damping: 22, stiffness: 220 }} className="fixed bottom-0 left-1/2 z-40 w-full max-w-md -translate-x-1/2 rounded-t-3xl border-t border-border bg-card/95 px-4 pb-4 pt-3 backdrop-blur shadow-float">
            <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-muted" />
            <div className="min-w-0">
              <div className="truncate text-sm font-bold">{selected.name}</div>
              <div className="truncate text-[11px] text-muted-foreground">
                {osrm ? `${osrm.distanceKm.toFixed(1)} km • ${Math.round(osrm.durationMin)} mnt via jalan` : `${selected.distanceKm} km • ETA ${selected.etaMin} mnt ke titik`}
              </div>
              <div className="mt-2 flex gap-2">
                <button onClick={() => nav({ to: "/shuttle/pickup/$pointId", params: { pointId: selected.id } })} className="flex-1 rounded-full border border-border bg-secondary py-2.5 text-xs font-bold text-foreground">Lihat rute</button>
                <button onClick={() => { setPickup(selected); nav({ to: "/shuttle/service" }); }} className="flex-[1.4] rounded-full bg-primary py-2.5 text-xs font-bold text-primary-foreground shadow-card">Pilih & lanjut</button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-lg bg-secondary/60 p-1.5">
      <div className="flex items-center gap-1 text-muted-foreground">{icon} {label}</div>
      <div className="mt-0.5 text-xs font-bold">{value}</div>
    </div>
  );
}
