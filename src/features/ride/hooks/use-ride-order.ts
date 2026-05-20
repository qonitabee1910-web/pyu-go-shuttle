import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useRideOrderRealtime(orderId: string | null | undefined) {
  const qc = useQueryClient();
  const [driverLoc, setDriverLoc] = useState<{ lat: number; lng: number; heading?: number } | null>(null);
  const [driverId, setDriverId] = useState<string | null>(null);

  useEffect(() => {
    if (!orderId) return;
    const ch = supabase
      .channel(`ride-order:${orderId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "ride_orders", filter: `id=eq.${orderId}` },
        (payload) => {
          qc.invalidateQueries({ queryKey: ["ride-order", orderId] });
          const nd = (payload.new as any)?.driver_id ?? null;
          if (nd) setDriverId(nd);
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [orderId, qc]);

  useEffect(() => {
    if (!driverId) return;
    (async () => {
      const { data } = await (supabase as any)
        .from("driver_locations")
        .select("lat,lng,heading")
        .eq("driver_id", driverId)
        .maybeSingle();
      if (data) setDriverLoc({ lat: Number(data.lat), lng: Number(data.lng), heading: data.heading ?? undefined });
    })();
    const ch = supabase
      .channel(`driver-loc:${driverId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "driver_locations", filter: `driver_id=eq.${driverId}` },
        (payload) => {
          const n: any = payload.new;
          if (n) setDriverLoc({ lat: Number(n.lat), lng: Number(n.lng), heading: n.heading ?? undefined });
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [driverId]);

  return { driverLoc, driverId };
}
