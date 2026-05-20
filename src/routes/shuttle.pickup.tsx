import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, Search, Clock, Navigation, Ruler, ChevronRight, Loader2 } from "lucide-react";
import { PageHeader } from "@/shared/components/PageHeader";
import { BookingStepper } from "@/features/shuttle/components/BookingStepper";
import { MapView } from "@/shared/components/MapView";
import { KNO_AIRPORT, type PickupPoint } from "@/shared/types/mock-data";
import { useBooking } from "@/features/booking/store/booking";
import { useOsrmRoute } from "@/shared/hooks/use-osrm-route";
import { useServerFn } from "@tanstack/react-start";
import { listPickupPoints } from "@/features/shuttle/services/shuttle.functions";

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

      <div className="mx-auto max-w-md space-y-3 p-4">
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
          <div className="pointer-events-none absolute left-3 top-3 rounded-full bg-card/95 px-2.5 py-1 text-[10px] font-bold shadow-soft backdrop-blur">
            {selected ? "Rute ke KNO" : `${filtered.length} titik jemput`}
          </div>
        </div>

        <div className="flex items-center gap-2 rounded-2xl bg-card px-4 py-3 shadow-soft">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari titik jemput..." className="w-full bg-transparent text-sm outline-none" />
        </div>

        <div className="no-scrollbar flex gap-2 overflow-x-auto">
          {rayons.map((r) => (
            <button key={r} onClick={() => setRayon(r)} className={`whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${rayon === r ? "bg-primary text-primary-foreground shadow-card" : "bg-card text-muted-foreground border border-border"}`}>
              {r}
            </button>
          ))}
        </div>

        {isLoading && (
          <div className="flex items-center justify-center rounded-2xl bg-card p-6 text-sm text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Memuat titik jemput...
          </div>
        )}

        <div className="space-y-2 pt-1">
          {filtered.map((p, i) => {
            const estimasi = Math.round(p.distanceKm * 2.5 + 30);
            const active = selectedId === p.id;
            return (
              <motion.button key={p.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }} onClick={() => setSelectedId(active ? null : p.id)} className={`block w-full overflow-hidden rounded-2xl bg-card p-4 text-left shadow-soft transition ${active ? "ring-2 ring-primary" : ""}`}>
                <div className="flex items-start gap-3">
                  <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${active ? "bg-primary text-primary-foreground" : "bg-primary-soft text-primary"}`}>
                    <MapPin className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold text-accent-foreground">{p.rayon}</span>
                      <span className="text-[11px] text-muted-foreground">{p.city}</span>
                    </div>
                    <div className="mt-1 text-sm font-bold">{p.name}</div>
                    <div className="truncate text-xs text-muted-foreground">{p.address}</div>
                    <div className="mt-2 grid grid-cols-3 gap-2 text-[11px]">
                      <Stat icon={<Ruler className="h-3 w-3" />} label="Jarak" value={`${p.distanceKm} km`} />
                      <Stat icon={<Clock className="h-3 w-3" />} label="ETA jemput" value={`${p.etaMin} mnt`} />
                      <Stat icon={<Navigation className="h-3 w-3" />} label="ke KNO" value={`~${estimasi} mnt`} />
                    </div>
                  </div>
                  <ChevronRight className={`h-4 w-4 shrink-0 text-muted-foreground transition ${active ? "rotate-90 text-primary" : ""}`} />
                </div>
              </motion.button>
            );
          })}
          {!isLoading && filtered.length === 0 && (
            <div className="rounded-2xl bg-card p-8 text-center text-sm text-muted-foreground">Tidak ada titik jemput sesuai pencarian</div>
          )}
        </div>
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
