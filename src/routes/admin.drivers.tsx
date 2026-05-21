import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Badge } from "@/shared/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/shared/components/ui/sheet";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  adminListDrivers,
  adminUpsertDriver,
  adminDeleteDriver,
  adminListVehicles,
  adminListUsers,
} from "@/features/admin/services/admin.functions";

export const Route = createFileRoute("/admin/drivers")({
  component: DriversPage,
});

function DriversPage() {
  const qc = useQueryClient();
  const listFn = useServerFn(adminListDrivers);
  const upFn = useServerFn(adminUpsertDriver);
  const delFn = useServerFn(adminDeleteDriver);
  const vehFn = useServerFn(adminListVehicles);
  const userFn = useServerFn(adminListUsers);

  const { data: drivers = [] } = useQuery({ queryKey: ["admin-drivers"], queryFn: () => listFn() });
  const { data: vehicles = [] } = useQuery({ queryKey: ["admin-vehicles"], queryFn: () => vehFn() });
  const { data: users = [] } = useQuery({ queryKey: ["admin-users"], queryFn: () => userFn() });

  const [editing, setEditing] = useState<any | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Drivers</h1>
          <p className="text-sm text-muted-foreground">Kelola driver & assignment kendaraan.</p>
        </div>
        <Button onClick={() => setEditing({})}><Plus className="mr-1 h-4 w-4" /> Tambah</Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {drivers.map((d: any) => (
          <Card key={d.id}>
            <CardContent className="space-y-2 p-4">
              <div className="flex items-center justify-between">
                <div className="font-semibold">{d.profile?.full_name ?? "—"}</div>
                <Badge className={d.status === "online" ? "bg-green-600" : "bg-muted text-muted-foreground"}>
                  {d.status}
                </Badge>
              </div>
              <div className="text-xs text-muted-foreground">{d.profile?.phone ?? "—"}</div>
              <div className="text-xs">
                <span className="text-muted-foreground">Kendaraan:</span>{" "}
                {d.vehicles ? `${d.vehicles.name} (${d.vehicles.plate})` : "—"}
              </div>
              <div className="text-xs">⭐ {d.rating ?? 5} · SIM {d.license_no ?? "—"}</div>
              <div className="flex gap-1 pt-1">
                <Button size="sm" variant="ghost" onClick={() => setEditing(d)}><Pencil className="h-3.5 w-3.5" /></Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-destructive"
                  onClick={async () => {
                    if (!confirm("Hapus driver ini?")) return;
                    await delFn({ data: { id: d.id } });
                    toast.success("Dihapus");
                    qc.invalidateQueries({ queryKey: ["admin-drivers"] });
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {drivers.length === 0 && <Card><CardContent className="p-4 text-sm text-muted-foreground">Belum ada driver.</CardContent></Card>}
      </div>

      <Sheet open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <SheetContent className="w-full sm:max-w-md">
          <SheetHeader><SheetTitle>{editing?.id ? "Edit Driver" : "Tambah Driver"}</SheetTitle></SheetHeader>
          {editing && (
            <DriverForm
              value={editing}
              users={users}
              vehicles={vehicles}
              isNew={!editing.id}
              onSave={async (v) => {
                try {
                  await upFn({ data: v });
                  toast.success("Tersimpan");
                  setEditing(null);
                  qc.invalidateQueries({ queryKey: ["admin-drivers"] });
                } catch (e: any) {
                  toast.error(e.message ?? "Gagal");
                }
              }}
              onCancel={() => setEditing(null)}
            />
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function DriverForm({
  value,
  users,
  vehicles,
  isNew,
  onSave,
  onCancel,
}: {
  value: any;
  users: any[];
  vehicles: any[];
  isNew: boolean;
  onSave: (v: any) => void;
  onCancel: () => void;
}) {
  const [userId, setUserId] = useState<string>(value.id ?? "");
  const [vehicleId, setVehicleId] = useState<string>(value.vehicle_id ?? "");
  const [licenseNo, setLicenseNo] = useState<string>(value.license_no ?? "");
  const [status, setStatus] = useState<string>(value.status ?? "offline");

  return (
    <div className="mt-4 space-y-3">
      <div>
        <Label className="text-xs">User</Label>
        {isNew ? (
          <Select value={userId} onValueChange={setUserId}>
            <SelectTrigger><SelectValue placeholder="Pilih user" /></SelectTrigger>
            <SelectContent>
              {users.map((u) => <SelectItem key={u.id} value={u.id}>{u.full_name ?? u.id.slice(0, 8)}</SelectItem>)}
            </SelectContent>
          </Select>
        ) : (
          <Input value={value.profile?.full_name ?? userId} disabled />
        )}
      </div>
      <div>
        <Label className="text-xs">Kendaraan</Label>
        <Select value={vehicleId || "_none"} onValueChange={(v) => setVehicleId(v === "_none" ? "" : v)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="_none">— Tidak ditugaskan —</SelectItem>
            {vehicles.map((v) => <SelectItem key={v.id} value={v.id}>{v.name} ({v.plate})</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label className="text-xs">Nomor SIM</Label>
        <Input value={licenseNo} onChange={(e) => setLicenseNo(e.target.value)} />
      </div>
      <div>
        <Label className="text-xs">Status</Label>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="online">Online</SelectItem>
            <SelectItem value="offline">Offline</SelectItem>
            <SelectItem value="busy">Busy</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <SheetFooter className="mt-4">
        <Button variant="outline" onClick={onCancel}>Batal</Button>
        <Button
          disabled={!userId}
          onClick={() => onSave({ id: userId, vehicleId: vehicleId || null, licenseNo, status })}
        >
          Simpan
        </Button>
      </SheetFooter>
    </div>
  );
}
