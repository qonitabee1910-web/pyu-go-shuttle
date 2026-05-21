import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { adminListPickupPoints, adminUpsertPickupPoint, adminDeletePickupPoint } from "@/features/admin/services/admin.functions";
import type { PickupPoint } from "@/shared/types/shuttle";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/shared/components/ui/dialog";
import { Label } from "@/shared/components/ui/label";
import { Plus, Pencil, Trash2, Search, Loader2 } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/shared/components/ui/alert-dialog";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/pickup-points")({
  component: PickupPointsPage,
});

const empty: PickupPoint = { id: "", rayon: "Rayon A", name: "", address: "", city: "Medan", distanceKm: 0, etaMin: 0, lat: 3.58, lng: 98.67 };

function PickupPointsPage() {
  const queryClient = useQueryClient();
  const listFn = useServerFn(adminListPickupPoints);
  const upsertFn = useServerFn(adminUpsertPickupPoint);
  const deleteFn = useServerFn(adminDeletePickupPoint);

  const { data: pickupPoints = [], isLoading } = useQuery({
    queryKey: ["admin-pickup-points"],
    queryFn: () => listFn(),
  });

  const upsertMutation = useMutation({
    mutationFn: (p: any) => upsertFn({ data: p }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-pickup-points"] });
      setOpen(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-pickup-points"] });
    },
  });

  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<PickupPoint | null>(null);
  const [open, setOpen] = useState(false);

  const filtered = useMemo(() => {
    const s = q.toLowerCase();
    return pickupPoints.filter((p: any) => !s || p.name.toLowerCase().includes(s) || p.address.toLowerCase().includes(s) || p.rayon.toLowerCase().includes(s));
  }, [pickupPoints, q]);

  const openNew = () => { setEditing({ ...empty }); setOpen(true); };
  const openEdit = (p: any) => { 
    setEditing({
      id: p.id,
      name: p.name,
      rayon: p.rayon,
      address: p.address,
      city: p.city || "Medan",
      distanceKm: p.distance_km || 0,
      etaMin: p.eta_min || 0,
      lat: p.lat,
      lng: p.lng,
      imageUrl: p.image_url
    }); 
    setOpen(true); 
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Pickup Points</h1>
          <p className="text-sm text-muted-foreground">Kelola titik penjemputan shuttle.</p>
        </div>
        <Button onClick={openNew}><Plus className="mr-1 h-4 w-4" /> Add point</Button>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="relative mb-3 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-9" placeholder="Cari nama, alamat, rayon…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          
          {isLoading ? (
            <div className="flex h-32 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Rayon</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>City</TableHead>
                    <TableHead>Distance</TableHead>
                    <TableHead>ETA</TableHead>
                    <TableHead>Lat/Lng</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((p: any) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.rayon}</TableCell>
                      <TableCell>
                        <div className="font-medium">{p.name}</div>
                        <div className="text-xs text-muted-foreground">{p.address}</div>
                      </TableCell>
                      <TableCell>{p.city}</TableCell>
                      <TableCell>{p.distance_km} km</TableCell>
                      <TableCell>{p.eta_min} min</TableCell>
                      <TableCell className="font-mono text-xs">{Number(p.lat).toFixed(3)}, {Number(p.lng).toFixed(3)}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(p)}><Pencil className="h-4 w-4" /></Button>
                        <DeleteBtn onConfirm={() => { deleteMutation.mutate(p.id); toast.success("Pickup point dihapus"); }} />
                      </TableCell>
                    </TableRow>
                  ))}
                  {filtered.length === 0 && (
                    <TableRow><TableCell colSpan={7} className="py-8 text-center text-sm text-muted-foreground">Tidak ada data.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <PickupDialog 
        open={open} 
        onOpenChange={setOpen} 
        value={editing} 
        onSave={(v) => { 
          upsertMutation.mutate({
            ...v,
            distance_km: v.distanceKm,
            eta_min: v.etaMin,
            image_url: v.imageUrl
          }); 
          toast.success("Tersimpan"); 
        }} 
        loading={upsertMutation.isPending}
      />
    </div>
  );
}

function DeleteBtn({ onConfirm }: { onConfirm: () => void }) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="icon" className="text-destructive"><Trash2 className="h-4 w-4" /></Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Hapus item ini?</AlertDialogTitle>
          <AlertDialogDescription>Tindakan ini tidak dapat dibatalkan.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Batal</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>Hapus</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function PickupDialog({ open, onOpenChange, value, onSave, loading }: { open: boolean; onOpenChange: (v: boolean) => void; value: PickupPoint | null; onSave: (p: PickupPoint) => void; loading: boolean }) {
  const [v, setV] = useState<PickupPoint>(value ?? empty);
  // reset on open
  useMemoSync(() => setV(value ?? empty), [value]);

  if (!value) return null;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{value.id ? "Edit Pickup Point" : "Tambah Pickup Point"}</DialogTitle>
          <DialogDescription>
            {value.id ? `Perbarui informasi untuk ${value.name}.` : "Isi formulir di bawah untuk menambahkan titik penjemputan baru."}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Nama"><Input value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} /></Field>
          <Field label="Rayon"><Input value={v.rayon} onChange={(e) => setV({ ...v, rayon: e.target.value })} /></Field>
          <Field label="Alamat" full><Input value={v.address} onChange={(e) => setV({ ...v, address: e.target.value })} /></Field>
          <Field label="Kota"><Input value={v.city} onChange={(e) => setV({ ...v, city: e.target.value })} /></Field>
          <Field label="Jarak (km)"><Input type="number" step="0.1" value={v.distanceKm} onChange={(e) => setV({ ...v, distanceKm: +e.target.value })} /></Field>
          <Field label="ETA (menit)"><Input type="number" value={v.etaMin} onChange={(e) => setV({ ...v, etaMin: +e.target.value })} /></Field>
          <Field label="Latitude"><Input type="number" step="0.0001" value={v.lat} onChange={(e) => setV({ ...v, lat: +e.target.value })} /></Field>
          <Field label="Longitude"><Input type="number" step="0.0001" value={v.lng} onChange={(e) => setV({ ...v, lng: +e.target.value })} /></Field>
          <Field label="Image URL" full><Input value={v.imageUrl || ""} onChange={(e) => setV({ ...v, imageUrl: e.target.value })} /></Field>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Batal</Button>
          <Button onClick={() => onSave(v)} disabled={!v.name || !v.address || loading}>
            {loading ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null} Simpan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <div className={full ? "sm:col-span-2" : ""}>
      <Label className="mb-1 block text-xs">{label}</Label>
      {children}
    </div>
  );
}

// helper to mimic useEffect without import
import { useEffect } from "react";
function useMemoSync(fn: () => void, deps: unknown[]) { useEffect(fn, deps); }
