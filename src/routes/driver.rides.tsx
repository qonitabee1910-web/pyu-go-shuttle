import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Card, CardContent } from "@/shared/components/ui/card";
import { listRequestedRides } from "@/features/driver/services/driver.functions";
import { formatRupiah } from "@/shared/utils/utils";
import { ArrowRight } from "lucide-react";

export const Route = createFileRoute("/driver/rides")({
  component: RidesList,
});

function RidesList() {
  const fn = useServerFn(listRequestedRides);
  const { data: rides = [], isLoading } = useQuery({
    queryKey: ["driver-rides-all"],
    queryFn: () => fn(),
    refetchInterval: 8000,
  });

  return (
    <div className="space-y-3">
      <h1 className="text-xl font-bold">Ride Request Aktif</h1>
      {isLoading ? (
        <div className="text-sm text-muted-foreground">Memuat…</div>
      ) : rides.length === 0 ? (
        <Card><CardContent className="p-4 text-sm text-muted-foreground">Tidak ada request saat ini.</CardContent></Card>
      ) : (
        rides.map((r: any) => (
          <Link key={r.id} to="/driver/rides/$id" params={{ id: r.id }}>
            <Card className="hover:bg-accent/30">
              <CardContent className="flex items-center gap-3 p-4">
                <div className="flex-1">
                  <div className="text-sm font-semibold">{r.pickup?.address ?? "Pickup"} → {r.dropoff?.address ?? "Dropoff"}</div>
                  <div className="text-xs text-muted-foreground">{formatRupiah(r.fare)} · {new Date(r.created_at).toLocaleTimeString("id-ID")}</div>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </CardContent>
            </Card>
          </Link>
        ))
      )}
    </div>
  );
}
