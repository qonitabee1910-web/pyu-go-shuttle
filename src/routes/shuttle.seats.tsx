import { createFileRoute, Navigate, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { PageHeader } from "@/shared/components/PageHeader";
import { BookingStepper } from "@/features/shuttle/components/BookingStepper";
import { useBooking } from "@/features/booking/store/booking";
import { formatRupiah } from "@/shared/utils/utils";
import { toast } from "sonner";
import { getScheduleSeats } from "@/features/shuttle/services/shuttle.functions";
import { useSeatAvailability } from "@/features/shuttle/hooks/use-seat-availability";
import { SeatPicker } from "@/features/shuttle/components/SeatPicker";
import { Skeleton } from "@/shared/components/ui/skeleton";

import { holdSeats } from "@/features/shuttle/services/shuttle.functions";

export const Route = createFileRoute("/shuttle/seats")({
  head: () => ({ meta: [{ title: "Pilih Kursi — PYU-GO" }] }),
  component: SeatsPage,
});

const MAX_SELECT = 4;

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
      <div className={`h-3 w-3 rounded-full ${color}`} /> {label}
    </div>
  );
}

function SeatsPage() {
  const { schedule, selectedSeats, selectedSeatIds, toggleSeat, pickup } = useBooking();
  const nav = useNavigate();
  const [isHolding, setIsHolding] = useState(false);

  const fetchSeats = useServerFn(getScheduleSeats);
  const holdSeatsFn = useServerFn(holdSeats);
  
  const { data, isLoading } = useQuery({
    queryKey: ["schedule-seats", schedule?.id],
    queryFn: () => fetchSeats({ data: { scheduleId: schedule!.id } }),
    enabled: !!schedule,
  });
  useSeatAvailability(schedule?.id ?? null);

  if (!pickup) return <Navigate to="/shuttle/pickup" />;
  if (!schedule) return <Navigate to="/shuttle/schedule" />;

  const seats = data?.seats ?? [];
  const bookedSeatNos = useMemo(() => {
    const now = new Date();
    return seats
      .filter((s: any) => {
        if (s.status === "booked") return true;
        if (s.status === "held") {
          // If held by others (not in our current selection) and not expired
          if (!selectedSeatIds.includes(s.id)) {
             return s.hold_until && new Date(s.hold_until) > now;
          }
        }
        return false;
      })
      .map((s: any) => s.seat_no);
  }, [seats, selectedSeatIds]);
  
  const total = selectedSeats.length * schedule.price;

  const handleToggle = (seatNo: string) => {
    const seat = seats.find((s: any) => s.seat_no === seatNo);
    if (!seat) return;

    const isBooked = seat.status === "booked";
    const isHeldByOther = seat.status === "held" && !selectedSeatIds.includes(seat.id) && seat.hold_until && new Date(seat.hold_until) > new Date();

    if ((isBooked || isHeldByOther) && !selectedSeats.includes(seatNo)) {
      toast.info("Kursi tidak tersedia");
      return;
    }
    if (!selectedSeats.includes(seatNo) && selectedSeats.length >= MAX_SELECT) {
      toast.info(`Maksimal ${MAX_SELECT} kursi per pemesanan.`);
      return;
    }
    toggleSeat(seatNo, seat.id);
  };

  const handleContinue = async () => {
    try {
      setIsHolding(true);
      await holdSeatsFn({ data: { scheduleId: schedule.id, seatIds: selectedSeatIds } });
      nav({ to: "/shuttle/passenger" });
    } catch (err: any) {
      toast.error(err.message || "Gagal mengunci kursi. Silakan coba lagi.");
    } finally {
      setIsHolding(false);
    }
  };

  const vehicleType = data?.schedule?.vehicles?.type ?? "hiace";

  return (
    <div className="min-h-screen bg-secondary/40 pb-10">
      <PageHeader title="Pilih Kursi" subtitle={`${schedule.vehicleName} • ${schedule.departureTime}`} />
      <BookingStepper />

      <div className="mx-auto max-w-md p-5">
        {isLoading ? (
          <div className="space-y-6">
            <div className="rounded-3xl bg-card p-8 shadow-soft">
              <div className="mx-auto max-w-[240px] space-y-4">
                <div className="flex justify-between">
                  <Skeleton className="h-12 w-12 rounded-xl" />
                  <Skeleton className="h-12 w-12 rounded-xl" />
                </div>
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex justify-between">
                    <Skeleton className="h-12 w-12 rounded-xl" />
                    <Skeleton className="h-12 w-12 rounded-xl" />
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-3">
              <Skeleton className="h-10 w-full rounded-2xl" />
              <Skeleton className="h-12 w-full rounded-full" />
            </div>
          </div>
        ) : (
          <>
            <div className="rounded-3xl bg-card p-6 shadow-soft">
              <SeatPicker
                vehicle={vehicleType}
                booked={bookedSeatNos}
                selected={selectedSeats}
                onToggle={handleToggle}
              />
              
              <div className="mt-8 flex justify-center gap-6 border-t border-border pt-6">
                <Legend color="bg-secondary" label="Tersedia" />
                <Legend color="bg-primary" label="Pilihan" />
                <Legend color="bg-muted text-muted-foreground" label="Terisi" />
              </div>
            </div>

            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="mt-6 space-y-4">
              <div className="flex items-center justify-between rounded-2xl bg-primary/5 px-5 py-4 border border-primary/10">
                <div>
                  <div className="text-xs font-bold text-primary uppercase tracking-wider">Total Pembayaran</div>
                  <div className="text-xl font-extrabold text-primary">{formatRupiah(total)}</div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Kursi</div>
                  <div className="text-sm font-bold">{selectedSeats.length > 0 ? selectedSeats.join(", ") : "Belum pilih"}</div>
                </div>
              </div>

              <button
                disabled={selectedSeats.length === 0 || isHolding}
                onClick={handleContinue}
                className="flex w-full items-center justify-center gap-2 rounded-full bg-primary py-4 text-sm font-bold text-primary-foreground shadow-card transition-all active:scale-[0.98] disabled:opacity-50"
              >
                {isHolding ? <Loader2 className="h-4 w-4 animate-spin" /> : "Lanjutkan Pembayaran"}
              </button>
            </motion.div>
          </>
        )}
      </div>
    </div>
  );
}
