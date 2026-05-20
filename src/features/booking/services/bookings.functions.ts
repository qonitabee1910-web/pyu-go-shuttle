import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

function genCode() {
  return "PYU" + Math.random().toString(36).slice(2, 8).toUpperCase();
}

export const createBooking = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: {
    scheduleId: string;
    seatIds: string[];
    passengerName: string;
    passengerPhone: string;
  }) =>
    z.object({
      scheduleId: z.string().uuid(),
      seatIds: z.array(z.string().uuid()).min(1).max(8),
      passengerName: z.string().min(1).max(120),
      passengerPhone: z.string().min(6).max(30),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // 1. Fetch schedule info
    const { data: schedule, error: sErr } = await supabase
      .from("schedules")
      .select("id, price")
      .eq("id", data.scheduleId)
      .single();
    if (sErr) throw sErr;

    // 2. Try to hold seats atomically
    const now = new Date();
    const holdUntil = new Date(now.getTime() + 10 * 60_000).toISOString();
    
    // Attempt to update seats that are either 'available' or have an expired hold
    const { data: updatedSeats, error: seatErr } = await (supabase as any)
      .from("seats")
      .update({ 
        status: "held", 
        hold_until: holdUntil, 
        updated_at: now.toISOString() 
      })
      .in("id", data.seatIds)
      .eq("schedule_id", data.scheduleId)
      .or(`status.eq.available,and(status.eq.held,hold_until.lt.${now.toISOString()})`)
      .select();

    if (seatErr) throw seatErr;
    if (!updatedSeats || updatedSeats.length !== data.seatIds.length) {
      throw new Error("Sebagian kursi sudah tidak tersedia. Silakan pilih kursi lain.");
    }

    const total = schedule.price * data.seatIds.length;
    const code = genCode();

    // 3. Create the booking
    const { data: booking, error: bErr } = await supabase
      .from("bookings")
      .insert({
        code,
        user_id: userId,
        schedule_id: data.scheduleId,
        status: "pending",
        total,
        passenger_name: data.passengerName,
        passenger_phone: data.passengerPhone,
      })
      .select()
      .single();

    if (bErr) {
      // Rollback: Release seats if booking creation fails
      await (supabase as any)
        .from("seats")
        .update({ status: "available", hold_until: null })
        .in("id", data.seatIds);
      throw bErr;
    }

    // 4. Link seats to booking
    const { error: linkErr } = await supabase.from("seat_bookings").insert(
      data.seatIds.map((sid) => ({
        booking_id: booking.id,
        seat_id: sid,
        passenger_name: data.passengerName,
      })),
    );

    if (linkErr) {
      // Note: In a real app, we might want more complex cleanup here
      throw linkErr;
    }

    return { bookingId: booking.id, code, total };
  });

export const listMyBookings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("bookings")
      .select("*, schedules(*, vehicles(*), pickup_points(*)), seat_bookings(*, seats(seat_no))")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  });

export const getBooking = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: b, error } = await supabase
      .from("bookings")
      .select("*, schedules(*, vehicles(*), pickup_points(*)), seat_bookings(*, seats(seat_no))")
      .eq("id", data.id)
      .single();
    if (error) throw error;
    return b;
  });
