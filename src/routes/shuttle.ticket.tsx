import { createFileRoute, Link, Navigate, useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { QRCodeSVG } from "qrcode.react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import { Calendar, Clock, MapPin, User, Bus, Share2, Navigation, Download, Loader2 } from "lucide-react";
import { PageHeader } from "@/shared/components/PageHeader";
import { useBooking } from "@/features/booking/store/booking";
import { formatRupiah } from "@/shared/utils/utils";
import { KNO_AIRPORT } from "@/shared/types/mock-data";
import { getBooking } from "@/features/booking/services/bookings.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/shuttle/ticket")({
  head: () => ({ meta: [{ title: "E-Ticket — PYU-GO" }] }),
  component: TicketPage,
});

function fmtTime(iso?: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Jakarta" });
}
function fmtDate(iso?: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Jakarta" });
}

function TicketPage() {
  const { bookingId, reset } = useBooking();
  const ticketRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);
  const nav = useNavigate();
  const fetchBooking = useServerFn(getBooking);

  const { data: booking, isLoading } = useQuery({
    queryKey: ["booking", bookingId],
    queryFn: () => fetchBooking({ data: { id: bookingId! } }),
    enabled: !!bookingId,
  });

  if (!bookingId) return <Navigate to="/bookings" />;
  if (isLoading || !booking) {
    return (
      <div className="min-h-screen bg-hero-gradient pb-10">
        <PageHeader title="E-Ticket" />
        <div className="flex items-center justify-center p-10 text-sm text-primary-foreground">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Memuat tiket...
        </div>
      </div>
    );
  }

  const sched: any = (booking as any).schedules;
  const pickup = sched?.pickup_points;
  const vehicle = sched?.vehicles;
  const seats: string[] = ((booking as any).seat_bookings ?? [])
    .map((sb: any) => sb.seats?.seat_no)
    .filter(Boolean);
  const code = (booking as any).code as string;
  const totalPaid = (booking as any).total as number;

  const handleDownload = async () => {
    if (!ticketRef.current) return;
    try {
      setDownloading(true);
      await new Promise((r) => requestAnimationFrame(() => r(null)));
      const { toPng } = await import("html-to-image");
      const dataUrl = await toPng(ticketRef.current, { pixelRatio: 2, cacheBust: true, backgroundColor: "#ffffff" });
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `eticket-${code}.png`;
      a.click();
      toast.success("E-Ticket berhasil diunduh");
    } catch {
      toast.error("Gagal mengunduh tiket");
    } finally {
      setDownloading(false);
    }
  };

  const handleShare = async () => {
    const text = `E-Ticket PYU-GO\nKode: ${code}\n${pickup?.name ?? ""} → ${KNO_AIRPORT.code}\n${fmtDate(sched?.departure_at)} • ${fmtTime(sched?.departure_at)}`;
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: "PYU-GO E-Ticket", text });
        return;
      } catch { /* cancelled */ }
    }
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Detail tiket disalin");
    } catch {
      toast.error("Gagal membagikan");
    }
  };

  return (
    <div className="min-h-screen bg-hero-gradient pb-10">
      <PageHeader title="E-Ticket" />

      <motion.div
        ref={ticketRef}
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="mx-auto mt-4 max-w-md overflow-hidden rounded-3xl bg-card shadow-float"
        style={{ marginLeft: "1rem", marginRight: "1rem" }}
      >
        <div className="bg-primary p-5 text-primary-foreground">
          <div className="flex items-center justify-between text-xs opacity-90">
            <span className="font-semibold">PYU-GO SHUTTLE</span>
            <span>{sched?.tier ?? "Reguler"}</span>
          </div>
          <div className="mt-3 flex items-end justify-between">
            <div>
              <div className="text-[11px] opacity-80">Berangkat</div>
              <div className="text-2xl font-extrabold leading-none">{fmtTime(sched?.departure_at)}</div>
              <div className="mt-1 text-xs font-semibold">{pickup?.name ?? "—"}</div>
            </div>
            <div className="flex flex-col items-center px-2 text-xs opacity-90">
              <Bus className="h-5 w-5" />
              <span className="mt-1">1j 30m</span>
            </div>
            <div className="text-right">
              <div className="text-[11px] opacity-80">Tiba</div>
              <div className="text-2xl font-extrabold leading-none">{fmtTime(sched?.arrival_at)}</div>
              <div className="mt-1 text-xs font-semibold">{KNO_AIRPORT.code}</div>
            </div>
          </div>
        </div>

        <div className="relative bg-card">
          <div className="absolute -left-3 top-1/2 h-6 w-6 -translate-y-1/2 rounded-full bg-secondary" />
          <div className="absolute -right-3 top-1/2 h-6 w-6 -translate-y-1/2 rounded-full bg-secondary" />
          <div className="mx-5 border-t-2 border-dashed border-border" />
        </div>

        <div className="p-5">
          <div className="flex items-center justify-center">
            <div className="rounded-2xl border-2 border-border bg-white p-3">
              <QRCodeSVG value={code} size={140} />
            </div>
          </div>
          <div className="mt-3 text-center">
            <div className="text-xs text-muted-foreground">Kode Booking</div>
            <div className="text-lg font-extrabold tracking-widest text-primary">{code}</div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
            <Info icon={<Calendar className="h-3.5 w-3.5" />} label="Tanggal" value={fmtDate(sched?.departure_at)} />
            <Info icon={<Clock className="h-3.5 w-3.5" />} label="Jam" value={fmtTime(sched?.departure_at)} />
            <Info icon={<Bus className="h-3.5 w-3.5" />} label="Kendaraan" value={vehicle ? `${vehicle.name} (${vehicle.plate})` : "—"} />
            <Info icon={<User className="h-3.5 w-3.5" />} label="Kursi" value={seats.join(", ") || "—"} />
            <Info icon={<MapPin className="h-3.5 w-3.5" />} label="Jemput" value={pickup?.name ?? "—"} />
            <Info icon={<MapPin className="h-3.5 w-3.5" />} label="Tujuan" value={KNO_AIRPORT.code} />
            {(booking as any).passenger_name && (
              <Info icon={<User className="h-3.5 w-3.5" />} label="Penumpang" value={(booking as any).passenger_name} />
            )}
            {(booking as any).passenger_phone && (
              <Info icon={<User className="h-3.5 w-3.5" />} label="Kontak" value={(booking as any).passenger_phone} />
            )}
          </div>

          <div className="mt-4 space-y-1.5">
            <div className="flex items-center justify-between rounded-xl bg-secondary p-3 text-xs">
              <span className="text-muted-foreground">Total dibayar</span>
              <span className="text-base font-extrabold text-primary">{formatRupiah(totalPaid)}</span>
            </div>
          </div>
        </div>
      </motion.div>

      <div className="mx-auto mt-4 max-w-md space-y-2 px-4">
        <button
          onClick={handleDownload}
          disabled={downloading}
          className="flex w-full items-center justify-center gap-2 rounded-full bg-white py-3 text-sm font-bold text-primary shadow-card disabled:opacity-60"
        >
          <Download className="h-4 w-4" /> {downloading ? "Menyiapkan..." : "Download E-Ticket"}
        </button>
        <div className="flex gap-2">
          <button
            onClick={handleShare}
            className="flex flex-1 items-center justify-center gap-2 rounded-full bg-white/15 py-3 text-sm font-semibold text-primary-foreground backdrop-blur"
          >
            <Share2 className="h-4 w-4" /> Bagikan
          </button>
          <Link
            to="/shuttle/tracking"
            className="flex flex-1 items-center justify-center gap-2 rounded-full bg-white/15 py-3 text-sm font-semibold text-primary-foreground backdrop-blur"
          >
            <Navigation className="h-4 w-4" /> Lacak Shuttle
          </Link>
        </div>
        <button
          onClick={() => {
            reset();
            nav({ to: "/shuttle/pickup" });
          }}
          className="w-full rounded-full border border-white/30 bg-transparent py-2.5 text-xs font-semibold text-primary-foreground"
        >
          Pesan perjalanan lain
        </button>
      </div>

      <div className="mt-4 text-center text-xs text-primary-foreground/80">
        Tunjukkan QR ini ke driver saat boarding.
      </div>
    </div>
  );
}

function Info({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border p-2">
      <div className="flex items-center gap-1 text-[10px] uppercase text-muted-foreground">
        {icon} {label}
      </div>
      <div className="mt-0.5 truncate text-sm font-semibold">{value}</div>
    </div>
  );
}
