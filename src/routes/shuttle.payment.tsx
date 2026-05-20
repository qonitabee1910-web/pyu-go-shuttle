import { createFileRoute, Navigate, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { motion } from "framer-motion";
import { CreditCard, Wallet, Building2, ShieldCheck, Calendar, Clock, User, MapPin, AlertCircle, Loader2 } from "lucide-react";
import { PageHeader } from "@/shared/components/PageHeader";
import { BookingStepper } from "@/features/shuttle/components/BookingStepper";
import { useBooking } from "@/features/booking/store/booking";
import { formatRupiah } from "@/shared/utils/utils";
import { KNO_AIRPORT } from "@/shared/types/shuttle";
import { toast } from "sonner";
import { createBooking } from "@/features/booking/services/bookings.functions";
import { mockPayBooking } from "@/features/booking/services/payments.functions";
import { createXenditInvoice } from "@/features/ride/services/ride.functions";

export const Route = createFileRoute("/shuttle/payment")({
  head: () => ({ meta: [{ title: "Pembayaran — PYU-GO" }] }),
  component: PaymentPage,
});

const methods = [
  { id: "ewallet", label: "PYU Pay", subtitle: "E-wallet simulasi", icon: Wallet },
  { id: "va", label: "Virtual Account", subtitle: "BCA, Mandiri, BNI", icon: Building2 },
  { id: "cc", label: "Kartu Kredit/Debit", subtitle: "Visa, Mastercard", icon: CreditCard },
];

function PaymentPage() {
  const { pickup, schedule, selectedSeats, selectedSeatIds, setBooking, setPayment, date, passengerName, passengerPhone, reset } = useBooking();
  const nav = useNavigate();
  const [method, setMethod] = useState("ewallet");
  const [loading, setLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes in seconds

  const doCreate = useServerFn(createBooking);
  const doPay = useServerFn(mockPayBooking);
  const doXendit = useServerFn(createXenditInvoice);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          toast.error("Waktu pemesanan habis. Silakan pilih kembali.");
          reset();
          nav({ to: "/shuttle/pickup" });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [nav, reset]);

  if (!pickup || !schedule || selectedSeats.length === 0) return <Navigate to="/shuttle/pickup" />;

  const subtotal = selectedSeats.length * schedule.price;
  const fee = 2500;
  const total = subtotal + fee;

  const fmtTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const pay = async () => {
    if (!passengerName || !passengerPhone) {
      toast.error("Lengkapi data penumpang dulu");
      nav({ to: "/shuttle/passenger" });
      return;
    }
    setLoading(true);
    try {
      const booking = await doCreate({
        data: {
          scheduleId: schedule.id,
          seatIds: selectedSeatIds,
          passengerName,
          passengerPhone,
        },
      });
      setBooking(booking.bookingId, booking.code);
      setPayment(total, null);

      if (method === "ewallet") {
        const result = await doPay({ data: { bookingId: booking.bookingId, method } });
        if (!result.success) {
          toast.error("Pembayaran gagal. Coba lagi atau pilih metode lain.");
          setLoading(false);
          return;
        }
        toast.success("Pembayaran berhasil");
        nav({ to: "/shuttle/ticket" });
      } else {
        // Real Xendit Integration (VA / QRIS)
        const { invoiceUrl } = await doXendit({
          data: {
            bookingId: booking.bookingId,
            amount: total,
            email: "user@example.com", // Should get from auth
            name: passengerName,
          },
        });
        toast.success("Invoice berhasil dibuat");
        window.location.href = invoiceUrl;
      }
    } catch (e: any) {
      toast.error(e?.message ?? "Gagal memproses pembayaran");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-secondary/40 pb-36">
      <PageHeader title="Pembayaran" />
      <BookingStepper />

      <div className="mx-auto max-w-md space-y-3 p-4">
        <div className="flex items-center justify-between rounded-xl bg-amber-50 px-4 py-2 text-xs font-medium text-amber-800">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-3.5 w-3.5" />
            Selesaikan pembayaran dalam
          </div>
          <div className="font-mono font-bold">{fmtTime(timeLeft)}</div>
        </div>

        <section className="rounded-2xl bg-card p-4 shadow-soft">
          <div className="text-xs font-semibold uppercase text-muted-foreground">Detail Perjalanan</div>
          <div className="mt-2 text-sm font-bold">{pickup.name} → {KNO_AIRPORT.code}</div>
          <div className="text-xs text-muted-foreground">{schedule.vehicleName} • {schedule.className}</div>
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
            <SummaryRow icon={<Calendar className="h-3.5 w-3.5" />} label="Tanggal" value={date ?? "Hari ini"} />
            <SummaryRow icon={<Clock className="h-3.5 w-3.5" />} label="Jam" value={schedule.departureTime} />
            <SummaryRow icon={<User className="h-3.5 w-3.5" />} label="Penumpang" value={`${selectedSeats.length} orang`} />
            <SummaryRow icon={<MapPin className="h-3.5 w-3.5" />} label="Plat" value={schedule.plate} />
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5 border-t border-dashed border-border pt-3">
            {selectedSeats.map((s) => (
              <span key={s} className="rounded-full bg-primary-soft px-2.5 py-0.5 text-[11px] font-bold text-primary">Kursi {s}</span>
            ))}
          </div>
        </section>

        {passengerName && (
          <section className="rounded-2xl bg-card p-4 shadow-soft">
            <div className="text-xs font-semibold uppercase text-muted-foreground">Kontak Penumpang</div>
            <div className="mt-2 text-sm font-bold">{passengerName}</div>
            <div className="text-xs text-muted-foreground">{passengerPhone}</div>
          </section>
        )}

        <section className="rounded-2xl bg-card p-2 shadow-soft">
          <div className="px-2 py-1 text-xs font-semibold uppercase text-muted-foreground">Metode Pembayaran</div>
          <div className="mt-1 space-y-1">
            {methods.map((m) => {
              const Icon = m.icon;
              const active = method === m.id;
              return (
                <button key={m.id} onClick={() => setMethod(m.id)} className={`flex w-full items-center gap-3 rounded-xl p-3 text-left transition ${active ? "bg-primary-soft" : "hover:bg-muted"}`}>
                  <div className={`grid h-10 w-10 place-items-center rounded-lg ${active ? "bg-primary text-primary-foreground" : "bg-muted text-primary"}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-semibold">{m.label}</div>
                    <div className="text-xs text-muted-foreground">{m.subtitle}</div>
                  </div>
                  <span className={`h-4 w-4 rounded-full border-2 ${active ? "border-primary bg-primary" : "border-border"}`} />
                </button>
              );
            })}
          </div>
        </section>

        <section className="rounded-2xl bg-card p-4 shadow-soft text-sm">
          <Row label={`Tarif (${selectedSeats.length} kursi)`} value={formatRupiah(subtotal)} />
          <Row label="Biaya layanan" value={formatRupiah(fee)} />
          <div className="my-2 border-t border-dashed border-border" />
          <Row label="Total" value={formatRupiah(total)} bold />
        </section>

        <div className="flex items-center gap-2 rounded-2xl bg-success/10 p-3 text-xs text-success">
          <ShieldCheck className="h-4 w-4" /> Pembayaran aman & terenkripsi
        </div>
      </div>

      <motion.div initial={{ y: 80 }} animate={{ y: 0 }} className="fixed bottom-0 left-1/2 z-40 w-full max-w-md -translate-x-1/2 border-t border-border bg-card/95 px-5 py-3 backdrop-blur shadow-float">
        <button 
          onClick={pay} 
          disabled={loading || timeLeft === 0} 
          className="w-full flex items-center justify-center rounded-full bg-primary py-3.5 text-sm font-bold text-primary-foreground shadow-card disabled:opacity-60"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Memproses...
            </>
          ) : (
            `Bayar ${formatRupiah(total)}`
          )}
        </button>
      </motion.div>
    </div>
  );
}

function SummaryRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-lg bg-secondary/60 p-2">
      <div className="flex items-center gap-1 text-[10px] uppercase text-muted-foreground">{icon} {label}</div>
      <div className="mt-0.5 text-xs font-bold truncate">{value}</div>
    </div>
  );
}

function Row({ label, value, bold, positive }: { label: string; value: string; bold?: boolean; positive?: boolean }) {
  return (
    <div className={`flex items-center justify-between py-1 ${bold ? "text-base font-extrabold" : ""} ${positive ? "text-success" : ""}`}>
      <span className={bold ? "" : "text-muted-foreground"}>{label}</span>
      <span>{value}</span>
    </div>
  );
}
