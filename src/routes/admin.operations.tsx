import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/shared/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/shared/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import { toast } from "sonner";
import {
  Activity,
  Bus,
  Pencil,
  Power,
  Wrench,
  Users,
  ArrowRight,
} from "lucide-react";
import {
  useAdmin,
  VEHICLE_STATUS_LABEL,
  TIER_LABEL,
  TYPE_LABEL,
  countSeatsInMap,
} from "@/features/admin/store/admin";
import type { VehicleStatus, VehicleTemplate, AdminSchedule } from "@/features/admin/store/admin";
import { formatRupiah } from "@/shared/utils/utils";

export const Route = createFileRoute("/admin/operations")({
  head: () => ({ meta: [{ title: "Operations — PYU-GO Admin" }] }),
  component: OperationsPage,
});

const STATUS_STYLE: Record<VehicleStatus, string> = {
  active: "bg-emerald-100 text-emerald-800 border-emerald-200",
  maintenance: "bg-amber-100 text-amber-800 border-amber-200",
  offline: "bg-muted text-muted-foreground border-border",
};

function OperationsPage() {
  const {
    vehicles,
    schedules,
    bookings,
    pickupPoints,
    setVehicleStatus,
    setVehiclePlate,
    toggleScheduleActive,
  } = useAdmin();

  const [editVehicle, setEditVehicle] = useState<VehicleTemplate | null>(null);
  const [filter, setFilter] = useState<"all" | VehicleStatus>("all");

  // Build per-schedule occupancy from bookings (confirmed/boarded only)
  const scheduleSeats = useMemo(() => {
    const map = new Map<string, number>();
    bookings.forEach((b) => {
      if (b.status === "paid" || b.status === "boarded") {
        map.set(b.scheduleId, (map.get(b.scheduleId) ?? 0) + b.seats.length);
      }
    });
    return map;
  }, [bookings]);

  const vehiclesById = useMemo(
    () => new Map(vehicles.map((v) => [v.id, v])),
    [vehicles],
  );
  const pickupById = useMemo(
    () => new Map(pickupPoints.map((p) => [p.id, p])),
    [pickupPoints],
  );

  const counts = useMemo(() => {
    const c = { active: 0, maintenance: 0, offline: 0 };
    vehicles.forEach((v) => {
      const s = v.status ?? "active";
      c[s] += 1;
    });
    return c;
  }, [vehicles]);

  const filteredVehicles = vehicles.filter((v) => {
    const s = v.status ?? "active";
    return filter === "all" || s === filter;
  });

  // Schedule density rows with calculations
  const scheduleRows = useMemo(() => {
    return schedules
      .map((s) => {
        const v = vehiclesById.get(s.vehicleId);
        const capacity = countSeatsInMap(v?.seatMap);
        const booked = scheduleSeats.get(s.id) ?? 0;
        const occ = capacity ? Math.round((booked / capacity) * 100) : 0;
        return {
          schedule: s,
          vehicle: v,
          pickup: pickupById.get(s.pickupId),
          capacity,
          booked,
          occ,
        };
      })
      .sort((a, b) => b.occ - a.occ);
  }, [schedules, vehiclesById, pickupById, scheduleSeats]);

  const avgOcc = scheduleRows.length
    ? Math.round(scheduleRows.reduce((a, r) => a + r.occ, 0) / scheduleRows.length)
    : 0;
  const activeSchedules = schedules.filter((s) => s.active).length;

  const cycleStatus = (v: VehicleTemplate) => {
    const order: VehicleStatus[] = ["active", "maintenance", "offline"];
    const cur = v.status ?? "active";
    const next = order[(order.indexOf(cur) + 1) % order.length];
    setVehicleStatus(v.id, next);
    toast.success(`${v.name} → ${VEHICLE_STATUS_LABEL[next]}`);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Operations</h1>
        <p className="text-sm text-muted-foreground">
          Pantau kendaraan aktif, kepadatan kursi, dan lakukan perubahan cepat.
        </p>
      </div>

      {/* KPI strip */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi
          icon={<Activity className="h-5 w-5" />}
          label="Kendaraan aktif"
          value={`${counts.active}/${vehicles.length}`}
        />
        <Kpi
          icon={<Wrench className="h-5 w-5" />}
          label="Maintenance"
          value={counts.maintenance}
          tone="amber"
        />
        <Kpi
          icon={<Users className="h-5 w-5" />}
          label="Rata-rata occupancy"
          value={`${avgOcc}%`}
        />
        <Kpi
          icon={<Bus className="h-5 w-5" />}
          label="Jadwal aktif"
          value={`${activeSchedules}/${schedules.length}`}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        {/* Active vehicles */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
            <div>
              <CardTitle>Armada</CardTitle>
              <p className="text-xs text-muted-foreground">Update status & plat secara langsung</p>
            </div>
            <Select
              value={filter}
              onValueChange={(v) => setFilter(v as typeof filter)}
            >
              <SelectTrigger className="h-8 w-[140px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua status</SelectItem>
                <SelectItem value="active">Aktif</SelectItem>
                <SelectItem value="maintenance">Maintenance</SelectItem>
                <SelectItem value="offline">Offline</SelectItem>
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent className="space-y-2">
            {filteredVehicles.map((v) => {
              const status = v.status ?? "active";
              return (
                <div
                  key={v.id}
                  className="flex items-center gap-3 rounded-xl border border-border bg-card p-3"
                >
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                    <Bus className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-semibold">{v.name}</span>
                      <span
                        className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold ${STATUS_STYLE[status]}`}
                      >
                        {VEHICLE_STATUS_LABEL[status]}
                      </span>
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      {TYPE_LABEL[v.type]} • {TIER_LABEL[v.tier]} •{" "}
                      <span className="font-mono font-semibold text-foreground">{v.plate}</span>
                    </div>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                    onClick={() => setEditVehicle(v)}
                    aria-label="Edit plat"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="outline"
                    className="h-8 w-8"
                    onClick={() => cycleStatus(v)}
                    aria-label="Ubah status"
                  >
                    <Power className="h-4 w-4" />
                  </Button>
                </div>
              );
            })}
            {filteredVehicles.length === 0 && (
              <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
                Tidak ada kendaraan untuk filter ini.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Seat density per schedule */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Kepadatan kursi per jadwal</CardTitle>
            <p className="text-xs text-muted-foreground">
              Diurutkan dari occupancy tertinggi. Klik tombol untuk mengaktifkan/menonaktifkan jadwal.
            </p>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Jadwal</TableHead>
                  <TableHead>Kendaraan</TableHead>
                  <TableHead className="w-[40%]">Density</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {scheduleRows.map(({ schedule: s, vehicle: v, pickup, capacity, booked, occ }) => {
                  const vStatus = v?.status ?? "active";
                  const flag = vStatus !== "active" || !s.active;
                  return (
                    <TableRow key={s.id} className={flag ? "opacity-70" : ""}>
                      <TableCell className="align-top">
                        <div className="text-sm font-semibold tabular-nums">
                          {s.departureTime}{" "}
                          <ArrowRight className="inline h-3 w-3 text-muted-foreground" />{" "}
                          {s.arrivalTime}
                        </div>
                        <div className="truncate text-[11px] text-muted-foreground">
                          {pickup?.name ?? "—"} → KNO
                        </div>
                        <div className="mt-0.5 text-[11px] font-semibold text-primary">
                          {formatRupiah(s.price)}
                        </div>
                      </TableCell>
                      <TableCell className="align-top">
                        <div className="text-xs font-semibold">{v?.name ?? "—"}</div>
                        <div className="font-mono text-[11px] text-muted-foreground">
                          {v?.plate}
                        </div>
                        <span
                          className={`mt-1 inline-flex rounded-full border px-1.5 py-0 text-[9px] font-bold ${STATUS_STYLE[vStatus]}`}
                        >
                          {VEHICLE_STATUS_LABEL[vStatus]}
                        </span>
                      </TableCell>
                      <TableCell className="align-top">
                        <DensityBar booked={booked} capacity={capacity} occ={occ} />
                      </TableCell>
                  <TableCell className="text-right align-top">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          size="sm"
                          variant={s.active ? "outline" : "default"}
                          className="h-7 text-xs"
                        >
                          {s.active ? "Nonaktifkan" : "Aktifkan"}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>{s.active ? "Nonaktifkan jadwal?" : "Aktifkan jadwal?"}</AlertDialogTitle>
                          <AlertDialogDescription>
                            {s.active 
                              ? "Jadwal ini tidak akan muncul di aplikasi pengguna." 
                              : "Jadwal ini akan kembali muncul dan dapat dipesan oleh pengguna."}
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Batal</AlertDialogCancel>
                          <AlertDialogAction onClick={() => {
                            toggleScheduleActive(s.id);
                            toast.success(`Jadwal ${s.departureTime} ${s.active ? "dinonaktifkan" : "diaktifkan"}`);
                          }}>
                            {s.active ? "Ya, Nonaktifkan" : "Ya, Aktifkan"}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <EditPlateDialog
        vehicle={editVehicle}
        onClose={() => setEditVehicle(null)}
        onSave={(plate) => {
          if (!editVehicle) return;
          setVehiclePlate(editVehicle.id, plate);
          toast.success(`Plat ${editVehicle.name} diperbarui ke ${plate}`);
          setEditVehicle(null);
        }}
      />
    </div>
  );
}

function DensityBar({
  booked,
  capacity,
  occ,
}: {
  booked: number;
  capacity: number;
  occ: number;
}) {
  const tone =
    occ >= 90
      ? "bg-destructive"
      : occ >= 70
        ? "bg-amber-500"
        : occ >= 30
          ? "bg-primary"
          : "bg-emerald-500";
  return (
    <div>
      <div className="flex items-baseline justify-between text-[11px]">
        <span className="font-semibold tabular-nums">
          {booked}/{capacity || "—"} kursi
        </span>
        <span className="font-bold tabular-nums">{occ}%</span>
      </div>
      <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full rounded-full ${tone} transition-all`}
          style={{ width: `${Math.min(100, occ)}%` }}
        />
      </div>
    </div>
  );
}

function EditPlateDialog({
  vehicle,
  onClose,
  onSave,
}: {
  vehicle: VehicleTemplate | null;
  onClose: () => void;
  onSave: (plate: string) => void;
}) {
  const [plate, setPlate] = useState("");

  useEffect(() => {
    if (vehicle) setPlate(vehicle.plate);
  }, [vehicle]);

  const valid = /^[A-Z0-9 ]{4,12}$/.test(plate.trim().toUpperCase());

  return (
    <Dialog
      open={!!vehicle}
      onOpenChange={(o) => {
        if (!o) {
          setPlate("");
          onClose();
        }
      }}
    >
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Update plat kendaraan</DialogTitle>
          <DialogDescription>
            {vehicle?.name} • {vehicle ? TYPE_LABEL[vehicle.type] : ""}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="plate">Plat baru</Label>
          <Input
            id="plate"
            value={plate}
            onChange={(e) => setPlate(e.target.value.toUpperCase())}
            placeholder="BK 1234 GO"
            className="font-mono uppercase"
            maxLength={12}
          />
          {!valid && plate && (
            <p className="text-xs text-destructive">Format plat tidak valid (4–12 karakter).</p>
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Batal
          </Button>
          <Button
            disabled={!valid}
            onClick={() => onSave(plate.trim().toUpperCase())}
          >
            Simpan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Kpi({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  tone?: "amber";
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-5">
        <div
          className={`grid h-11 w-11 place-items-center rounded-xl ${
            tone === "amber"
              ? "bg-amber-100 text-amber-700"
              : "bg-primary/10 text-primary"
          }`}
        >
          {icon}
        </div>
        <div>
          <div className="text-xs font-medium text-muted-foreground">{label}</div>
          <div className="text-xl font-bold">{value}</div>
        </div>
      </CardContent>
    </Card>
  );
}

import { StatusBadge } from "@/features/admin/components/StatusBadge";
import type { BookingStatus } from "@/features/admin/store/admin";
