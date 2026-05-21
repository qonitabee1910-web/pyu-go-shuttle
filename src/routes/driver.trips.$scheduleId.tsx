import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { Input } from "@/shared/components/ui/input";
import {
  getTripManifest,
  checkInSeatBooking,
  checkInByCode,
  setTripStatus,
} from "@/features/driver/services/driver.functions";
import { QrScanner } from "@/features/driver/components/QrScanner";
import { ScanLine, CheckCircle2, Play, Square } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_driver/trips/$scheduleId")({
  component: ManifestPage,
});

function ManifestPage() {
  const { scheduleId } = Route.useParams();
  const nav = useNavigate();
  const qc = useQueryClient();
  const fetchManifest = useServerFn(getTripManifest);
  const checkIn = useServerFn(checkInSeatBooking);
  const checkInCode = useServerFn(checkInByCode);
  const setStatus = useServerFn(setTripStatus);
  const [scanning, setScanning] = useState(false);
  const [code, setCode] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["manifest", scheduleId],
    queryFn: () => fetchManifest({ data: { scheduleId } }),
  });

  if (isLoading || !data) return <div className="text-sm text-muted-foreground">Memuat manifest…</div>;
  const { schedule, bookings, seatBookings } = data;

  const handleCode = async (c: string) => {
    try {
      await checkInCode({ data: { code: c.trim().toUpperCase(), scheduleId } });
      toast.success("Penumpang check-in");
      qc.invalidateQueries({ queryKey: ["manifest", scheduleId] });
    } catch (e: any) {
      toast.error(e.message ?? "Gagal check-in");
    }
  };

  return (
    <div className="space-y-4">
      {scanning && <QrScanner onScan={(t) => { setScanning(false); handleCode(t); }} onClose={() => setScanning(false)} />}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {schedule?.routes?.origin ?? "—"} → {schedule?.routes?.destination ?? "—"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="text-muted-foreground">
            {new Date(schedule.departure_at).toLocaleString("id-ID")} · {schedule.pickup_points?.name}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">Status: {schedule.status}</Badge>
            <Badge variant="secondary">{schedule.vehicles?.name} · {schedule.vehicles?.plate}</Badge>
          </div>
          <div className="flex gap-2 pt-2">
            <Button
              size="sm"
              onClick={async () => { await setStatus({ data: { scheduleId, status: "ongoing" } }); toast.success("Trip dimulai"); qc.invalidateQueries({ queryKey: ["manifest", scheduleId] }); }}
              disabled={schedule.status !== "scheduled"}
            >
              <Play className="mr-1 h-4 w-4" /> Mulai Trip
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={async () => { await setStatus({ data: { scheduleId, status: "completed" } }); toast.success("Trip selesai"); nav({ to: "/driver/trips" }); }}
              disabled={schedule.status === "completed"}
            >
              <Square className="mr-1 h-4 w-4" /> Selesai
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-sm">Check-in penumpang</CardTitle>
          <Button size="sm" onClick={() => setScanning(true)}><ScanLine className="mr-1 h-4 w-4" /> Scan QR</Button>
        </CardHeader>
        <CardContent>
          <form
            className="flex gap-2"
            onSubmit={(e) => { e.preventDefault(); if (code.trim()) handleCode(code); setCode(""); }}
          >
            <Input placeholder="Masukkan kode booking" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} />
            <Button type="submit" variant="outline">Check-in</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-sm">Manifest ({seatBookings.length} kursi)</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {seatBookings.length === 0 ? (
            <div className="text-sm text-muted-foreground">Belum ada penumpang.</div>
          ) : (
            seatBookings.map((sb: any) => {
              const booking = bookings.find((b: any) => b.id === sb.booking_id);
              return (
                <div key={sb.id} className="flex items-center gap-3 rounded-lg border border-border p-3">
                  <div className="grid h-9 w-9 place-items-center rounded-md bg-primary/10 text-xs font-bold text-primary">
                    {sb.seats?.seat_no ?? "?"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="truncate text-sm font-medium">{sb.passenger_name ?? booking?.passenger_name ?? "—"}</div>
                    <div className="font-mono text-[10px] text-muted-foreground">{booking?.code}</div>
                  </div>
                  {sb.checked_in_at ? (
                    <Badge className="bg-green-600"><CheckCircle2 className="mr-1 h-3 w-3" /> Hadir</Badge>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={async () => {
                        await checkIn({ data: { seatBookingId: sb.id } });
                        toast.success("Check-in OK");
                        qc.invalidateQueries({ queryKey: ["manifest", scheduleId] });
                      }}
                    >
                      Check-in
                    </Button>
                  )}
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}
