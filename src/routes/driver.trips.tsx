import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { listMyTripsToday } from "@/features/driver/services/driver.functions";
import { ArrowRight } from "lucide-react";

export const Route = createFileRoute("/_driver/trips")({
  component: DriverTrips,
});

function DriverTrips() {
  const fn = useServerFn(listMyTripsToday);
  const { data: trips = [], isLoading } = useQuery({ queryKey: ["driver-trips-all"], queryFn: () => fn() });

  return (
    <div className="space-y-3">
      <h1 className="text-xl font-bold">Trip Saya</h1>
      {isLoading ? (
        <div className="text-sm text-muted-foreground">Memuat…</div>
      ) : trips.length === 0 ? (
        <Card><CardContent className="p-4 text-sm text-muted-foreground">Tidak ada trip terjadwal.</CardContent></Card>
      ) : (
        trips.map((t: any) => (
          <Link key={t.id} to="/driver/trips/$scheduleId" params={{ scheduleId: t.id }}>
            <Card className="hover:bg-accent/30">
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
        ))
      )}
    </div>
  );
}
