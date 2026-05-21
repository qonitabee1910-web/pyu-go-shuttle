import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const listOnlineDriversNearby = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { lat: number; lng: number; radiusKm?: number }) =>
    z.object({ lat: z.number(), lng: z.number(), radiusKm: z.number().optional().default(10) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;

    // Simple bounding box for radius (approximate)
    // 1 degree lat is ~111km
    // 1 degree lng is ~111km * cos(lat)
    const latDelta = data.radiusKm / 111;
    const lngDelta = data.radiusKm / (111 * Math.cos(data.lat * (Math.PI / 180)));

    const { data: locations, error: locError } = await supabase
      .from("driver_locations")
      .select("driver_id, lat, lng, updated_at")
      .gte("lat", data.lat - latDelta)
      .lte("lat", data.lat + latDelta)
      .gte("lng", data.lng - lngDelta)
      .lte("lng", data.lng + lngDelta)
      .order("updated_at", { ascending: false });

    if (locError) throw locError;

    // Get unique latest location per driver
    const latestLocations = new Map<string, any>();
    locations?.forEach(loc => {
      if (!latestLocations.has(loc.driver_id)) {
        latestLocations.set(loc.driver_id, loc);
      }
    });

    const driverIds = Array.from(latestLocations.keys());
    if (driverIds.length === 0) return [];

    const { data: drivers, error: drvError } = await supabase
      .from("drivers")
      .select("id, status, rating, vehicles(name, plate), profiles(full_name)")
      .in("id", driverIds)
      .eq("status", "online");

    if (drvError) throw drvError;

    return (drivers ?? []).map(d => {
      const loc = latestLocations.get(d.id);
      return {
        id: d.id,
        name: (d.profiles as any)?.full_name || "Driver",
        plate: (d.vehicles as any)?.plate || "—",
        vehicle: (d.vehicles as any)?.name || "—",
        rating: d.rating || 5,
        lat: loc.lat,
        lng: loc.lng,
      };
    });
  });
