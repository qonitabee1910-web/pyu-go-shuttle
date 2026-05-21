import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import type { AdminSchedule } from "@/features/admin/types";
import { formatRupiah } from "@/shared/utils/utils";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/shared/components/ui/dialog";
import { Label } from "@/shared/components/ui/label";
import { Switch } from "@/shared/components/ui/switch";
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/shared/components/ui/alert-dialog";
import { toast } from "sonner";
import { Badge } from "@/shared/components/ui/badge";
import { 
  adminListSchedules, 
  adminListVehicles, 
  adminListPickupPoints, 
  adminListBookings,
  adminUpsertSchedule,
  adminDeleteSchedule 
} from "@/features/admin/services/admin.functions";

export const Route = createFileRoute("/admin/schedules")({
  component: SchedulesPage,
});

const empty = (): AdminSchedule => ({ 
  id: "", 
  pickupId: "", 
  vehicleId: "", 
  departureTime: "08:00", 
  arrivalTime: "09:30", 
  price: 120000, 
  active: true 
});

function SchedulesPage() {
  const queryClient = useQueryClient();
  const [pickupFilter, setPickupFilter] = useState("all");
  const [vehicleFilter, setVehicleFilter] = useState("all");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<AdminSchedule | null>(null);

  const listSchedulesFn = useServerFn(adminListSchedules);
  const listVehiclesFn = useServerFn(adminListVehicles);
  const listPickupsFn = useServerFn(adminListPickupPoints);
  const listBookingsFn = useServerFn(adminListBookings);
  const upsertScheduleFn = useServerFn(adminUpsertSchedule);
  const deleteScheduleFn = useServerFn(adminDeleteSchedule);

  const { data: rawSchedules = [], isLoading: loadingSchedules } = useQuery({
    queryKey: ["admin", "schedules"],
    queryFn: () => listSchedulesFn(),
  });

  const { data: vehicles = [], isLoading: loadingVehicles } = useQuery({
    queryKey: ["admin", "vehicles"],
    queryFn: () => listVehiclesFn(),
  });

  const { data: pickupPoints = [], isLoading: loadingPickups } = useQuery({
    queryKey: ["admin", "pickup-points"],
    queryFn: () => listPickupsFn(),
  });

  const { data: bookings = [], isLoading: loadingBookings } = useQuery({
    queryKey: ["admin", "bookings"],
    queryFn: () => listBookingsFn(),
  });

  const upsertMutation = useMutation({
    mutationFn: (data: AdminSchedule) => {
      // Convert camelCase to snake_case for DB
      // Handle time conversion: Use today's date if id is empty, otherwise keep existing date part
      const now = new Date();
      const dateStr = now.toISOString().split("T")[0];
      
      return upsertScheduleFn({
        data: {
          id: data.id || undefined,
          pickup_point_id: data.pickupId,
          vehicle_id: data.vehicleId,
          departure_at: `${dateStr}T${data.departureTime}:00+07:00`,
          arrival_at: data.arrivalTime ? `${dateStr}T${data.arrivalTime}:00+07:00` : undefined,
          price: data.price,
          active: data.active,
        }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "schedules"] });
      toast.success("Jadwal tersimpan");
      setOpen(false);
    },
    onError: (err: any) => {
      toast.error("Gagal menyimpan jadwal: " + err.message);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteScheduleFn({ data: { id } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "schedules"] });
      toast.success("Jadwal dihapus");
    },
    onError: (err: any) => {
      toast.error("Gagal menghapus jadwal: " + err.message);
    }
  });

  const schedules = useMemo(() => {
    return rawSchedules.map((s: any): AdminSchedule => ({
      id: s.id,
      pickupId: s.pickup_point_id,
      vehicleId: s.vehicle_id,
      departureTime: s.departure_at.split("T")[1].substring(0, 5),
      arrivalTime: s.arrival_at ? s.arrival_at.split("T")[1].substring(0, 5) : "",
      price: s.price,
      active: s.active,
    }));
  }, [rawSchedules]);

  const filtered = useMemo(() => {
    return schedules.filter((s) => {
      if (pickupFilter !== "all" && s.pickupId !== pickupFilter) return false;
      if (vehicleFilter !== "all" && s.vehicleId !== vehicleFilter) return false;
      return true;
    });
  }, [schedules, pickupFilter, vehicleFilter]);

  const bookedSeats = (scheduleId: string) =>
    bookings.filter((b: any) => b.schedule_id === scheduleId && (b.status === "paid" || b.status === "boarded" || b.status === "pending"))
      .reduce((s: number, b: any) => s + (b.seat_bookings?.length || 0), 0);

  const seatsTotal = (vehicleId: string) => {
    const v = vehicles.find((x: any) => x.id === vehicleId);
    return (v?.seat_layout || []).filter((m: any) => m.kind === "seat").length;
  };

  if (loadingSchedules || loadingVehicles || loadingPickups || loadingBookings) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Schedules</h1>
          <p className="text-sm text-muted-foreground">Atur jadwal keberangkatan shuttle.</p>
        </div>
        <Button onClick={() => { setEditing(empty()); setOpen(true); }}><Plus className="mr-1 h-4 w-4" /> Add schedule</Button>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="mb-3 flex flex-wrap gap-2">
            <Select value={pickupFilter} onValueChange={setPickupFilter}>
              <SelectTrigger className="w-[220px]"><SelectValue placeholder="Pickup" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua pickup</SelectItem>
                {pickupPoints.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={vehicleFilter} onValueChange={setVehicleFilter}>
              <SelectTrigger className="w-[200px]"><SelectValue placeholder="Vehicle" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua kendaraan</SelectItem>
                {vehicles.map((v: any) => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>Pickup → KNO</TableHead>
                  <TableHead>Vehicle</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Seats (booked / kuota)</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((s) => {
                  const pickup = pickupPoints.find((p: any) => p.id === s.pickupId);
                  const veh = vehicles.find((v: any) => v.id === s.vehicleId);
                  const capacity = seatsTotal(s.vehicleId);
                  const quota = s.seatQuota ?? capacity;
                  const booked = bookedSeats(s.id);
                  const ratio = quota > 0 ? booked / quota : 0;
                  const tone = ratio >= 0.9 ? "text-destructive" : ratio >= 0.6 ? "text-amber-600" : "text-foreground";
                  return (
                    <TableRow key={s.id}>
                      <TableCell className="font-semibold">{s.departureTime} → {s.arrivalTime}</TableCell>
                      <TableCell>{pickup?.name ?? "—"}</TableCell>
                      <TableCell>
                        <div>{veh?.name ?? "—"}</div>
                        <div className="text-xs text-muted-foreground">{veh?.tier} • {veh?.plate}</div>
                      </TableCell>
                      <TableCell>{formatRupiah(s.price)}</TableCell>
                      <TableCell>
                        <div className={`font-semibold ${tone}`}>{booked} / {quota}</div>
                        {quota !== capacity && (
                          <div className="text-[10px] text-muted-foreground">kapasitas {capacity}</div>
                        )}
                      </TableCell>
                      <TableCell>{s.active ? <Badge>Active</Badge> : <Badge variant="secondary">Off</Badge>}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => { setEditing(s); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-destructive"><Trash2 className="h-4 w-4" /></Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Hapus jadwal?</AlertDialogTitle>
                              <AlertDialogDescription>Booking yang sudah ada tidak akan terhapus.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Batal</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deleteMutation.mutate(s.id)}>Hapus</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {filtered.length === 0 && (
                  <TableRow><TableCell colSpan={7} className="py-8 text-center text-sm text-muted-foreground">Tidak ada jadwal.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <ScheduleDialog
        open={open}
        onOpenChange={setOpen}
        value={editing}
        pickupPoints={pickupPoints}
        vehicles={vehicles}
        onSave={(v) => upsertMutation.mutate(v)}
        isSaving={upsertMutation.isPending}
      />
    </div>
  );
}

function ScheduleDialog({ 
  open, 
  onOpenChange, 
  value, 
  pickupPoints, 
  vehicles, 
  onSave,
  isSaving
}: { 
  open: boolean; 
  onOpenChange: (v: boolean) => void; 
  value: AdminSchedule | null; 
  pickupPoints: any[];
  vehicles: any[];
  onSave: (s: AdminSchedule) => void;
  isSaving: boolean;
}) {
  const [v, setV] = useState<AdminSchedule>(value ?? empty());
  useEffect(() => { if (value) setV(value); }, [value]);

  if (!value) return null;
  const vehicle = vehicles.find((x) => x.id === v.vehicleId);
  const capacity = (vehicle?.seat_layout || []).filter((m: any) => m.kind === "seat").length;
  const quotaValue = v.seatQuota ?? capacity;
  const quotaInvalid = capacity > 0 && (quotaValue < 1 || quotaValue > capacity);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Jadwal</DialogTitle>
          <DialogDescription>Atur rute, waktu, dan kapasitas armada untuk jadwal ini.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label className="mb-1 block text-xs">Pickup Point</Label>
            <Select value={v.pickupId} onValueChange={(x) => setV({ ...v, pickupId: x })}>
              <SelectTrigger><SelectValue placeholder="Pilih pickup" /></SelectTrigger>
              <SelectContent>{pickupPoints.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="sm:col-span-2">
            <Label className="mb-1 block text-xs">Vehicle</Label>
            <Select value={v.vehicleId} onValueChange={(x) => setV({ ...v, vehicleId: x, seatQuota: undefined })}>
              <SelectTrigger><SelectValue placeholder="Pilih kendaraan" /></SelectTrigger>
              <SelectContent>{vehicles.map((vv) => <SelectItem key={vv.id} value={vv.id}>{vv.name} • {vv.plate}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label className="mb-1 block text-xs">Berangkat</Label>
            <Input type="time" value={v.departureTime} onChange={(e) => setV({ ...v, departureTime: e.target.value })} />
          </div>
          <div>
            <Label className="mb-1 block text-xs">Tiba</Label>
            <Input type="time" value={v.arrivalTime} onChange={(e) => setV({ ...v, arrivalTime: e.target.value })} />
          </div>
          <div>
            <Label className="mb-1 block text-xs">Harga (Rp)</Label>
            <Input type="number" value={v.price} onChange={(e) => setV({ ...v, price: +e.target.value })} />
          </div>
          <div>
            <Label className="mb-1 block text-xs">
              Kuota kursi <span className="text-muted-foreground">(maks {capacity || "—"})</span>
            </Label>
            <Input
              type="number"
              min={1}
              max={capacity || undefined}
              value={quotaValue}
              disabled={!vehicle}
              onChange={(e) => {
                const n = +e.target.value;
                setV({ ...v, seatQuota: n === capacity ? undefined : n });
              }}
            />
            {quotaInvalid && (
              <p className="mt-1 text-[11px] text-destructive">Kuota harus 1–{capacity}.</p>
            )}
            {!quotaInvalid && v.seatQuota !== undefined && v.seatQuota < capacity && (
              <p className="mt-1 text-[11px] text-muted-foreground">
                {capacity - v.seatQuota} kursi dikunci (cargo / blocked).
              </p>
            )}
          </div>
          <div className="sm:col-span-2 flex items-center justify-between rounded-lg border p-3">
            <div>
              <div className="text-sm font-medium">Aktif</div>
              <div className="text-xs text-muted-foreground">Tampilkan ke penumpang</div>
            </div>
            <Switch checked={v.active} onCheckedChange={(c) => setV({ ...v, active: c })} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Batal</Button>
          <Button onClick={() => onSave(v)} disabled={!v.pickupId || !v.vehicleId || quotaInvalid || isSaving}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Simpan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
