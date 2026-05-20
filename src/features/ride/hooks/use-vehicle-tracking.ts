import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface VehicleLocation {
  vehicle_id: string;
  lat: number;
  lng: number;
  speed: number;
  heading: number;
  updated_at: string;
}

export function useVehicleTracking(vehicleId: string | null | undefined) {
  const [location, setLocation] = useState<VehicleLocation | null>(null);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!vehicleId) return;

    // 1. Initial Fetch
    const fetchInitialLocation = async () => {
      const { data, error: fetchErr } = await (supabase as any)
        .from("vehicle_locations")
        .select("*")
        .eq("vehicle_id", vehicleId)
        .maybeSingle();
      
      if (fetchErr) {
        console.error("Error fetching initial location:", fetchErr);
        setError(new Error(fetchErr.message));
        return;
      }
      
      if (data) {
        setLocation(data as VehicleLocation);
      }
    };

    fetchInitialLocation();

    // 2. Realtime Subscription
    const channel = supabase
      .channel(`vehicle-tracking:${vehicleId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "vehicle_locations",
          filter: `vehicle_id=eq.${vehicleId}`,
        },
        (payload) => {
          setLocation(payload.new as VehicleLocation);
        }
      )
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR") {
          setError(new Error("Realtime connection failed"));
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [vehicleId]);

  return { location, error };
}
