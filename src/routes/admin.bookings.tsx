import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { formatRupiah } from "@/shared/utils/utils";
import type { BookingStatus } from "@/features/admin/types";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/shared/components/ui/sheet";
import { Search, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { StatusBadge } from "@/features/admin/components/StatusBadge";
import { SeatImageMap } from "@/features/admin/components/SeatImageMap";
import { toast } from "sonner";
import { Separator } from "@/shared/components/ui/separator";
import { 
  adminListBookings, 
  adminListPickupPoints, 
  adminSetBookingStatus 
} from "@/features/admin/services/admin.functions";

export const Route = createFileRoute("/admin/bookings")({
  component: BookingsPage,
});

const PAGE = 10;

function BookingsPage() {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<string>("all");
  const [pickup, setPickup] = useState<string>("all");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<any | null>(null);

  const listBookingsFn = useServerFn(adminListBookings);
  const listPickupsFn = useServerFn(adminListPickupPoints);
  const setStatusFn = useServerFn(adminSetBookingStatus);

  const { data: rawBookings = [], isLoading: loadingBookings } = useQuery({
    queryKey: ["admin", "bookings"],
    queryFn: () => listBookingsFn(),
  });

  const { data: pickupPoints = [], isLoading: loadingPickups } = useQuery({
    queryKey: ["admin", "pickup-points"],
    queryFn: () => listPickupsFn(),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string, status: BookingStatus }) => 
      setStatusFn({ data: { id, status } }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "bookings"] });
      toast.success("Status diperbarui");
      if (selected?.id === variables.id) {
        setSelected({ ...selected, status: variables.status });
      }
    },
    onError: (err: any) => {
      toast.error("Gagal memperbarui status: " + err.message);
    }
  });

  const bookings = useMemo(() => {
    return rawBookings.map((b: any) => ({
      ...b,
      pickupId: b.schedules?.pickup_point_id,
      scheduleId: b.schedule_id,
      passengerName: b.passenger_name,
      passengerPhone: b.passenger_phone,
      createdAt: b.created_at,
      seats: b.seat_bookings?.map((sb: any) => sb.seat_no) || [],
      amount: b.total,
    }));
  }, [rawBookings]);

  const filtered = useMemo(() => {
    const s = q.toLowerCase();
    return bookings.filter((b: any) => {
      if (status !== "all" && b.status !== status) return false;
      if (pickup !== "all" && b.pickupId !== pickup) return false;
      if (s && !(b.code.toLowerCase().includes(s) || b.passengerName.toLowerCase().includes(s))) return false;
      return true;
    });
  }, [bookings, status, pickup, q]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE));
  const slice = filtered.slice((page - 1) * PAGE, page * PAGE);

  if (loadingBookings || loadingPickups) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Bookings</h1>
        <p className="text-sm text-muted-foreground">Kelola pesanan shuttle penumpang.</p>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="mb-3 flex flex-wrap gap-2">
            <div className="relative min-w-[240px] flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input className="pl-9" placeholder="Cari kode / nama penumpang…" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
            </div>
            <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
              <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="boarded">Boarded</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
                <SelectItem value="refunded">Refunded</SelectItem>
              </SelectContent>
            </Select>
            <Select value={pickup} onValueChange={(v) => { setPickup(v); setPage(1); }}>
              <SelectTrigger className="w-[220px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua pickup</SelectItem>
                {pickupPoints.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Passenger</TableHead>
                  <TableHead>Pickup</TableHead>
                  <TableHead>Seats</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {slice.map((b: any) => {
                  const p = pickupPoints.find((pp: any) => pp.id === b.pickupId);
                  return (
                    <TableRow key={b.id} className="cursor-pointer hover:bg-muted/40" onClick={() => setSelected(b)}>
                      <TableCell className="font-mono text-xs">{b.code}</TableCell>
                      <TableCell>
                        <div className="font-medium">{b.passengerName}</div>
                        <div className="text-xs text-muted-foreground">{b.passengerPhone}</div>
                      </TableCell>
                      <TableCell>{p?.name ?? "—"}</TableCell>
                      <TableCell>{b.seats.join(", ")}</TableCell>
                      <TableCell>{formatRupiah(b.amount)}</TableCell>
                      <TableCell><StatusBadge status={b.status} /></TableCell>
                      <TableCell className="text-xs text-muted-foreground">{new Date(b.createdAt).toLocaleDateString("id-ID")}</TableCell>
                    </TableRow>
                  );
                })}
                {slice.length === 0 && (
                  <TableRow><TableCell colSpan={7} className="py-8 text-center text-sm text-muted-foreground">Tidak ada booking.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          <div className="mt-3 flex items-center justify-between text-sm text-muted-foreground">
            <div>{filtered.length} booking</div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}><ChevronLeft className="h-4 w-4" /></Button>
              <span>Page {page} / {totalPages}</span>
              <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}><ChevronRight className="h-4 w-4" /></Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
          {selected && (() => {
            const p = pickupPoints.find((pp: any) => pp.id === selected.pickupId);
            const sc = selected.schedules;
            const v = sc?.vehicles;
            const depTime = sc?.departure_at ? sc.departure_at.split("T")[1].substring(0, 5) : "—";
            const arrTime = sc?.arrival_at ? sc.arrival_at.split("T")[1].substring(0, 5) : "—";

            return (
              <>
                <SheetHeader>
                  <SheetTitle className="flex items-center gap-2">
                    <span className="font-mono">{selected.code}</span>
                    <StatusBadge status={selected.status} />
                  </SheetTitle>
                </SheetHeader>
                <div className="mt-4 space-y-4 text-sm">
                  <Section title="Penumpang">
                    <Row k="Nama" v={selected.passengerName} />
                    <Row k="Telepon" v={selected.passengerPhone} />
                  </Section>
                  <Section title="Perjalanan">
                    <Row k="Pickup" v={p?.name ?? "—"} />
                    <Row k="Jadwal" v={`${depTime} → ${arrTime}`} />
                    <Row k="Kendaraan" v={v ? `${v.name} • ${v.plate}` : "—"} />
                    <Row k="Kursi" v={selected.seats.join(", ")} />
                  </Section>
                  <Section title="Pembayaran">
                    <Row k="Total" v={formatRupiah(selected.amount)} />
                    <Row k="Dibuat" v={new Date(selected.createdAt).toLocaleString("id-ID")} />
                  </Section>
                  {v && v.image_url && v.seat_layout && v.seat_layout.length > 0 && (
                    <div>
                      <div className="mb-1 text-xs font-semibold uppercase text-muted-foreground">Layout Kursi</div>
                      <SeatImageMap imageUrl={v.image_url} markers={v.seat_layout} booked={selected.seats} />
                    </div>
                  )}
                  <Separator />
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" disabled={selected.status === "paid" || statusMutation.isPending} onClick={() => statusMutation.mutate({ id: selected.id, status: "paid" })}>Confirm Paid</Button>
                    <Button size="sm" variant="secondary" disabled={selected.status === "boarded" || statusMutation.isPending} onClick={() => statusMutation.mutate({ id: selected.id, status: "boarded" })}>Mark Boarded</Button>
                    <Button size="sm" disabled={selected.status === "completed" || statusMutation.isPending} onClick={() => statusMutation.mutate({ id: selected.id, status: "completed" })}>Complete</Button>
                    <Button size="sm" variant="outline" disabled={selected.status === "cancelled" || statusMutation.isPending} onClick={() => statusMutation.mutate({ id: selected.id, status: "cancelled" })}>Cancel</Button>
                  </div>
                </div>
              </>
            );
          })()}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1 text-xs font-semibold uppercase text-muted-foreground">{title}</div>
      <div className="space-y-1 rounded-xl border bg-card p-3">{children}</div>
    </div>
  );
}
function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-muted-foreground">{k}</span>
      <span className="text-right font-medium">{v}</span>
    </div>
  );
}
