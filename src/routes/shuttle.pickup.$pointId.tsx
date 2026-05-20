import { createFileRoute, Link, useNavigate, notFound } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useMemo } from "react";
import {
  ArrowLeft,
  Clock,
  MapPin,
  Navigation,
  Phone,
  Plane,
  Ruler,
  ExternalLink,
  Info,
  Image as ImageIcon,
} from "lucide-react";
import { MapView } from "@/shared/components/MapView";
import { BookingStepper } from "@/features/shuttle/components/BookingStepper";
import { KNO_AIRPORT } from "@/shared/types/shuttle";
import { useBooking } from "@/features/booking/store/booking";
import { useOsrmRoute } from "@/shared/hooks/use-osrm-route";
import { useServerFn } from "@tanstack/react-start";
import { getPickupPoint } from "@/features/shuttle/services/shuttle.functions";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/shared/components/ui/skeleton";

export const Route = createFileRoute("/shuttle/pickup/$pointId")({
  head: () => ({ meta: [{ title: "Rute ke KNO — PYU-GO" }] }),
  component: PickupRoutePreview,
  notFoundComponent: () => (
    <div className="min-h-screen grid place-items-center p-6 text-center">
      <div>
        <p className="text-sm text-muted-foreground">Titik jemput tidak ditemukan.</p>
        <Link
          to="/shuttle/pickup"
          className="mt-3 inline-block rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground"
        >
          Pilih titik lain
        </Link>
      </div>
    </div>
  ),
  errorComponent: ({ error }) => (
    <div className="min-h-screen grid place-items-center p-6 text-center text-sm text-destructive">
      {error.message}
    </div>
  ),
});

const PIC_BY_RAYON: Record<string, string> = {
  "Rayon A": "+62 811-6000-101",
  "Rayon B": "+62 811-6000-102",
  "Rayon C": "+62 811-6000-103",
};

function PickupRoutePreview() {
  const { pointId } = Route.useParams();
  const nav = useNavigate();
  const setPickup = useBooking((s) => s.setPickup);
  
  const fetchPoint = useServerFn(getPickupPoint);
  const { data: rawPoint, isLoading: pointLoading } = useQuery({
    queryKey: ["pickup-point", pointId],
    queryFn: () => fetchPoint({ data: { id: pointId } }),
  });

  const point = useMemo(() => {
    if (!rawPoint) return null;
    return {
      id: rawPoint.id,
      name: rawPoint.name,
      address: rawPoint.address ?? "",
      lat: Number(rawPoint.lat),
      lng: Number(rawPoint.lng),
      rayon: rawPoint.rayon ?? "Rayon A",
      distanceKm: Number(rawPoint.distance_km ?? 0),
      etaMin: Number(rawPoint.eta_min ?? 0),
      imageUrl: rawPoint.image_url,
      gallery: rawPoint.gallery,
    };
  }, [rawPoint]);

  const { data: osrm, isLoading: osrmLoading } = useOsrmRoute(
    point ? { lat: point.lat, lng: point.lng } : null,
    { lat: KNO_AIRPORT.lat, lng: KNO_AIRPORT.lng },
  );

  if (pointLoading) {
    return (
      <div className="min-h-screen bg-secondary/40 pb-28">
        <div className="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-card/95 px-4 py-3 backdrop-blur">
          <Skeleton className="h-9 w-9 rounded-full" />
          <div className="space-y-1">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-48" />
          </div>
        </div>
        <div className="p-4 space-y-4">
          <Skeleton className="h-56 w-full rounded-3xl" />
          <Skeleton className="h-32 w-full rounded-3xl" />
          <Skeleton className="h-48 w-full rounded-3xl" />
        </div>
      </div>
    );
  }

  if (!point) throw notFound();

  const distanceKm = osrm ? Number(osrm.distanceKm.toFixed(1)) : point.distanceKm;
  const estimasiMnt = osrm ? Math.round(osrm.durationMin) : Math.round(point.distanceKm * 2.5 + 30);
  const arriveAt = new Date(Date.now() + (point.etaMin + estimasiMnt) * 60000);
  const arriveLabel = arriveAt.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const pic = PIC_BY_RAYON[point.rayon] ?? "+62 811-6000-100";

  const center: [number, number] = [
    (point.lat + KNO_AIRPORT.lat) / 2,
    (point.lng + KNO_AIRPORT.lng) / 2,
  ];

  const routePath: [number, number][] = osrm?.path ?? [
    [point.lat, point.lng],
    [KNO_AIRPORT.lat, KNO_AIRPORT.lng],
  ];

  const gmapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${point.lat},${point.lng}&destination=${KNO_AIRPORT.lat},${KNO_AIRPORT.lng}&travelmode=driving`;

  return (
    <div className="min-h-screen bg-secondary/40 pb-28">
      <div className="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-card/95 px-4 py-3 backdrop-blur">
        <Link
          to="/shuttle/pickup"
          className="grid h-9 w-9 place-items-center rounded-full bg-secondary text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="min-w-0">
          <div className="truncate text-sm font-bold tracking-tight">Rute ke KNO</div>
          <div className="truncate text-[11px] font-medium text-muted-foreground">{point.name}</div>
        </div>
      </div>
      <BookingStepper />

      <div className="mx-auto max-w-md space-y-4 p-4">
        {point.imageUrl && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative aspect-video w-full overflow-hidden rounded-[2rem] shadow-soft"
          >
            <img 
              src={point.imageUrl} 
              alt={point.name} 
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            <div className="absolute bottom-4 left-6 text-white">
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest opacity-80">
                <ImageIcon className="h-3 w-3" /> Area Penjemputan
              </div>
              <div className="mt-1 text-lg font-bold">{point.name}</div>
            </div>
          </motion.div>
        )}

        <div className="relative overflow-hidden rounded-[2rem] bg-card shadow-soft">
          <MapView
            center={center}
            zoom={11}
            className="h-64 w-full"
            points={[
              { lat: point.lat, lng: point.lng, label: point.name },
              { lat: KNO_AIRPORT.lat, lng: KNO_AIRPORT.lng, label: "KNO" },
            ]}
            route={routePath}
            showPlane
            planePos={[KNO_AIRPORT.lat, KNO_AIRPORT.lng]}
            vehicleEmoji="✈️"
          />
          <div className="absolute bottom-4 left-4 right-4 flex justify-between gap-2">
             <div className="flex items-center gap-2 rounded-2xl bg-white/95 px-3 py-2 text-[10px] font-bold text-foreground shadow-card backdrop-blur">
                <div className="h-2 w-2 rounded-full bg-primary" /> {point.name}
             </div>
             <a href={gmapsUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 rounded-2xl bg-primary px-3 py-2 text-[10px] font-bold text-primary-foreground shadow-card">
                <ExternalLink className="h-3 w-3" /> GMAPS
             </a>
          </div>
        </div>

        {point.gallery && point.gallery.length > 0 && (
          <div className="space-y-3">
            <div className="px-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Galeri Lokasi</div>
            <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
              {point.gallery.map((img: string, idx: number) => (
                <div key={idx} className="h-20 w-32 shrink-0 overflow-hidden rounded-2xl shadow-soft">
                  <img src={img} alt="" className="h-full w-full object-cover" />
                </div>
              ))}
            </div>
          </div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="overflow-hidden rounded-[2rem] bg-card p-4 shadow-card"
        >
          <div className="flex items-start gap-3">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">
              <MapPin className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold text-accent-foreground">
                  {point.rayon}
                </span>
                <span className="text-[11px] text-muted-foreground">Titik Jemput</span>
              </div>
              <div className="mt-0.5 text-sm font-bold">{point.name}</div>
              <div className="text-xs text-muted-foreground">{point.address}</div>
              <div className="mt-1 text-[11px] text-muted-foreground">
                {point.lat.toFixed(4)}, {point.lng.toFixed(4)}
              </div>
            </div>
          </div>

          <div className="relative my-3 ml-[26px] h-6 border-l-2 border-dashed border-border" />

          <div className="flex items-start gap-3">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground">
              <Plane className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[11px] text-muted-foreground">Tujuan</div>
              <div className="mt-0.5 text-sm font-bold">{KNO_AIRPORT.name}</div>
              <div className="text-xs text-muted-foreground">
                Deli Serdang, Sumatera Utara
              </div>
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-2 gap-2">
          <Metric
            icon={<Ruler className="h-3.5 w-3.5" />}
            label="Jarak ke KNO"
            value={`${distanceKm} km`}
            sub={osrm ? "via jalan" : osrmLoading ? "menghitung…" : "estimasi"}
          />
          <Metric
            icon={<Clock className="h-3.5 w-3.5" />}
            label="ETA jemput"
            value={`${point.etaMin} mnt`}
            sub="armada tiba"
          />
          <Metric
            icon={<Navigation className="h-3.5 w-3.5" />}
            label="Estimasi ke KNO"
            value={`${estimasiMnt} mnt`}
            sub="lama perjalanan"
          />
          <Metric
            icon={<Plane className="h-3.5 w-3.5" />}
            label="Perkiraan tiba"
            value={arriveLabel}
            sub="bila berangkat sekarang"
          />
        </div>

        <div className="rounded-2xl bg-card p-4 shadow-soft">
          <div className="flex items-center gap-2 text-xs font-bold">
            <Info className="h-3.5 w-3.5 text-primary" /> Catatan Operasional
          </div>
          <ul className="mt-2 space-y-1.5 text-[12px] text-muted-foreground">
            <li className="flex justify-between gap-3">
              <span>Jam operasional jemput</span>
              <span className="font-semibold text-foreground">04:00 – 22:00</span>
            </li>
            <li className="flex justify-between gap-3">
              <span>Waktu tunggu maks.</span>
              <span className="font-semibold text-foreground">10 menit</span>
            </li>
            <li className="flex justify-between gap-3">
              <span>PIC {point.rayon}</span>
              <a
                href={`tel:${pic.replace(/\s/g, "")}`}
                className="inline-flex items-center gap-1 font-semibold text-primary"
              >
                <Phone className="h-3 w-3" /> {pic}
              </a>
            </li>
          </ul>

          <a
            href={gmapsUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-3 flex items-center justify-center gap-1.5 rounded-full border border-border bg-secondary py-2 text-xs font-bold text-foreground"
          >
            <ExternalLink className="h-3.5 w-3.5" /> Buka rute di Google Maps
          </a>
        </div>
      </div>

      <div className="fixed bottom-0 left-1/2 z-40 w-full max-w-md -translate-x-1/2 border-t border-border bg-card/95 px-4 py-3 backdrop-blur">
        <div className="flex gap-2">
          <Link
            to="/shuttle/pickup"
            className="flex-1 rounded-full border border-border bg-secondary py-3 text-center text-xs font-bold text-foreground"
          >
            Ganti titik
          </Link>
          <button
            onClick={() => {
              setPickup(point);
              nav({ to: "/shuttle/schedule" });
            }}
            className="flex-[1.4] rounded-full bg-primary py-3 text-xs font-bold text-primary-foreground shadow-card"
          >
            Pilih titik ini & lanjut
          </button>
        </div>
      </div>
    </div>
  );
}

function Metric({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rounded-2xl bg-card p-3 shadow-soft">
      <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
        {icon} {label}
      </div>
      <div className="mt-1 text-sm font-bold">{value}</div>
      {sub && <div className="text-[10px] text-muted-foreground">{sub}</div>}
    </div>
  );
}
