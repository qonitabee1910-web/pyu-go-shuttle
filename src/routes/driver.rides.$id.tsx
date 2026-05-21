import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { getRideOrder } from "@/features/ride/services/ride-order.functions";
import { updateRideStatus } from "@/features/driver/services/driver.functions";
import { supabase } from "@/integrations/supabase/client";
import { formatRupiah } from "@/shared/utils/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/driver/rides/$id")({
  component: RideDetail,
});

function RideDetail() {
  const { id } = Route.useParams();
  const nav = useNavigate();
  const qc = useQueryClient();
  const fetchOrder = useServerFn(getRideOrder);
  const update = useServerFn(updateRideStatus);

  const { data } = useQuery({ queryKey: ["ride", id], queryFn: () => fetchOrder({ data: { id } }) });

  useEffect(() => {
    const ch = supabase
      .channel(`ride-${id}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "ride_orders", filter: `id=eq.${id}` }, () => {
        qc.invalidateQueries({ queryKey: ["ride", id] });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [id, qc]);

  if (!data) return <div className="text-sm text-muted-foreground">Memuat…</div>;
  const o = data.order;
  const pickup = (o.pickup ?? {}) as { address?: string; lat?: number; lng?: number };
  const dropoff = (o.dropoff ?? {}) as { address?: string; lat?: number; lng?: number };

  const act = async (status: "accepted" | "ongoing" | "completed" | "cancelled") => {
    try {
      await update({ data: { id, status } });
      toast.success("Status diperbarui");
      qc.invalidateQueries({ queryKey: ["ride", id] });
      if (status === "completed" || status === "cancelled") nav({ to: "/driver/rides" });
    } catch (e: any) {
      toast.error(e.message ?? "Gagal");
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Order #{o.id.slice(0, 8)}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div><strong>Pickup:</strong> {pickup.address ?? `${pickup.lat},${pickup.lng}`}</div>
          <div><strong>Dropoff:</strong> {dropoff.address ?? `${dropoff.lat},${dropoff.lng}`}</div>
          <div><strong>Tarif:</strong> {formatRupiah(o.fare)}</div>
          <div><Badge variant="outline">Status: {o.status}</Badge></div>

          <div className="flex flex-wrap gap-2 pt-2">
            {o.status === "requested" && (
              <>
                <Button onClick={() => act("accepted")}>Terima</Button>
                <Button variant="outline" onClick={() => act("cancelled")}>Tolak</Button>
              </>
            )}
            {o.status === "accepted" && <Button onClick={() => act("ongoing")}>Mulai Perjalanan</Button>}
            {o.status === "ongoing" && <Button onClick={() => act("completed")}>Selesai</Button>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
