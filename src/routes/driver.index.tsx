import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { Switch } from "@/shared/components/ui/switch";
import {
  getMyDriverProfile,
  setDriverStatus,
  listMyTripsToday,
  listRequestedRides,
} from "@/features/driver/services/driver.functions";
import { LocationBroadcastToggle } from "@/features/driver/components/LocationBroadcastToggle";
import { supabase } from "@/integrations/supabase/client";
import { formatRupiah } from "@/shared/utils/utils";
import { Calendar, MapPin, ArrowRight } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/driver/")({
  component: DriverHome,
});

function DriverHome() {
  const qc = useQueryClient();
  const getProfile = useServerFn(getMyDriverProfile);
  const setStatus = useServerFn(setDriverStatus);
  const getTrips = useServerFn(listMyTripsToday);
  const getRides = useServerFn(listRequestedRides);

  const { data: me } = useQuery({ queryKey: ["driver-me"], queryFn: () => getProfile() });
  const { data: trips = [] } = useQuery({ queryKey: ["driver-trips-today"], queryFn: () => getTrips() });
  const { data: rides = [] } = useQuery({
    queryKey: ["driver-requested-rides"],
    queryFn: () => getRides(),
    refetchInterval: 10000,
  });

  useEffect(() => {
    const ch = supabase
      .channel("driver-rides")
      .on("postgres_changes", { event: "*", schema: "public", table: "ride_orders" }, () => {
        qc.invalidateQueries({ queryKey: ["driver-requested-rides"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [qc]);

  const online = me?.driver?.status === "online";

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="flex items-center gap-3 p-4">
          <div className="h-12 w-12 rounded-full bg-primary/15 text-primary grid place-items-center font-bold">
            {(me?.profile?.full_name ?? "D").slice(0, 1)}
          </div>
          <div className="flex-1">
            <div className="font-semibold">{me?.profile?.full_name ?? "Driver"}</div>
            <div className="text-xs text-muted-foreground">
              {me?.driver?.vehicles?.name ?? "—"} · {me?.driver?.vehicles?.plate ?? "—"} · ⭐ {me?.driver?.rating ?? 5}
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <Badge className={online ? "bg-green-600" : "bg-muted text-muted-foreground"}>
              {online ? "Online" : "Offline"}
            </Badge>
            <Switch
              checked={online}
              onCheckedChange={async (v) => {
                await setStatus({ data: { status: v ? "online" : "offline" } });
                toast.success(v ? "Anda sekarang ONLINE" : "Anda OFFLINE");
                qc.invalidateQueries({ queryKey: ["driver-me"] });
              }}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <LocationBroadcastToggle />
      </div>

      <section>
        <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold"><Calendar className="h-4 w-4" /> Trip hari ini</h2>
        {trips.length === 0 ? (
          <Card><CardContent className="p-4 text-sm text-muted-foreground">Belum ada trip hari ini.</CardContent></Card>
        ) : (
          <div className="space-y-2">
            {trips.map((t: any) => (
              <Link key={t.id} to="/driver/trips/$scheduleId" params={{ scheduleId: t.id }}>
                <Card className="hover:bg-accent/30 transition-colors">
                  <CardContent className="flex items-center gap-3 p-4">
                    <div className="flex-1">
                      <div className="text-sm font-semibold">
                        {t.routes?.origin ?? "—"} → {t.routes?.destination ?? "—"}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(t.departure_at).toLocaleString("id-ID")} · {t.pickup_points?.name}
                      </div>
                    </div>
                    <Badge variant="outline">{t.status}</Badge>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold"><MapPin className="h-4 w-4" /> Ride masuk</h2>
        {!online ? (
          <Card><CardContent className="p-4 text-sm text-muted-foreground">Aktifkan ONLINE untuk menerima request ride.</CardContent></Card>
        ) : rides.length === 0 ? (
          <Card><CardContent className="p-4 text-sm text-muted-foreground">Belum ada request masuk.</CardContent></Card>
        ) : (
          <div className="space-y-2">
            {rides.map((r: any) => (
              <Link key={r.id} to="/driver/rides/$id" params={{ id: r.id }}>
                <Card className="hover:bg-accent/30">
                  <CardContent className="flex items-center gap-3 p-4">
                    <div className="flex-1">
                      <div className="text-sm font-semibold">{r.pickup?.address ?? "Pickup"} → {r.dropoff?.address ?? "Dropoff"}</div>
                      <div className="text-xs text-muted-foreground">{formatRupiah(r.fare)} · {new Date(r.created_at).toLocaleTimeString("id-ID")}</div>
                    </div>
                    <Button size="sm">Lihat</Button>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
