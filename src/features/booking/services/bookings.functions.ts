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

    // Fetch price + check seat availability
    const [{ data: schedule, error: sErr }, { data: seats, error: seatErr }] =
      await Promise.all([
        supabase.from("schedules").select("id, price").eq("id", data.scheduleId).single(),
        supabase.from("seats").select("id, status").in("id", data.seatIds),
      ]);
    if (sErr) throw sErr;
    if (seatErr) throw seatErr;
    if (!seats || seats.length !== data.seatIds.length) {
      throw new Error("Sebagian kursi tidak ditemukan");
    }
    const taken = seats.find((s) => s.status !== "available");
    if (taken) throw new Error("Kursi sudah dipesan, silakan pilih kursi lain");

    const total = schedule.price * data.seatIds.length;
    const code = genCode();

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
    if (bErr) throw bErr;

    const { error: linkErr } = await supabase.from("seat_bookings").insert(
      data.seatIds.map((sid) => ({
        booking_id: booking.id,
        seat_id: sid,
        passenger_name: data.passengerName,
      })),
    );
    if (linkErr) throw linkErr;

    // Hold seats
    await supabase
      .from("seats")
      .update({ status: "held", hold_until: new Date(Date.now() + 10 * 60_000).toISOString() })
      .in("id", data.seatIds);

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
