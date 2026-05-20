import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { PickupPoint, Schedule, VehicleTier } from "@/shared/types/mock-data";

interface BookingState {
  pickup: PickupPoint | null;
  tier: VehicleTier | null;
  date: string | null;
  schedule: Schedule | null;
  selectedSeats: string[]; // seat_no strings
  selectedSeatIds: string[]; // db UUIDs
  passengerName: string;
  passengerPhone: string;
  bookingId: string | null;
  bookingCode: string | null;
  paymentTotal: number | null;
  promoCode: string | null;
  setPickup: (p: PickupPoint) => void;
  setTier: (t: VehicleTier) => void;
  setDate: (d: string) => void;
  setSchedule: (s: Schedule) => void;
  toggleSeat: (seatNo: string, seatId: string) => void;
  setPassenger: (name: string, phone: string) => void;
  setBooking: (id: string, code: string) => void;
  setPayment: (total: number, promo: string | null) => void;
  reset: () => void;
}

export const useBooking = create<BookingState>((set) => ({
  pickup: null,
  tier: null,
  date: null,
  schedule: null,
  selectedSeats: [],
  selectedSeatIds: [],
  passengerName: "",
  passengerPhone: "",
  bookingId: null,
  bookingCode: null,
  paymentTotal: null,
  promoCode: null,
  setPickup: (p) => set({ pickup: p }),
  setTier: (t) => set({ tier: t }),
  setDate: (d) => set({ date: d }),
  setSchedule: (s) => set({ schedule: s, selectedSeats: [], selectedSeatIds: [] }),
  toggleSeat: (seatNo, seatId) =>
    set((st) => {
      const has = st.selectedSeats.includes(seatNo);
      return {
        selectedSeats: has ? st.selectedSeats.filter((x) => x !== seatNo) : [...st.selectedSeats, seatNo],
        selectedSeatIds: has ? st.selectedSeatIds.filter((x) => x !== seatId) : [...st.selectedSeatIds, seatId],
      };
    }),
  setPassenger: (name, phone) => set({ passengerName: name, passengerPhone: phone }),
  setBooking: (id, code) => set({ bookingId: id, bookingCode: code }),
  setPayment: (total, promo) => set({ paymentTotal: total, promoCode: promo }),
  reset: () =>
    set({
      pickup: null,
      tier: null,
      date: null,
      schedule: null,
      selectedSeats: [],
      selectedSeatIds: [],
      bookingId: null,
      bookingCode: null,
      paymentTotal: null,
      promoCode: null,
    }),
}));
