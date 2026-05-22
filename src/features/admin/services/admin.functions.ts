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
      .select("*, seat_bookings(*), schedules(*, vehicles(*), pickup_points(*))")
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

// ============ Pickup Points CRUD ============

export const adminUpsertPickupPoint = createServerFn({ method: "POST" })
  .middleware([requireAdminAuth])
  .inputValidator((d: any) => 
    z.object({
      id: z.string().uuid().optional(),
      name: z.string().min(1),
      rayon: z.string().min(1),
      address: z.string().min(1),
      lat: z.number(),
      lng: z.number(),
      city: z.string().optional(),
      distance_km: z.number().optional(),
      eta_min: z.number().optional(),
      image_url: z.string().optional(),
      active: z.boolean().optional(),
    }).parse(d)
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase.from("pickup_points").upsert({
      id: data.id || undefined,
      name: data.name,
      rayon: data.rayon,
      address: data.address,
      lat: data.lat,
      lng: data.lng,
      city: data.city || null,
      distance_km: data.distance_km || 0,
      eta_min: data.eta_min || 0,
      image_url: data.image_url || null,
      active: data.active ?? true,
    });
    if (error) throw error;
    return { success: true };
  });

export const adminDeletePickupPoint = createServerFn({ method: "POST" })
  .middleware([requireAdminAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase.from("pickup_points").delete().eq("id", data.id);
    if (error) throw error;
    return { success: true };
  });

// ============ Vehicles CRUD ============

export const adminUpsertVehicle = createServerFn({ method: "POST" })
  .middleware([requireAdminAuth])
  .inputValidator((d: any) =>
    z.object({
      id: z.string().uuid().optional(),
      name: z.string().min(1),
      plate: z.string().min(1),
      type: z.enum(["minicar", "suv", "hiace"]),
      tier: z.enum(["Reguler", "SemiExecutive", "Executive"]),
      status: z.enum(["active", "maintenance", "offline"]).optional(),
      capacity: z.number().int().positive().optional(),
      image_url: z.string().optional(),
      seat_layout: z.any().optional(),
    }).parse(d)
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const defaultCapacity = data.type === "hiace" ? 12 : data.type === "suv" ? 7 : 6;
    const row: any = {
      name: data.name,
      plate: data.plate,
      type: data.type,
      tier: data.tier,
      status: data.status ?? "active",
      capacity: data.capacity ?? defaultCapacity,
      image_url: data.image_url ?? null,
      seat_layout: data.seat_layout ?? {},
    };
    if (data.id) row.id = data.id;
    const { error } = await supabase.from("vehicles").upsert(row);
    if (error) throw error;
    return { success: true };
  });


export const adminDeleteVehicle = createServerFn({ method: "POST" })
  .middleware([requireAdminAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase.from("vehicles").delete().eq("id", data.id);
    if (error) throw error;
    return { success: true };
  });

export const adminSetVehicleStatus = createServerFn({ method: "POST" })
  .middleware([requireAdminAuth])
  .inputValidator((d: { id: string, status: string }) => 
    z.object({ id: z.string().uuid(), status: z.string() }).parse(d)
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase.from("vehicles").update({ status: data.status as any }).eq("id", data.id);
    if (error) throw error;
    return { success: true };
  });

export const adminSetVehiclePlate = createServerFn({ method: "POST" })
  .middleware([requireAdminAuth])
  .inputValidator((d: { id: string, plate: string }) => 
    z.object({ id: z.string().uuid(), plate: z.string() }).parse(d)
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase.from("vehicles").update({ plate: data.plate }).eq("id", data.id);
    if (error) throw error;
    return { success: true };
  });

// ============ Schedules CRUD ============

export const adminUpsertSchedule = createServerFn({ method: "POST" })
  .middleware([requireAdminAuth])
  .inputValidator((d: any) =>
    z.object({
      id: z.string().uuid().optional(),
      pickup_point_id: z.string().uuid(),
      vehicle_id: z.string().uuid(),
      route_id: z.string().uuid().optional(),
      departure_at: z.string(),
      arrival_at: z.string().optional(),
      price: z.number().nonnegative(),
      seats_total: z.number().int().positive().optional(),
      tier: z.enum(["Reguler", "SemiExecutive", "Executive"]).optional(),
      active: z.boolean().optional(),
    }).parse(d)
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    // Resolve defaults from related rows when not provided.
    let routeId = data.route_id ?? null;
    let seatsTotal = data.seats_total ?? null;
    let tier = data.tier ?? null;
    if (!routeId) {
      const { data: r } = await supabase.from("routes").select("id").eq("active", true).limit(1).maybeSingle();
      if (r) routeId = r.id;
    }
    if (!seatsTotal || !tier) {
      const { data: v } = await supabase
        .from("vehicles").select("capacity, tier").eq("id", data.vehicle_id).maybeSingle();
      if (v) {
        seatsTotal = seatsTotal ?? v.capacity;
        tier = tier ?? (v.tier as any);
      }
    }
    if (!routeId) throw new Error("Tidak ada rute aktif. Tambahkan rute terlebih dulu.");
    const row: any = {
      pickup_point_id: data.pickup_point_id,
      vehicle_id: data.vehicle_id,
      route_id: routeId,
      departure_at: data.departure_at,
      arrival_at: data.arrival_at ?? null,
      price: data.price,
      seats_total: seatsTotal ?? 6,
      tier: tier ?? "Reguler",
      active: data.active ?? true,
    };
    if (data.id) row.id = data.id;
    const { error } = await supabase.from("schedules").upsert(row);
    if (error) throw error;
    return { success: true };
  });


export const adminDeleteSchedule = createServerFn({ method: "POST" })
  .middleware([requireAdminAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase.from("schedules").delete().eq("id", data.id);
    if (error) throw error;
    return { success: true };
  });

export const adminToggleScheduleActive = createServerFn({ method: "POST" })
  .middleware([requireAdminAuth])
  .inputValidator((d: { id: string, active: boolean }) => 
    z.object({ id: z.string().uuid(), active: z.boolean() }).parse(d)
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase.from("schedules").update({ active: data.active }).eq("id", data.id);
    if (error) throw error;
    return { success: true };
  });

// ============ Bookings Management ============

export const adminSetBookingStatus = createServerFn({ method: "POST" })
  .middleware([requireAdminAuth])
  .inputValidator((d: { id: string, status: string, note?: string }) => 
    z.object({ id: z.string().uuid(), status: z.string(), note: z.string().optional() }).parse(d)
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase.from("bookings").update({ 
      status: data.status as any,
      note: data.note || undefined
    }).eq("id", data.id);
    if (error) throw error;
    return { success: true };
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
        .eq("status", "success")
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
      .eq("status", "success")
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
