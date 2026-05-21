import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/shared/components/ui/sheet";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { adminListRoutes, adminUpsertRoute, adminDeleteRoute } from "@/features/admin/services/admin.functions";

export const Route = createFileRoute("/admin/routes")({
  component: RoutesPage,
});

function RoutesPage() {
  const qc = useQueryClient();
  const list = useServerFn(adminListRoutes);
  const up = useServerFn(adminUpsertRoute);
  const del = useServerFn(adminDeleteRoute);
  const { data: routes = [] } = useQuery({ queryKey: ["admin-routes"], queryFn: () => list() });
  const [editing, setEditing] = useState<any | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Routes</h1>
          <p className="text-sm text-muted-foreground">Master rute antar kota.</p>
        </div>
        <Button onClick={() => setEditing({})}><Plus className="mr-1 h-4 w-4" /> Tambah Rute</Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {routes.map((r: any) => (
          <Card key={r.id}>
            <CardContent className="space-y-1 p-4">
              <div className="font-semibold">{r.origin} → {r.destination}</div>
              <div className="text-xs text-muted-foreground">{r.distance_km ? `${r.distance_km} km` : "Jarak belum diisi"}</div>
              <div className="flex gap-1 pt-1">
                <Button size="sm" variant="ghost" onClick={() => setEditing(r)}><Pencil className="h-3.5 w-3.5" /></Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-destructive"
                  onClick={async () => {
                    if (!confirm("Hapus rute ini?")) return;
                    await del({ data: { id: r.id } });
                    toast.success("Dihapus");
                    qc.invalidateQueries({ queryKey: ["admin-routes"] });
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {routes.length === 0 && <Card><CardContent className="p-4 text-sm text-muted-foreground">Belum ada rute.</CardContent></Card>}
      </div>

      <Sheet open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <SheetContent className="w-full sm:max-w-md">
          <SheetHeader><SheetTitle>{editing?.id ? "Edit Rute" : "Tambah Rute"}</SheetTitle></SheetHeader>
          {editing && (
            <RouteForm
              value={editing}
              onSave={async (v) => {
                try {
                  await up({ data: v });
                  toast.success("Tersimpan");
                  setEditing(null);
                  qc.invalidateQueries({ queryKey: ["admin-routes"] });
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

function RouteForm({ value, onSave, onCancel }: { value: any; onSave: (v: any) => void; onCancel: () => void }) {
  const [origin, setOrigin] = useState(value.origin ?? "");
  const [destination, setDestination] = useState(value.destination ?? "");
  const [distance, setDistance] = useState<string>(value.distance_km?.toString() ?? "");
  return (
    <div className="mt-4 space-y-3">
      <div><Label className="text-xs">Asal</Label><Input value={origin} onChange={(e) => setOrigin(e.target.value)} /></div>
      <div><Label className="text-xs">Tujuan</Label><Input value={destination} onChange={(e) => setDestination(e.target.value)} /></div>
      <div><Label className="text-xs">Jarak (km)</Label><Input type="number" step="0.1" value={distance} onChange={(e) => setDistance(e.target.value)} /></div>
      <SheetFooter className="mt-4">
        <Button variant="outline" onClick={onCancel}>Batal</Button>
        <Button
          disabled={!origin || !destination}
          onClick={() => onSave({ id: value.id, origin, destination, distance_km: distance ? Number(distance) : undefined })}
        >
          Simpan
        </Button>
      </SheetFooter>
    </div>
  );
}
