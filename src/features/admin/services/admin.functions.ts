import { createServerFn } from "@tanstack/react-start";
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
