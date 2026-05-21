import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const checkIsDriver = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data } = await supabase.from("drivers").select("id").eq("id", userId).maybeSingle();
    return { isDriver: !!data };
  });

export const getMyDriverProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: driver } = await supabase
      .from("drivers")
      .select("id, status, rating, vehicle_id, license_no, vehicles(name, plate, type)")
      .eq("id", userId)
      .maybeSingle();
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, phone, avatar_url")
      .eq("id", userId)
      .maybeSingle();
    return { driver, profile };
  });

export const setDriverStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { status: "online" | "offline" }) =>
    z.object({ status: z.enum(["online", "offline"]) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase.from("drivers").update({ status: data.status }).eq("id", userId);
    if (error) throw error;
    return { success: true };
  });

export const listMyTripsToday = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: drv } = await supabase.from("drivers").select("vehicle_id").eq("id", userId).maybeSingle();
    if (!drv?.vehicle_id) return [];
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const { data, error } = await supabase
      .from("schedules")
      .select("*, vehicles(name, plate), pickup_points(name, address), routes(origin, destination)")
      .eq("vehicle_id", drv.vehicle_id)
      .gte("departure_at", startOfDay.toISOString())
      .order("departure_at");
    if (error) throw error;
    return data ?? [];
  });

export const getTripManifest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { scheduleId: string }) => z.object({ scheduleId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: schedule } = await supabase
      .from("schedules")
      .select("*, vehicles(name, plate, capacity), pickup_points(name, address), routes(origin, destination)")
      .eq("id", data.scheduleId)
      .single();
    const { data: bookings } = await supabase
      .from("bookings")
      .select("id, code, passenger_name, passenger_phone, status, user_id, total")
      .eq("schedule_id", data.scheduleId)
      .in("status", ["paid", "boarded"]);
    const bookingIds = (bookings ?? []).map((b) => b.id);
    const { data: seatBookings } = bookingIds.length
      ? await supabase
          .from("seat_bookings")
          .select("id, booking_id, seat_id, passenger_name, checked_in_at, seats(seat_no)")
          .in("booking_id", bookingIds)
      : { data: [] as any[] };
    return { schedule, bookings: bookings ?? [], seatBookings: seatBookings ?? [] };
  });

export const checkInSeatBooking = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { seatBookingId: string }) =>
    z.object({ seatBookingId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase
      .from("seat_bookings")
      .update({ checked_in_at: new Date().toISOString() })
      .eq("id", data.seatBookingId);
    if (error) throw error;
    return { success: true };
  });

export const checkInByCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { code: string; scheduleId: string }) =>
    z.object({ code: z.string().min(3).max(40), scheduleId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: booking } = await supabase
      .from("bookings")
      .select("id, schedule_id")
      .eq("code", data.code)
      .eq("schedule_id", data.scheduleId)
      .maybeSingle();
    if (!booking) throw new Error("Booking tidak ditemukan untuk trip ini");
    const { error } = await supabase
      .from("seat_bookings")
      .update({ checked_in_at: new Date().toISOString() })
      .eq("booking_id", booking.id);
    if (error) throw error;
    await supabase.from("bookings").update({ status: "boarded" }).eq("id", booking.id);
    return { success: true, bookingId: booking.id };
  });

export const setTripStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { scheduleId: string; status: "scheduled" | "ongoing" | "completed" | "cancelled" }) =>
    z
      .object({
        scheduleId: z.string().uuid(),
        status: z.enum(["scheduled", "ongoing", "completed", "cancelled"]),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase.from("schedules").update({ status: data.status }).eq("id", data.scheduleId);
    if (error) throw error;
    return { success: true };
  });

export const listRequestedRides = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { data, error } = await supabase
      .from("ride_orders")
      .select("*")
      .eq("status", "requested")
      .order("created_at", { ascending: false })
      .limit(20);
    if (error) throw error;
    return data ?? [];
  });

export const updateRideStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; status: "accepted" | "ongoing" | "completed" | "cancelled" }) =>
    z.object({ id: z.string().uuid(), status: z.enum(["accepted", "ongoing", "completed", "cancelled"]) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const patch = data.status === "accepted"
      ? { status: data.status, driver_id: userId }
      : { status: data.status };
    const { error } = await supabase.from("ride_orders").update(patch).eq("id", data.id);
    if (error) throw error;
    return { success: true };
  });

export const pushDriverLocation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { lat: number; lng: number; heading?: number; speed?: number }) =>
    z
      .object({
        lat: z.number().min(-90).max(90),
        lng: z.number().min(-180).max(180),
        heading: z.number().optional(),
        speed: z.number().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase.from("driver_locations").upsert(
      {
        driver_id: userId,
        lat: data.lat,
        lng: data.lng,
        heading: data.heading ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "driver_id" },
    );
    if (error) throw error;
    // also push vehicle location if assigned
    const { data: drv } = await supabase.from("drivers").select("vehicle_id").eq("id", userId).maybeSingle();
    if (drv?.vehicle_id) {
      await supabase.from("vehicle_locations").upsert(
        {
          vehicle_id: drv.vehicle_id,
          lat: data.lat,
          lng: data.lng,
          heading: data.heading ?? null,
          speed: data.speed ?? null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "vehicle_id" },
      );
    }
    return { success: true };
  });
