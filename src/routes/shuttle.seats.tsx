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

import { holdSeats } from "@/features/shuttle/services/shuttle.functions";

export const Route = createFileRoute("/shuttle/seats")({
  head: () => ({ meta: [{ title: "Pilih Kursi — PYU-GO" }] }),
  component: SeatsPage,
});

const MAX_SELECT = 4;

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

  return (
    <div className="min-h-screen bg-secondary/40 pb-32">
      <PageHeader title="Pilih Kursi" subtitle={`${schedule.vehicleName} • ${schedule.departureTime}`} />
      <BookingStepper />

      <div className="mx-auto max-w-md p-5">
        {isLoading ? (
          <div className="flex items-center justify-center rounded-2xl bg-card p-10 text-sm text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Memuat kursi...
          </div>
        ) : (
          <SeatPicker
            vehicle={schedule.vehicleType}
            booked={bookedSeatNos}
            selected={selectedSeats}
            onToggle={handleToggle}
            maxSelect={MAX_SELECT}
          />
        )}
      </div>

      <motion.div initial={{ y: 80 }} animate={{ y: 0 }} className="fixed bottom-0 left-1/2 z-40 w-full max-w-md -translate-x-1/2 border-t border-border bg-card/95 px-5 py-3 backdrop-blur shadow-float">
        <div className="mb-2 flex items-center justify-between text-xs">
          <span className="text-muted-foreground">{selectedSeats.length} kursi dipilih</span>
          <span className="text-base font-extrabold text-primary">{formatRupiah(total)}</span>
        </div>
        <button 
          onClick={handleContinue} 
          disabled={selectedSeats.length === 0 || isHolding}
          className="w-full flex items-center justify-center rounded-full bg-primary py-3.5 text-sm font-bold text-primary-foreground shadow-card disabled:opacity-50"
        >
          {isHolding ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Lanjut Data Penumpang
        </button>
      </motion.div>
    </div>
  );
}
