import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { 
  adminListVehicles, 
  adminUpsertVehicle, 
  adminDeleteVehicle, 
  adminSetVehiclePlate 
} from "@/features/admin/services/admin.functions";
import {
  countSeatsInMap,
  renumberSeatMap,
  TIER_ORDER,
  TIER_LABEL,
  TYPE_LABEL,
  DEFAULT_CAPACITY,
} from "@/features/admin/store/admin";
import type { VehicleTemplate, SeatMarker } from "@/features/admin/types";
import { formatRupiah } from "@/shared/utils/utils";
import type { VehicleType, VehicleTier } from "@/shared/types/shuttle";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/shared/components/ui/sheet";
import { Plus, Pencil, Trash2, Image as ImageIcon, Armchair, Loader2 } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/shared/components/ui/alert-dialog";
import { SeatImageEditor } from "@/features/admin/components/SeatImageEditor";
import { SeatImageMap } from "@/features/admin/components/SeatImageMap";
import { Badge } from "@/shared/components/ui/badge";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/vehicles")({
  component: VehiclesPage,
});

const emptyVehicle = (): VehicleTemplate => ({
  id: "",
  name: "Kendaraan Baru",
  type: "minicar",
  plate: "BK 0000 GO",
  tier: "Reguler",
  seatMap: [],
});

const TIER_TONE: Record<VehicleTier, string> = {
  Reguler: "bg-muted text-muted-foreground",
  SemiExecutive: "bg-primary/15 text-primary",
  Executive: "bg-amber-400/20 text-amber-700 dark:text-amber-300",
};

function VehiclesPage() {
  const queryClient = useQueryClient();
  const listFn = useServerFn(adminListVehicles);
  const upsertFn = useServerFn(adminUpsertVehicle);
  const deleteFn = useServerFn(adminDeleteVehicle);

  const { data: vehicles = [], isLoading } = useQuery({
    queryKey: ["admin-vehicles"],
    queryFn: () => listFn(),
  });

  const upsertMutation = useMutation({
    mutationFn: (v: any) => upsertFn({ data: v }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-vehicles"] });
      setEditing(null);
      toast.success("Kendaraan tersimpan");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-vehicles"] });
      toast.success("Kendaraan dihapus");
    },
  });

  const [editing, setEditing] = useState<VehicleTemplate | null>(null);
  const [typeFilter, setTypeFilter] = useState<"all" | VehicleType>("all");
  const [tierFilter, setTierFilter] = useState<"all" | VehicleTier>("all");

  const filtered = useMemo(
    () =>
      vehicles.filter(
        (v: any) => (typeFilter === "all" || v.type === typeFilter) && (tierFilter === "all" || v.tier === tierFilter),
      ),
    [vehicles, typeFilter, tierFilter],
  );

  const grouped = useMemo(() => {
    const m = new Map<VehicleTier, VehicleTemplate[]>();
    TIER_ORDER.forEach((t) => m.set(t, []));
    filtered.forEach((v: any) => {
      const template: VehicleTemplate = {
        id: v.id,
        name: v.name,
        type: v.type,
        plate: v.plate,
        tier: v.tier,
        status: v.status,
        imageUrl: v.image_url,
        seatMap: v.seat_layout as any,
      };
      m.get(v.tier)?.push(template);
    });
    return m;
  }, [filtered]);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Vehicles</h1>
          <p className="text-sm text-muted-foreground">3 jenis kendaraan · 3 tier layanan · denah kursi realistis.</p>
        </div>
        <Button onClick={() => setEditing(emptyVehicle())}>
          <Plus className="mr-1 h-4 w-4" /> Add vehicle
        </Button>
      </div>

      <Card>
        <CardContent className="flex flex-wrap items-center gap-2 p-3">
          <span className="text-xs font-medium text-muted-foreground">Filter:</span>
          <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as typeof typeFilter)}>
            <SelectTrigger className="h-8 w-[160px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua jenis</SelectItem>
              <SelectItem value="minicar">Minicar</SelectItem>
              <SelectItem value="suv">SUV</SelectItem>
              <SelectItem value="hiace">Hiace</SelectItem>
            </SelectContent>
          </Select>
          <Select value={tierFilter} onValueChange={(v) => setTierFilter(v as typeof tierFilter)}>
            <SelectTrigger className="h-8 w-[180px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua tier</SelectItem>
              {TIER_ORDER.map((t) => (
                <SelectItem key={t} value={t}>{TIER_LABEL[t]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="flex h-32 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      ) : (
        TIER_ORDER.map((tier) => {
          const list = grouped.get(tier) ?? [];
          if (tierFilter !== "all" && tierFilter !== tier) return null;
          return (
            <section key={tier} className="space-y-2">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold tracking-tight">{TIER_LABEL[tier]}</h2>
                <Badge variant="outline" className="text-xs">{list.length}</Badge>
              </div>
              {list.length === 0 ? (
                <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">Belum ada kendaraan {TIER_LABEL[tier]}.</CardContent></Card>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {list.map((v) => (
                    <VehicleCard 
                      key={v.id} 
                      v={v} 
                      onEdit={() => setEditing(v)} 
                      onDelete={() => deleteMutation.mutate(v.id)} 
                    />
                  ))}
                </div>
              )}
            </section>
          );
        })
      )}

      <VehicleEditor
        value={editing}
        onClose={() => setEditing(null)}
        onSave={(v) => { 
          upsertMutation.mutate({
            id: v.id || undefined,
            name: v.name,
            plate: v.plate,
            type: v.type,
            tier: v.tier,
            image_url: v.imageUrl,
            seat_layout: v.seatMap
          });
        }}
        loading={upsertMutation.isPending}
      />
    </div>
  );
}

function VehicleCard({ v, onEdit, onDelete }: { v: VehicleTemplate; onEdit: () => void; onDelete: () => void }) {
  const queryClient = useQueryClient();
  const setPlateFn = useServerFn(adminSetVehiclePlate);
  
  const seatCount = countSeatsInMap(v.seatMap);
  const [editingPlate, setEditingPlate] = useState(false);
  const [plateDraft, setPlateDraft] = useState(v.plate);

  const savePlate = async () => {
    const next = plateDraft.trim();
    if (!next) {
      toast.error("Plat tidak boleh kosong");
      return;
    }
    try {
      await setPlateFn({ data: { id: v.id, plate: next } });
      queryClient.invalidateQueries({ queryKey: ["admin-vehicles"] });
      setEditingPlate(false);
      toast.success("Plat diperbarui");
    } catch (e) {
      toast.error("Gagal memperbarui plat");
    }
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex flex-row items-start justify-between space-y-0">
        <div className="min-w-0">
          <CardTitle className="truncate text-base">{v.name}</CardTitle>
          {editingPlate ? (
            <div className="mt-1 flex items-center gap-1">
              <Input
                value={plateDraft}
                onChange={(e) => setPlateDraft(e.target.value.toUpperCase())}
                onKeyDown={(e) => {
                  if (e.key === "Enter") savePlate();
                  if (e.key === "Escape") { setEditingPlate(false); setPlateDraft(v.plate); }
                }}
                className="h-7 w-32 text-xs"
                autoFocus
              />
              <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={savePlate}>OK</Button>
            </div>
          ) : (
            <button
              onClick={() => { setPlateDraft(v.plate); setEditingPlate(true); }}
              className="mt-0.5 inline-flex items-center gap-1 rounded text-xs text-muted-foreground hover:text-foreground"
              title="Klik untuk ubah plat"
            >
              {v.plate} <Pencil className="h-3 w-3 opacity-60" />
            </button>
          )}
        </div>
        <div className="flex flex-col items-end gap-1">
          <Badge variant="outline">{TYPE_LABEL[v.type]}</Badge>
          <Badge className={TIER_TONE[v.tier]} variant="secondary">{TIER_LABEL[v.tier]}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="rounded-xl bg-muted/40 p-2">
          {v.imageUrl && v.seatMap && v.seatMap.length > 0 ? (
            <SeatImageMap imageUrl={v.imageUrl} markers={v.seatMap} />
          ) : (
            <div className="flex h-32 flex-col items-center justify-center gap-1 text-xs text-muted-foreground">
              <ImageIcon className="h-5 w-5" />
              Belum ada denah — klik Edit untuk upload.
            </div>
          )}
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="inline-flex items-center gap-1 text-muted-foreground">
            <Armchair className="h-3.5 w-3.5" /> {seatCount} kursi
          </span>
          <div className="flex gap-1">
            <Button size="sm" variant="ghost" onClick={onEdit}><Pencil className="mr-1 h-3.5 w-3.5" /> Edit</Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="sm" variant="ghost" className="text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Hapus kendaraan?</AlertDialogTitle>
                  <AlertDialogDescription>Jadwal yang memakai kendaraan ini bisa rusak.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Batal</AlertDialogCancel>
                  <AlertDialogAction onClick={onDelete}>Hapus</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function VehicleEditor({ value, onClose, onSave, loading }: { value: VehicleTemplate | null; onClose: () => void; onSave: (v: VehicleTemplate) => void; loading: boolean }) {
  const [v, setV] = useState<VehicleTemplate | null>(value);
  useEffect(() => setV(value), [value]);

  if (!v) return null;
  const seatCount = countSeatsInMap(v.seatMap);
  const canSave = !!v.imageUrl && seatCount > 0 && v.name.trim().length > 0;

  return (
    <Sheet open={!!value} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Edit kendaraan & denah kursi</SheetTitle>
        </SheetHeader>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label className="mb-1 block text-xs">Nama</Label>
            <Input value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} />
          </div>
          <div>
            <Label className="mb-1 block text-xs">Plat</Label>
            <Input value={v.plate} onChange={(e) => setV({ ...v, plate: e.target.value })} />
          </div>
          <div>
            <Label className="mb-1 block text-xs">Jenis kendaraan</Label>
            <Select value={v.type} onValueChange={(x) => setV({ ...v, type: x as VehicleType })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="minicar">Minicar (≈{DEFAULT_CAPACITY.minicar} kursi)</SelectItem>
                <SelectItem value="suv">SUV (≈{DEFAULT_CAPACITY.suv} kursi)</SelectItem>
                <SelectItem value="hiace">Hiace (≈{DEFAULT_CAPACITY.hiace} kursi)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="sm:col-span-2">
            <Label className="mb-1 block text-xs">Tier layanan</Label>
            <Select value={v.tier} onValueChange={(x) => setV({ ...v, tier: x as VehicleTier })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {TIER_ORDER.map((t) => (
                  <SelectItem key={t} value={t}>{TIER_LABEL[t]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="mt-5">
          <div className="mb-2 flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold">Denah kursi</div>
              <p className="text-xs text-muted-foreground">
                Upload foto/skema interior kendaraan, lalu klik untuk menempatkan kursi, sopir, dan pintu.
              </p>
            </div>
            <Badge variant="outline" className="text-xs">{seatCount} kursi</Badge>
          </div>
          <SeatImageEditor
            imageUrl={v.imageUrl}
            markers={v.seatMap ?? []}
            onImageChange={(url) => setV({ ...v, imageUrl: url })}
            onMarkersChange={(seatMap: SeatMarker[]) => setV({ ...v, seatMap })}
          />
        </div>

        <SheetFooter className="mt-5 flex-col gap-2 sm:flex-row">
          {!canSave && (
            <p className="flex-1 text-xs text-amber-700 dark:text-amber-400">
              Lengkapi: gambar denah + minimal 1 kursi + nama kendaraan.
            </p>
          )}
          <div className="flex gap-2 sm:ml-auto">
            <Button variant="outline" onClick={onClose}>Batal</Button>
            <Button
              disabled={!canSave || loading}
              onClick={() =>
                onSave({
                  ...v,
                  seatMap: v.seatMap ? renumberSeatMap(v.seatMap) : [],
                })
              }
            >
              {loading ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null} Simpan
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
