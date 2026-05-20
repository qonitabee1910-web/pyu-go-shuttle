import { createFileRoute, Navigate, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { motion } from "framer-motion";
import { User, Phone, Info } from "lucide-react";
import { PageHeader } from "@/shared/components/PageHeader";
import { BookingStepper } from "@/features/shuttle/components/BookingStepper";
import { useBooking } from "@/features/booking/store/booking";
import { toast } from "sonner";

export const Route = createFileRoute("/shuttle/passenger")({
  head: () => ({ meta: [{ title: "Data Penumpang — PYU-GO" }] }),
  component: PassengerPage,
});

function PassengerPage() {
  const { pickup, schedule, selectedSeats, setPassenger, passengerName, passengerPhone } =
    useBooking();
  const nav = useNavigate();
  const [name, setName] = useState(passengerName);
  const [phone, setPhone] = useState(passengerPhone);
  const [touched, setTouched] = useState(false);

  if (!pickup || !schedule || selectedSeats.length === 0)
    return <Navigate to="/shuttle/pickup" />;

  const nameOk = name.trim().length >= 3;
  const phoneOk = /^[0-9+\s-]{10,16}$/.test(phone.trim());
  const valid = nameOk && phoneOk;

  const normalizePhone = (p: string) => {
    const trimmed = p.trim().replace(/\s|-/g, "");
    if (trimmed.startsWith("0")) return "+62" + trimmed.slice(1);
    return trimmed;
  };

  const submit = () => {
    setTouched(true);
    if (!valid) {
      toast.error("Mohon lengkapi data dengan benar");
      return;
    }
    setPassenger(name.trim(), normalizePhone(phone));
    nav({ to: "/shuttle/payment" });
  };

  return (
    <div className="min-h-screen bg-secondary/40 pb-32">
      <PageHeader title="Data Penumpang" subtitle={`${selectedSeats.length} kursi terpilih`} />
      <BookingStepper />

      <div className="mx-auto max-w-md space-y-3 p-4">
        <div className="rounded-2xl bg-card p-4 shadow-soft">
          <div className="text-xs font-semibold uppercase text-muted-foreground">
            Kontak Utama
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Data ini akan dikirimi e-ticket & notifikasi keberangkatan.
          </p>

          <label className="mt-4 block">
            <span className="text-xs font-semibold">Nama lengkap</span>
            <div
              className={`mt-1 flex items-center gap-2 rounded-xl border px-3 py-2.5 ${
                touched && !nameOk ? "border-destructive" : "border-border"
              }`}
            >
              <User className="h-4 w-4 text-muted-foreground" />
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Sesuai KTP / paspor"
                className="w-full bg-transparent text-sm outline-none"
                maxLength={80}
              />
            </div>
            {touched && !nameOk && (
              <span className="mt-1 text-[11px] text-destructive">
                Minimal 3 huruf
              </span>
            )}
          </label>

          <label className="mt-3 block">
            <span className="text-xs font-semibold">Nomor HP / WhatsApp</span>
            <div
              className={`mt-1 flex items-center gap-2 rounded-xl border px-3 py-2.5 ${
                touched && !phoneOk ? "border-destructive" : "border-border"
              }`}
            >
              <Phone className="h-4 w-4 text-muted-foreground" />
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="08xxxxxxxxxx"
                inputMode="tel"
                className="w-full bg-transparent text-sm outline-none"
                maxLength={16}
              />
            </div>
            {touched && !phoneOk && (
              <span className="mt-1 text-[11px] text-destructive">
                Format nomor tidak valid (10–16 digit)
              </span>
            )}
            {!(touched && !phoneOk) && (
              <span className="mt-1 block text-[11px] text-muted-foreground">
                Format: 08xx atau +628xx
              </span>
            )}
          </label>
        </div>

        <div className="rounded-2xl bg-card p-4 shadow-soft">
          <div className="text-xs font-semibold uppercase text-muted-foreground">
            Kursi terpilih
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {selectedSeats.map((s) => (
              <span
                key={s}
                className="rounded-full bg-primary-soft px-2.5 py-0.5 text-[11px] font-bold text-primary"
              >
                Kursi {s}
              </span>
            ))}
          </div>
        </div>

        <div className="flex items-start gap-2 rounded-2xl bg-primary-soft/60 p-3 text-xs">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <span className="text-muted-foreground">
            Untuk perjalanan grup, kontak utama bertanggung jawab atas seluruh
            penumpang. Bawa identitas saat boarding.
          </span>
        </div>
      </div>

      <motion.div
        initial={{ y: 80 }}
        animate={{ y: 0 }}
        className="fixed bottom-0 left-1/2 z-40 w-full max-w-md -translate-x-1/2 border-t border-border bg-card/95 px-5 py-3 backdrop-blur shadow-float"
      >
        <button
          onClick={submit}
          className="w-full rounded-full bg-primary py-3.5 text-sm font-bold text-primary-foreground shadow-card transition disabled:opacity-50"
        >
          Lanjut ke Pembayaran
        </button>
      </motion.div>
    </div>
  );
}
