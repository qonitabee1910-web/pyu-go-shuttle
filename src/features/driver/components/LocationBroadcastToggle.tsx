import { useEffect, useRef, useState } from "react";
import { Button } from "@/shared/components/ui/button";
import { Radio, RadioTower } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { pushDriverLocation } from "@/features/driver/services/driver.functions";
import { toast } from "sonner";

export function LocationBroadcastToggle() {
  const [on, setOn] = useState(false);
  const watchId = useRef<number | null>(null);
  const lastSent = useRef<number>(0);
  const push = useServerFn(pushDriverLocation);

  useEffect(() => {
    if (!on) {
      if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
      return;
    }
    if (!("geolocation" in navigator)) {
      toast.error("Geolocation tidak tersedia");
      setOn(false);
      return;
    }
    watchId.current = navigator.geolocation.watchPosition(
      (pos) => {
        const now = Date.now();
        if (now - lastSent.current < 5000) return;
        lastSent.current = now;
        push({
          data: {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            heading: pos.coords.heading ?? undefined,
            speed: pos.coords.speed ?? undefined,
          },
        }).catch(() => {});
      },
      (err) => {
        toast.error("Gagal mendapatkan lokasi: " + err.message);
        setOn(false);
      },
      { enableHighAccuracy: true, maximumAge: 3000, timeout: 10000 },
    );
    return () => {
      if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current);
    };
  }, [on, push]);

  return (
    <Button
      variant={on ? "default" : "outline"}
      size="sm"
      onClick={() => setOn((v) => !v)}
      className={on ? "bg-green-600 hover:bg-green-700" : ""}
    >
      {on ? <RadioTower className="mr-2 h-4 w-4 animate-pulse" /> : <Radio className="mr-2 h-4 w-4" />}
      {on ? "Broadcast ON" : "Broadcast OFF"}
    </Button>
  );
}
