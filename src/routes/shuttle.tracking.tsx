import { createFileRoute, Navigate, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Phone, MessageCircle, Star, Bus, MapPin, Gauge, Route as RouteIcon, Clock } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/shared/components/PageHeader";
import { MapView } from "@/shared/components/MapView";

import { useBooking } from "@/features/booking/store/booking";
import { KNO_AIRPORT } from "@/shared/types/mock-data";
import { useOsrmRoute } from "@/shared/hooks/use-osrm-route";
import { useVehicleTracking } from "@/features/ride/hooks/use-vehicle-tracking";

export const Route = createFileRoute("/shuttle/tracking")({
  head: () => ({ meta: [{ title: "Lacak Shuttle — PYU-GO" }] }),
  component: TrackingPage,
});

type LatLng = [number, number];

const haversineKm = (a: LatLng, b: LatLng) => {
  const R = 6371;
  const dLat = ((b[0] - a[0]) * Math.PI) / 180;
  const dLng = ((b[1] - a[1]) * Math.PI) / 180;
  const la1 = (a[0] * Math.PI) / 180;
  const la2 = (b[0] * Math.PI) / 180;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
};

// Phase boundaries (in normalized progress 0..1)
const P_PICKUP = 0.4;
const P_BOARD_END = 0.45;

const PHASE_TOAST: Record<string, string | null> = {
  scheduled: null,
  to_pickup: "Armada dalam perjalanan menuju titik jemput",
  boarding: "Armada tiba di titik jemput. Silakan naik.",
  to_airport: "Armada berangkat menuju Bandara KNO",
  arrived: "Armada telah tiba di Bandara KNO",
};

const PHASE_META: Record<
  string,
  { label: string; tone: string; dot: string }
> = {
  scheduled: { label: "Dijadwalkan", tone: "bg-muted text-foreground", dot: "bg-muted-foreground" },
  to_pickup: { label: "Menuju titik jemput", tone: "bg-primary/15 text-primary", dot: "bg-primary" },
  boarding: { label: "Tiba di titik jemput", tone: "bg-warning/15 text-warning", dot: "bg-warning" },
  to_airport: { label: "Berangkat menuju KNO", tone: "bg-primary/15 text-primary", dot: "bg-primary" },
  arrived: { label: "Tiba di Bandara KNO", tone: "bg-success/15 text-success", dot: "bg-success" },
};

function TrackingPage() {
  const { pickup, schedule } = useBooking();
  const lastPhase = useRef<string>("scheduled");

  // REALTIME TRACKING
  const { location, error: trackingError } = useVehicleTracking(schedule?.vehicleId);

  // Driver start: ~0.02deg offset from pickup (simulate ~2km away).
  const driverStart = useMemo<LatLng | null>(() => {
    if (!pickup) return null;
    return [pickup.lat - 0.018, pickup.lng - 0.014];
  }, [pickup]);

  // Current position from realtime tracking or fallback to driverStart
  const currentPos = useMemo<LatLng>(() => {
    if (location) return [location.lat, location.lng];
    return driverStart || [0, 0];
  }, [location, driverStart]);

  // Real road route: driver→pickup and pickup→KNO
  const { data: legToPickup } = useOsrmRoute(
    driverStart ? { lat: driverStart[0], lng: driverStart[1] } : null,
    pickup ? { lat: pickup.lat, lng: pickup.lng } : null,
  );
  const { data: legToAirport } = useOsrmRoute(
    pickup ? { lat: pickup.lat, lng: pickup.lng } : null,
    { lat: KNO_AIRPORT.lat, lng: KNO_AIRPORT.lng },
  );

  const pickupPos: LatLng = [pickup?.lat ?? 0, pickup?.lng ?? 0];
  const airportPos: LatLng = [KNO_AIRPORT.lat, KNO_AIRPORT.lng];

  // Determine phase based on location
  const phase = useMemo(() => {
    if (!location) return "scheduled";
    const distToPickup = haversineKm([location.lat, location.lng], pickupPos);
    const distToAirport = haversineKm([location.lat, location.lng], airportPos);
    
    if (distToAirport < 0.2) return "arrived";
    if (distToPickup < 0.1) return "boarding";
    
    // If it's closer to airport than pickup, assume it's to_airport
    const pickupToAirport = haversineKm(pickupPos, airportPos);
    if (distToAirport < pickupToAirport * 0.8) return "to_airport";
    
    return "to_pickup";
  }, [location, pickupPos, airportPos]);

  // Phase transition toasts
  useEffect(() => {
    if (phase !== lastPhase.current) {
      lastPhase.current = phase;
      const msg = PHASE_TOAST[phase];
      if (msg) toast.success(msg);
    }
  }, [phase]);

  if (!pickup || !schedule) return <Navigate to="/bookings" />;

  const speed = location?.speed ?? 0;
  const remainingKm = haversineKm(currentPos, phase === "to_pickup" ? pickupPos : airportPos);

  // ETA from remaining distance & current speed
  const effectiveSpeed = Math.max(20, speed); // fallback min speed for ETA
  const etaSec = phase === "arrived" ? 0 : Math.round((remainingKm / effectiveSpeed) * 3600);
  const etaMin = Math.floor(etaSec / 60);
  const etaRemSec = etaSec % 60;
  const arrivalTime = new Date(Date.now() + etaSec * 1000);

  // Full route drawn on the map
  const fullRoute: LatLng[] = [
    ...(legToPickup?.path ?? [driverStart || pickupPos, pickupPos]),
    ...(legToAirport?.path ?? [pickupPos, airportPos]),
  ];

  const phaseHeadline: Record<string, string> = {
    scheduled: "Armada dijadwalkan",
    to_pickup: "Armada menuju titik jemput",
    boarding: "Armada tiba di titik jemput",
    to_airport: "Berangkat menuju Bandara KNO",
    arrived: "Tiba di Bandara KNO",
  };
  const meta = PHASE_META[phase];

  // Progress estimation for the progress bar
  const totalDist = (legToPickup?.distanceKm ?? 2) + (legToAirport?.distanceKm ?? 35);
  const progress = phase === "arrived" ? 1 : 
                   phase === "to_airport" ? 0.6 + (1 - remainingKm / (legToAirport?.distanceKm ?? 35)) * 0.4 :
                   phase === "boarding" ? 0.45 :
                   0.1 + (1 - remainingKm / (legToPickup?.distanceKm ?? 2)) * 0.3;

  return (
    <div className="min-h-screen bg-secondary/30 pb-32">
      <PageHeader title="Pelacakan Shuttle" subtitle={schedule.plate} />

      <div className="p-4">
        {/* Live armada status chip */}
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-3 flex items-center justify-between rounded-2xl bg-card p-3 shadow-soft"
        >
          <div className="flex items-center gap-2">
            <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${meta.dot}`}>
              <span className={`absolute inset-0 rounded-full ${meta.dot} opacity-60 animate-ping`} />
            </span>
            <div>
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                Status Armada
              </div>
              <div className="text-sm font-bold">{meta.label}</div>
            </div>
          </div>
          <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${meta.tone}`}>
            LIVE
          </span>
        </motion.div>

        <MapView
          center={[(pickup.lat + KNO_AIRPORT.lat) / 2, (pickup.lng + KNO_AIRPORT.lng) / 2]}
          zoom={11}
          points={[
            { lat: pickup.lat, lng: pickup.lng, label: pickup.name },
            { lat: KNO_AIRPORT.lat, lng: KNO_AIRPORT.lng, label: KNO_AIRPORT.code },
          ]}
          route={fullRoute}
          showPlane
          planePos={currentPos}
          vehicleEmoji="🚐"
          className="h-72 w-full"
        />

        {/* Live ETA card */}
        <motion.div
          initial={{ y: 16, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="mt-4 rounded-2xl bg-card p-4 shadow-card"
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase text-primary">{phaseHeadline[phase]}</span>
              </div>
              <div className="mt-1 flex items-baseline gap-1">
                <span className="text-3xl font-extrabold tabular-nums">{etaMin}</span>
                <span className="text-sm font-semibold text-muted-foreground">m</span>
                <span className="ml-1 text-2xl font-extrabold tabular-nums">{String(etaRemSec).padStart(2, "0")}</span>
                <span className="text-sm font-semibold text-muted-foreground">s</span>
              </div>
              <div className="text-xs text-muted-foreground">
                Tiba {phase === "to_pickup" || phase === "scheduled" ? "di titik jemput" : "di KNO"}
              </div>
            </div>
            <motion.div
              animate={{ y: [0, -4, 0] }}
              transition={{ duration: 1.6, repeat: Infinity }}
              className="grid h-14 w-14 place-items-center rounded-2xl bg-primary text-primary-foreground"
            >
              <Bus className="h-7 w-7" />
            </motion.div>
          </div>

          {/* Live metrics */}
          <div className="mt-4 grid grid-cols-3 gap-2">
            <Metric icon={<Gauge className="h-3.5 w-3.5" />} label="Kecepatan" value={`${speed} km/h`} />
            <Metric icon={<RouteIcon className="h-3.5 w-3.5" />} label="Sisa jarak" value={`${remainingKm.toFixed(1)} km`} />
            <Metric
              icon={<Clock className="h-3.5 w-3.5" />}
              label="Estimasi tiba"
              value={arrivalTime.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
            />
          </div>

          {/* Progress bar */}
          <div className="mt-4">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <motion.div
                className="h-full rounded-full bg-primary"
                animate={{ width: `${Math.round(progress * 100)}%` }}
                transition={{ ease: "linear", duration: 0.5 }}
              />
            </div>
            <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
              <span>Mulai</span>
              <span className="tabular-nums">{Math.round(progress * 100)}%</span>
              <span>KNO</span>
            </div>
          </div>

          {/* Timeline — status armada */}
          <div className="mt-4 space-y-3">
            <Step label="Menuju titik jemput" done={progress >= 0.01} active={phase === "to_pickup"} />
            <Step label={`Tiba di ${pickup.name}`} done={progress >= P_PICKUP} active={phase === "boarding"} />
            <Step label="Berangkat menuju KNO" done={progress >= P_BOARD_END} active={phase === "to_airport"} />
            <Step label={`Tiba di Bandara ${KNO_AIRPORT.code}`} done={progress >= 1} active={phase === "arrived"} />
          </div>
        </motion.div>

        {/* Driver card — deterministic from plate */}
        {(() => {
          const drivers = [
            { name: "Andi Saputra", phone: "+62811000101" },
            { name: "Budi Hartono", phone: "+62811000102" },
            { name: "Citra Wijaya", phone: "+62811000103" },
            { name: "Dimas Pratama", phone: "+62811000104" },
            { name: "Eko Susilo", phone: "+62811000105" },
          ];
          const hash = schedule.plate.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
          const driver = drivers[hash % drivers.length];
          const initials = driver.name.split(" ").map((s) => s[0]).join("").slice(0, 2);
          const rating = (4.7 + ((hash % 3) * 0.1)).toFixed(1);
          return (
            <div className="mt-3 rounded-2xl bg-card p-4 shadow-soft">
              <div className="flex items-center gap-3">
                <div className="grid h-12 w-12 place-items-center rounded-full bg-primary-soft text-primary font-bold">
                  {initials}
                </div>
                <div className="flex-1">
                  <div className="text-sm font-bold">{driver.name}</div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Star className="h-3 w-3 fill-warning text-warning" /> {rating} • {schedule.vehicleName}
                  </div>
                  <div className="text-xs font-semibold text-primary">{schedule.plate}</div>
                </div>
                <a
                  href={`tel:${driver.phone}`}
                  className="grid h-10 w-10 place-items-center rounded-full bg-success text-white"
                >
                  <Phone className="h-4 w-4" />
                </a>
                <button
                  onClick={() => toast.info("Chat driver belum tersedia di demo")}
                  className="grid h-10 w-10 place-items-center rounded-full bg-primary text-primary-foreground"
                >
                  <MessageCircle className="h-4 w-4" />
                </button>
              </div>
            </div>
          );
        })()}

        <div className="mt-3 rounded-2xl border border-warning/30 bg-warning/10 p-3 text-xs">
          <div className="flex items-center gap-2 font-semibold text-foreground">
            <MapPin className="h-4 w-4 text-warning" /> Tunggu di titik jemput
          </div>
          <div className="mt-1 text-muted-foreground">
            Driver akan menunggu maksimal 10 menit. Pastikan kamu sudah berada di lokasi.
          </div>
        </div>

        <Link
          to="/shuttle/ticket"
          className="mt-4 block rounded-full border border-border bg-card py-3 text-center text-sm font-semibold"
        >
          Lihat E-Ticket
        </Link>
      </div>
    </div>
  );
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl bg-secondary/60 p-2">
      <div className="flex items-center gap-1 text-[10px] uppercase text-muted-foreground">{icon} {label}</div>
      <div className="mt-0.5 text-sm font-extrabold tabular-nums">{value}</div>
    </div>
  );
}

function Step({ label, done, active }: { label: string; done?: boolean; active?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <span
        className={`h-3 w-3 rounded-full border-2 ${
          done ? "bg-primary border-primary" : "bg-card border-border"
        } ${active ? "ring-4 ring-primary/20" : ""}`}
      />
      <span className={`text-sm ${done ? "font-semibold text-foreground" : "text-muted-foreground"}`}>
        {label}
      </span>
    </div>
  );
}
