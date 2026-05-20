import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const mockPayBooking = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { bookingId: string; method?: string }) =>
    z.object({ bookingId: z.string().uuid(), method: z.string().optional() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: booking, error: bErr } = await supabase
      .from("bookings")
      .select("id, user_id, total, status")
      .eq("id", data.bookingId)
      .single();
    if (bErr) throw bErr;
    if (booking.user_id !== userId) throw new Error("Forbidden");
    if (booking.status !== "pending") throw new Error("Booking tidak dapat dibayar");

    await new Promise((r) => setTimeout(r, 800));
    const success = Math.random() < 0.92;

    const { data: payment, error: pErr } = await supabase
      .from("payments")
      .insert({
        booking_id: booking.id,
        amount: booking.total,
        method: data.method ?? "mock",
        status: success ? "success" : "failed",
        paid_at: success ? new Date().toISOString() : null,
      })
      .select()
      .single();
    if (pErr) throw pErr;

    await supabase.from("transactions").insert({
      payment_id: payment.id,
      ref: "TXN" + Math.random().toString(36).slice(2, 10).toUpperCase(),
      payload: { method: data.method ?? "mock", success },
    });

    if (success) {
      await supabase.from("bookings").update({ status: "paid" }).eq("id", booking.id);
      const { data: sbs } = await supabase
        .from("seat_bookings")
        .select("seat_id")
        .eq("booking_id", booking.id);
      const seatIds = (sbs ?? []).map((s) => s.seat_id);
      if (seatIds.length > 0) {
        await supabase.from("seats").update({ status: "booked", hold_until: null }).in("id", seatIds);
      }
    }

    return { success, paymentId: payment.id };
  });
