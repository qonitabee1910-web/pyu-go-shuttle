import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { motion } from "framer-motion";
import { Ticket, ChevronRight, Plane, Clock, Bus, MapPin, Calendar, Loader2, CheckCircle2 } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { PageHeader } from "@/shared/components/PageHeader";
import { formatRupiah, formatDateTime } from "@/shared/utils/utils";
import { KNO_AIRPORT } from "@/shared/types/shuttle";
import { listMyBookings } from "@/features/booking/services/bookings.functions";
import { StatusBadge } from "@/features/admin/components/StatusBadge";
import { Skeleton } from "@/shared/components/ui/skeleton";
import type { BookingStatus } from "@/features/admin/store/admin";

export const Route = createFileRoute("/bookings")({
  head: () => ({ meta: [{ title: "Tiket Saya — PYU-GO" }] }),
  component: BookingsPage,
});

const STATUS_LABEL: Record<string, { label: string; wrap: string; icon: any }> = {
  pending: { label: "Menunggu", wrap: "bg-warning/15 text-warning", icon: Clock },
  paid: { label: "Dibayar", wrap: "bg-primary/15 text-primary", icon: Bus },
  boarded: { label: "Berangkat", wrap: "bg-primary/15 text-primary", icon: Bus },
  completed: { label: "Selesai", wrap: "bg-success/15 text-success", icon: CheckCircle2 },
  cancelled: { label: "Dibatalkan", wrap: "bg-destructive/15 text-destructive", icon: Clock },
};

function BookingsPage() {
  const [tab, setTab] = useState<string>("Semua");
  const [openId, setOpenId] = useState<string | null>(null);
  const fetchList = useServerFn(listMyBookings);
  const qc = useQueryClient();
  const { user } = useAuth();
  const { data: bookings = [], isLoading } = useQuery({
    queryKey: ["my-bookings"],
    queryFn: () => fetchList(),
  });

  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel(`bookings:${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "bookings", filter: `user_id=eq.${user.id}` },
        () => qc.invalidateQueries({ queryKey: ["my-bookings"] }))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user, qc]);

  const tabs = ["Semua", "pending", "paid", "completed"];
  const tabLabel = (t: string) => (t === "Semua" ? "Semua" : STATUS_LABEL[t]?.label ?? t);
  const filtered = tab === "Semua" ? bookings : bookings.filter((b: any) => b.status === tab);

  return (
    <div className="min-h-screen bg-secondary/30 pb-24">
      <PageHeader title="Tiket Saya" back={false} />

      <div className="sticky top-0 z-10 flex gap-2 overflow-x-auto bg-secondary/30 px-4 py-3 backdrop-blur">
        {tabs.map((t) => {
          const active = tab === t;
          return (
            <button key={t} onClick={() => setTab(t)} className={`whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${active ? "bg-primary text-primary-foreground shadow-soft" : "bg-card text-muted-foreground hover:text-foreground"}`}>
              {tabLabel(t)}
            </button>
          );
        })}
      </div>

      <div className="space-y-3 px-4">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="overflow-hidden rounded-2xl bg-card shadow-soft p-4 space-y-3">
              <div className="flex justify-between items-center">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-16 rounded-full" />
              </div>
              <div className="flex gap-2">
                <Skeleton className="h-4 w-4 rounded-full" />
                <Skeleton className="h-4 w-48" />
              </div>
              <Skeleton className="h-3 w-32" />
              <div className="flex justify-between pt-2 border-t border-dashed border-border">
                <Skeleton className="h-5 w-20" />
                <Skeleton className="h-4 w-4" />
              </div>
            </div>
          ))
        ) : (
          <>
            {filtered.length === 0 && (
              <div className="rounded-2xl bg-card p-12 text-center shadow-soft">
                <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-secondary text-primary">
                  <Ticket className="h-8 w-8" />
                </div>
                <h3 className="mt-4 text-sm font-bold text-foreground">Belum ada tiket</h3>
                <p className="mt-1 text-xs text-muted-foreground">Tiket yang kamu pesan akan muncul di sini.</p>
              </div>
            )}
            {filtered.map((b: any) => {
              const meta = STATUS_LABEL[b.status] ?? { label: b.status, wrap: "bg-muted text-foreground", icon: Clock };
              const Icon = meta.icon;
              const open = openId === b.id;
              const sched = b.schedules;
              const pickup = sched?.pickup_points;
              const vehicle = sched?.vehicles;
              const seats = (b.seat_bookings ?? []).map((sb: any) => sb.seats?.seat_no).filter(Boolean);
              return (                <div key={b.id} className="overflow-hidden rounded-2xl bg-card shadow-soft">
                  <button onClick={() => setOpenId(open ? null : b.id)} className="block w-full p-4 text-left transition hover:bg-secondary/40">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2 text-xs font-semibold text-primary"><Ticket className="h-3.5 w-3.5" /> {b.code}</span>
                      <span className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${meta.wrap}`}><Icon className="h-3 w-3" /> {meta.label}</span>
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <Plane className="h-4 w-4 text-primary" />
                      <div className="text-sm font-bold">{pickup?.name ?? "—"} → {KNO_AIRPORT.code}</div>
                    </div>
                    <div className="text-xs text-muted-foreground">{sched ? formatDateTime(sched.departure_at) : ""}</div>
                    <div className="mt-3 flex items-center justify-between border-t border-dashed border-border pt-2">
                      <span className="text-sm font-extrabold text-primary">{formatRupiah(b.total)}</span>
                      <ChevronRight className={`h-4 w-4 text-muted-foreground transition ${open ? "rotate-90" : ""}`} />
                    </div>
                  </button>

                  {open && (
                    <div className="border-t border-border bg-secondary/30 p-4">
                      <div className="flex flex-col items-center">
                        <div className="rounded-2xl border-2 border-border bg-white p-3"><QRCodeSVG value={b.code} size={140} /></div>
                        <div className="mt-2 text-[11px] text-muted-foreground">{b.status === "completed" ? "Tiket sudah digunakan" : "Tunjukkan QR ke driver"}</div>
                      </div>
                      <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                        <Info icon={<Calendar className="h-3.5 w-3.5" />} label="Jadwal" value={sched ? formatDateTime(sched.departure_at) : "—"} />
                        <Info icon={<Bus className="h-3.5 w-3.5" />} label="Kendaraan" value={vehicle ? `${vehicle.name} (${vehicle.plate})` : "—"} />
                        <Info icon={<MapPin className="h-3.5 w-3.5" />} label="Kursi" value={seats.join(", ") || "—"} />
                        <Info icon={<MapPin className="h-3.5 w-3.5" />} label="Jemput" value={pickup?.name ?? "—"} />
                      </div>
                      {b.status !== "completed" && b.status !== "cancelled" && (
                        <Link to="/shuttle/tracking" className="mt-3 flex items-center justify-center gap-2 rounded-full bg-primary py-2.5 text-xs font-bold text-primary-foreground shadow-card">Lacak Shuttle</Link>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}

function Info({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-2">
      <div className="flex items-center gap-1 text-[10px] uppercase text-muted-foreground">{icon} {label}</div>
      <div className="mt-0.5 truncate text-sm font-semibold">{value}</div>
    </div>
  );
}
