import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const listPickupPoints = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { data, error } = await supabase
      .from("pickup_points")
      .select("*")
      .eq("active", true)
      .order("name");
    if (error) throw error;
    return data ?? [];
  });

export const listPublicPickupPoints = createServerFn({ method: "GET" })
  .handler(async () => {
    // For public calls, we need a service role or a client with anon key
    // Since this is a server function, we can use env vars
    const { createClient } = await import("@supabase/supabase-js");
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_PUBLISHABLE_KEY!
    );
    const { data, error } = await supabase
      .from("pickup_points")
      .select("*")
      .eq("active", true)
      .order("name");
    if (error) throw error;
    return data ?? [];
  });

export const listHomePageData = createServerFn({ method: "GET" })
  .handler(async () => {
    const { createClient } = await import("@supabase/supabase-js");
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_PUBLISHABLE_KEY!
    );
    
    // 1. Get all active pickup points (limit 8 for the grid)
    const { data: pickups } = await supabase
      .from("pickup_points")
      .select("*")
      .eq("active", true)
      .order("name")
      .limit(8);

    // 2. Get popular routes (logic: top bookings in last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: recentBookings } = await supabase
      .from("bookings")
      .select("schedules(pickup_point_id)")
      .gte("created_at", thirtyDaysAgo.toISOString())
      .limit(1000);

    const counts = new Map<string, number>();
    (recentBookings ?? []).forEach((b: any) => {
      const pid = b.schedules?.pickup_point_id;
      if (pid) counts.set(pid, (counts.get(pid) ?? 0) + 1);
    });

    const sortedPids = Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(e => e[0]);

    // Fallback to first 4 pickups if no bookings
    const popularPids = sortedPids.length >= 4 
      ? sortedPids 
      : (pickups ?? []).slice(0, 4).map(p => p.id);

    const [popularPoints, minPrices] = await Promise.all([
      supabase.from("pickup_points").select("*").in("id", popularPids),
      supabase.from("schedules").select("pickup_point_id, price").in("pickup_point_id", popularPids).eq("active", true)
    ]);

    const priceMap = new Map<string, number>();
    (minPrices.data ?? []).forEach(s => {
      const cur = priceMap.get(s.pickup_point_id) ?? Infinity;
      if (s.price < cur) priceMap.set(s.pickup_point_id, s.price);
    });

    const popularRoutes = (popularPoints.data ?? [])
      .sort((a, b) => popularPids.indexOf(a.id) - popularPids.indexOf(b.id))
      .map(p => ({
        id: p.id,
        from: p.name,
        to: "KNO Airport",
        price: priceMap.get(p.id) || 150000,
        duration: p.eta_min ? `${Math.floor(p.eta_min / 60)}j ${p.eta_min % 60}m` : "1j 30m"
      }));

    return {
      pickups: pickups ?? [],
      popularRoutes
    };
  });

export const getPickupPoint = createServerFn({ method: "GET" })
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data: input }) => {
    const { createClient } = await import("@supabase/supabase-js");
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_PUBLISHABLE_KEY!
    );
    const { data, error } = await supabase
      .from("pickup_points")
      .select("*")
      .eq("id", input.id)
      .single();
    if (error) throw error;
    return data;
  });

export const getTierSummary = createServerFn({ method: "GET" })
  .inputValidator((d: { pickupId: string }) => z.object({ pickupId: z.string().uuid() }).parse(d))
  .handler(async ({ data: input }) => {
    const { createClient } = await import("@supabase/supabase-js");
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_PUBLISHABLE_KEY!
    );
    
    const { data: schedules, error } = await supabase
      .from("schedules")
      .select("*, vehicles(tier)")
      .eq("pickup_point_id", input.pickupId)
      .eq("active", true);

    if (error) throw error;

    const summary: Record<string, { min: number; max: number; count: number; earliest: string | null }> = {
      Reguler: { min: 0, max: 0, count: 0, earliest: null },
      SemiExecutive: { min: 0, max: 0, count: 0, earliest: null },
      Executive: { min: 0, max: 0, count: 0, earliest: null },
    };

    schedules?.forEach(s => {
      const tier = s.vehicles?.tier;
      if (tier && summary[tier]) {
        const item = summary[tier];
        item.count++;
        if (item.min === 0 || s.price < item.min) item.min = s.price;
        if (s.price > item.max) item.max = s.price;
        
        const depTime = s.departure_at.split("T")[1].substring(0, 5);
        if (!item.earliest || depTime < item.earliest) item.earliest = depTime;
      }
    });

    return summary;
  });

export const listSchedules = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { pickupPointId: string; date: string }) =>
    z.object({ pickupPointId: z.string().uuid(), date: z.string() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const dayStart = new Date(`${data.date}T00:00:00+07:00`).toISOString();
    const dayEnd = new Date(`${data.date}T23:59:59+07:00`).toISOString();
    const { data: rows, error } = await supabase
      .from("schedules")
      .select("*, vehicles(*)")
      .eq("pickup_point_id", data.pickupPointId)
      .eq("active", true)
      .gte("departure_at", dayStart)
      .lte("departure_at", dayEnd)
      .order("departure_at");
    if (error) throw error;
    return rows ?? [];
  });

export const getScheduleSeats = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { scheduleId: string }) =>
    z.object({ scheduleId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const [schedRes, seatsRes] = await Promise.all([
      supabase
        .from("schedules")
        .select("*, vehicles(*), pickup_points(*)")
        .eq("id", data.scheduleId)
        .single(),
      supabase
        .from("seats")
        .select("*")
        .eq("schedule_id", data.scheduleId)
        .order("seat_no"),
    ]);
    if (schedRes.error) throw schedRes.error;
    if (seatsRes.error) throw seatsRes.error;
    return { schedule: schedRes.data, seats: seatsRes.data ?? [] };
  });

export const holdSeats = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { scheduleId: string; seatIds: string[] }) =>
    z.object({ scheduleId: z.string().uuid(), seatIds: z.array(z.string().uuid()) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const now = new Date().toISOString();
    const holdUntil = new Date(Date.now() + 5 * 60_000).toISOString();
    const { data: updated, error } = await (supabase as any)
      .from("seats")
      .update({ status: "held", hold_until: holdUntil, updated_at: now })
      .in("id", data.seatIds)
      .eq("schedule_id", data.scheduleId)
      .or(`status.eq.available,and(status.eq.held,hold_until.lt.${now})`)
      .select();
    if (error) throw error;
    if (!updated || updated.length !== data.seatIds.length) {
      throw new Error("Sebagian kursi sudah tidak tersedia. Silakan pilih kursi lain.");
    }
    return { success: true, holdUntil };
  });

export const releaseSeats = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { scheduleId: string; seatIds: string[] }) =>
    z.object({ scheduleId: z.string().uuid(), seatIds: z.array(z.string().uuid()) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await (supabase as any)
      .from("seats")
      .update({ status: "available", hold_until: null, updated_at: new Date().toISOString() })
      .in("id", data.seatIds)
      .eq("schedule_id", data.scheduleId)
      .eq("status", "held");
    if (error) throw error;
    return { success: true };
  });
