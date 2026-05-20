import { createFileRoute, useNavigate, Navigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { motion } from "framer-motion";
import { format, addDays, isSameDay } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { ArrowRight, Users, Bus, Loader2 } from "lucide-react";
import { PageHeader } from "@/shared/components/PageHeader";
import { BookingStepper } from "@/features/shuttle/components/BookingStepper";
import { formatRupiah } from "@/shared/utils/utils";
import { KNO_AIRPORT, type Schedule } from "@/shared/types/mock-data";
import { useBooking } from "@/features/booking/store/booking";
import { listSchedules } from "@/features/shuttle/services/shuttle.functions";

export const Route = createFileRoute("/shuttle/schedule")({
  head: () => ({ meta: [{ title: "Pilih Jadwal — PYU-GO" }] }),
  component: SchedulePage,
});

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Jakarta" });
}

function SchedulePage() {
  const { pickup, setSchedule, setDate, date } = useBooking();
  const nav = useNavigate();
  const [selectedDate, setSelectedDate] = useState<Date>(date ? new Date(date) : new Date());
  const dateStr = format(selectedDate, "yyyy-MM-dd");

  const fetchSchedules = useServerFn(listSchedules);
  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["schedules", pickup?.id, dateStr],
    queryFn: () => fetchSchedules({ data: { pickupPointId: pickup!.id, date: dateStr } }),
    enabled: !!pickup,
  });

  if (!pickup) return <Navigate to="/shuttle/pickup" />;

  const schedules: Schedule[] = useMemo(
    () =>
      rows.map((r: any) => ({
        id: r.id,
        pickupId: r.pickup_point_id,
        departureTime: fmtTime(r.departure_at),
        arrivalTime: r.arrival_at ? fmtTime(r.arrival_at) : "—",
        vehicleType: r.vehicles?.type ?? "hiace",
        vehicleName: r.vehicles?.name ?? "Shuttle",
        className: r.tier ?? "Reguler",
        price: r.price,
        seatsTotal: r.seats_total,
        seatsBooked: [],
        plate: r.vehicles?.plate ?? "—",
      })),
    [rows],
  );

  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(new Date(), i)), []);

  const pickDate = (d: Date) => {
    setSelectedDate(d);
    setDate(format(d, "yyyy-MM-dd"));
  };

  return (
    <div className="min-h-screen bg-secondary/40">
      <PageHeader title="Pilih Kendaraan" subtitle={`${pickup.name} → ${KNO_AIRPORT.code}`} />
      <BookingStepper />

      <div className="no-scrollbar sticky top-[120px] z-10 flex gap-2 overflow-x-auto border-b border-border bg-card/95 px-4 py-3 backdrop-blur">
        {days.map((d) => {
          const active = isSameDay(d, selectedDate);
          return (
            <button key={d.toISOString()} onClick={() => pickDate(d)} className={`flex min-w-[58px] flex-col items-center rounded-xl border px-2.5 py-2 text-xs transition ${active ? "border-primary bg-primary text-primary-foreground shadow-card" : "border-border bg-card text-foreground"}`}>
              <span className="opacity-80">{format(d, "EEE", { locale: idLocale })}</span>
              <span className="text-base font-bold">{format(d, "d")}</span>
              <span className="opacity-80">{format(d, "MMM", { locale: idLocale })}</span>
            </button>
          );
        })}
      </div>

      <div className="mx-auto max-w-md space-y-3 p-4">
        {isLoading && (
          <div className="flex items-center justify-center rounded-2xl bg-card p-6 text-sm text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Memuat jadwal...
          </div>
        )}
        {!isLoading && schedules.length === 0 && (
          <div className="rounded-2xl bg-card p-8 text-center text-sm text-muted-foreground">Tidak ada jadwal untuk tanggal ini.</div>
        )}
        {schedules.map((s, i) => (
          <motion.button key={s.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }} whileTap={{ scale: 0.98 }}
            onClick={() => { setDate(dateStr); setSchedule(s); nav({ to: "/shuttle/seats" }); }}
            className="block w-full rounded-2xl bg-card p-4 text-left shadow-soft transition hover:shadow-card">
            <div className="flex items-start gap-3">
              <div className="grid h-14 w-20 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary">
                <Bus className="h-6 w-6" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-bold truncate">{s.vehicleName}</div>
                <div className="text-[11px] text-muted-foreground">{s.plate}</div>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-semibold text-accent-foreground">{s.className}</span>
                  <span className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold bg-success/10 text-success">
                    <Users className="h-3 w-3" /> {s.seatsTotal} kursi
                  </span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-base font-extrabold text-primary">{formatRupiah(s.price)}</div>
                <div className="text-[10px] text-muted-foreground">per kursi</div>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-3 border-t border-dashed border-border pt-3">
              <div className="flex flex-col items-center">
                <span className="text-lg font-extrabold">{s.departureTime}</span>
                <span className="text-[10px] text-muted-foreground">Berangkat</span>
              </div>
              <div className="flex flex-1 flex-col items-center">
                <div className="text-[10px] text-muted-foreground">1j 30m</div>
                <div className="my-1 flex w-full items-center gap-1 text-primary">
                  <div className="h-1 w-2 rounded-full bg-primary" />
                  <div className="h-px flex-1 bg-primary/40" />
                  <ArrowRight className="h-3 w-3" />
                  <div className="h-px flex-1 bg-primary/40" />
                  <div className="h-1 w-2 rounded-full bg-primary" />
                </div>
                <div className="text-[10px] text-muted-foreground">Direct</div>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-lg font-extrabold">{s.arrivalTime}</span>
                <span className="text-[10px] text-muted-foreground">Tiba KNO</span>
              </div>
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  );
}
