import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth, requireAdminAuth } from "@/integrations/supabase/auth-middleware";

export const checkIsAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();
    return { isAdmin: !!data };
  });

export const adminListBookings = createServerFn({ method: "GET" })
  .middleware([requireAdminAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { data, error } = await supabase
      .from("bookings")
      .select("*, schedules(*, vehicles(*), pickup_points(*))")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw error;
    return data ?? [];
  });

export const adminListSchedules = createServerFn({ method: "GET" })
  .middleware([requireAdminAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { data, error } = await supabase
      .from("schedules")
      .select("*, vehicles(*), pickup_points(*)")
      .order("departure_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  });

export const adminListVehicles = createServerFn({ method: "GET" })
  .middleware([requireAdminAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { data, error } = await supabase.from("vehicles").select("*").order("name");
    if (error) throw error;
    return data ?? [];
  });

export const adminListPickupPoints = createServerFn({ method: "GET" })
  .middleware([requireAdminAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { data, error } = await supabase.from("pickup_points").select("*").order("name");
    if (error) throw error;
    return data ?? [];
  });

// ============ KPI / Analytics ============

export const adminKpis = createServerFn({ method: "GET" })
  .middleware([requireAdminAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const [bookingsToday, revMonth, ongoing, onlineDrv] = await Promise.all([
      supabase
        .from("bookings")
        .select("id", { count: "exact", head: true })
        .gte("created_at", startOfDay.toISOString()),
      supabase
        .from("payments")
        .select("amount")
        .eq("status", "paid")
        .gte("paid_at", startOfMonth.toISOString()),
      supabase
        .from("schedules")
        .select("id", { count: "exact", head: true })
        .eq("status", "ongoing"),
      supabase.from("drivers").select("id", { count: "exact", head: true }).eq("status", "online"),
    ]);

    const revenue = (revMonth.data ?? []).reduce((s, p) => s + (p.amount ?? 0), 0);
    return {
      bookingsToday: bookingsToday.count ?? 0,
      revenueMonth: revenue,
      tripsOngoing: ongoing.count ?? 0,
      driversOnline: onlineDrv.count ?? 0,
    };
  });

export const adminRevenueSeries = createServerFn({ method: "POST" })
  .middleware([requireAdminAuth])
  .inputValidator((d: { days?: number }) => z.object({ days: z.number().int().min(1).max(180).default(30) }).parse(d ?? {}))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const days = data.days;
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - days + 1);

    const { data: rows } = await supabase
      .from("payments")
      .select("amount, paid_at, status")
      .eq("status", "paid")
      .gte("paid_at", start.toISOString());

    const buckets = new Map<string, number>();
    for (let i = 0; i < days; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      buckets.set(d.toISOString().slice(0, 10), 0);
    }
    (rows ?? []).forEach((r) => {
      if (!r.paid_at) return;
      const k = new Date(r.paid_at).toISOString().slice(0, 10);
      buckets.set(k, (buckets.get(k) ?? 0) + (r.amount ?? 0));
    });
    return Array.from(buckets.entries()).map(([date, total]) => ({ date, total }));
  });

export const adminActiveBookings = createServerFn({ method: "GET" })
  .middleware([requireAdminAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { data } = await supabase
      .from("bookings")
      .select("id, code, passenger_name, total, status, created_at, schedules(departure_at, routes(origin, destination))")
      .in("status", ["pending", "paid", "boarded"])
      .order("created_at", { ascending: false })
      .limit(10);
    return data ?? [];
  });

export const adminSeatOccupancy = createServerFn({ method: "GET" })
  .middleware([requireAdminAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { data: schedules } = await supabase
      .from("schedules")
      .select("id, departure_at, seats_total, routes(origin, destination)")
      .order("departure_at", { ascending: false })
      .limit(20);
    const ids = (schedules ?? []).map((s) => s.id);
    if (ids.length === 0) return [];
    const { data: seats } = await supabase
      .from("seats")
      .select("schedule_id, status")
      .in("schedule_id", ids);
    const counts = new Map<string, { booked: number; total: number }>();
    (seats ?? []).forEach((s) => {
      const c = counts.get(s.schedule_id) ?? { booked: 0, total: 0 };
      c.total += 1;
      if (s.status === "booked" || s.status === "held") c.booked += 1;
      counts.set(s.schedule_id, c);
    });
    return (schedules ?? []).map((s) => {
      const c = counts.get(s.id) ?? { booked: 0, total: s.seats_total ?? 0 };
      const pct = c.total ? Math.round((c.booked / c.total) * 100) : 0;
      return {
        id: s.id,
        label: `${s.routes?.origin ?? "—"} → ${s.routes?.destination ?? "—"}`,
        when: s.departure_at,
        booked: c.booked,
        total: c.total,
        pct,
      };
    });
  });

export const adminRidePoints = createServerFn({ method: "POST" })
  .middleware([requireAdminAuth])
  .inputValidator((d: { days?: number }) => z.object({ days: z.number().int().min(1).max(180).default(30) }).parse(d ?? {}))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const since = new Date();
    since.setDate(since.getDate() - data.days);
    const { data: rows } = await supabase
      .from("ride_orders")
      .select("pickup, created_at")
      .gte("created_at", since.toISOString())
      .limit(1000);
    return (rows ?? [])
      .map((r) => r.pickup as any)
      .filter((p) => p && typeof p.lat === "number" && typeof p.lng === "number")
      .map((p) => ({ lat: p.lat as number, lng: p.lng as number }));
  });

// ============ Drivers CRUD ============

export const adminListDrivers = createServerFn({ method: "GET" })
  .middleware([requireAdminAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { data: drivers } = await supabase
      .from("drivers")
      .select("id, status, rating, vehicle_id, license_no, vehicles(name, plate)")
      .order("created_at", { ascending: false });
    const ids = (drivers ?? []).map((d) => d.id);
    const { data: profiles } = ids.length
      ? await supabase.from("profiles").select("id, full_name, phone").in("id", ids)
      : { data: [] as any[] };
    const map = new Map((profiles ?? []).map((p) => [p.id, p]));
    return (drivers ?? []).map((d) => ({ ...d, profile: map.get(d.id) ?? null }));
  });

export const adminUpsertDriver = createServerFn({ method: "POST" })
  .middleware([requireAdminAuth])
  .inputValidator((d: { id: string; vehicleId?: string | null; licenseNo?: string; status?: string; rating?: number }) =>
    z
      .object({
        id: z.string().uuid(),
        vehicleId: z.string().uuid().nullable().optional(),
        licenseNo: z.string().max(40).optional(),
        status: z.enum(["online", "offline", "busy"]).optional(),
        rating: z.number().min(0).max(5).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase.from("drivers").upsert({
      id: data.id,
      vehicle_id: data.vehicleId ?? null,
      license_no: data.licenseNo ?? null,
      status: data.status ?? "offline",
      rating: data.rating ?? 5,
    });
    if (error) throw error;
    // ensure driver role
    await supabase.from("user_roles").upsert({ user_id: data.id, role: "driver" as any }, { onConflict: "user_id,role" });
    return { success: true };
  });

export const adminDeleteDriver = createServerFn({ method: "POST" })
  .middleware([requireAdminAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase.from("drivers").delete().eq("id", data.id);
    if (error) throw error;
    return { success: true };
  });

export const adminListUsers = createServerFn({ method: "GET" })
  .middleware([requireAdminAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { data } = await supabase.from("profiles").select("id, full_name, phone").order("full_name");
    return data ?? [];
  });

// ============ Routes CRUD ============

export const adminListRoutes = createServerFn({ method: "GET" })
  .middleware([requireAdminAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { data, error } = await supabase.from("routes").select("*").order("origin");
    if (error) throw error;
    return data ?? [];
  });

export const adminUpsertRoute = createServerFn({ method: "POST" })
  .middleware([requireAdminAuth])
  .inputValidator((d: { id?: string; origin: string; destination: string; distance_km?: number; active?: boolean }) =>
    z
      .object({
        id: z.string().uuid().optional(),
        origin: z.string().min(1).max(120),
        destination: z.string().min(1).max(120),
        distance_km: z.number().nonnegative().optional(),
        active: z.boolean().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const payload: any = {
      origin: data.origin,
      destination: data.destination,
      distance_km: data.distance_km ?? null,
      active: data.active ?? true,
    };
    if (data.id) payload.id = data.id;
    const { error } = await supabase.from("routes").upsert(payload);
    if (error) throw error;
    return { success: true };
  });

export const adminDeleteRoute = createServerFn({ method: "POST" })
  .middleware([requireAdminAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase.from("routes").delete().eq("id", data.id);
    if (error) throw error;
    return { success: true };
  });
