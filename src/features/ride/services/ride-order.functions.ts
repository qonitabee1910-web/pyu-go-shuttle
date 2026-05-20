import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const LatLng = z.object({ lat: z.number(), lng: z.number(), address: z.string().optional() });

export const createRideOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { pickup: { lat: number; lng: number; address?: string }; dropoff: { lat: number; lng: number; address?: string }; tier: string; fare: number; etaMin?: number }) =>
    z.object({
      pickup: LatLng,
      dropoff: LatLng,
      tier: z.string().min(1).max(20),
      fare: z.number().int().positive(),
      etaMin: z.number().int().positive().max(120).optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row, error } = await supabase
      .from("ride_orders")
      .insert({
        user_id: userId,
        pickup: { ...data.pickup, tier: data.tier },
        dropoff: data.dropoff,
        fare: data.fare,
        eta_min: data.etaMin ?? null,
        status: "requested",
      })
      .select("id")
      .single();
    if (error) throw error;
    return { id: row.id };
  });

export const cancelRideOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("ride_orders")
      .update({ status: "cancelled" })
      .eq("id", data.id)
      .eq("user_id", userId);
    if (error) throw error;
    return { success: true };
  });

export const getRideOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: order, error } = await supabase
      .from("ride_orders")
      .select("*")
      .eq("id", data.id)
      .single();
    if (error) throw error;

    let driverProfile: { full_name: string | null; phone: string | null } | null = null;
    let driverInfo: { rating: number; vehicle_id: string | null } | null = null;
    if (order.driver_id) {
      const [{ data: p }, { data: d }] = await Promise.all([
        supabase.from("profiles").select("full_name, phone").eq("id", order.driver_id).maybeSingle(),
        supabase.from("drivers").select("rating, vehicle_id").eq("id", order.driver_id).maybeSingle(),
      ]);
      driverProfile = p ?? null;
      driverInfo = d ?? null;
    }
    return { order, driverProfile, driverInfo };
  });
