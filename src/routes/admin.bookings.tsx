import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useAdmin } from "@/features/admin/store/admin";
import { formatRupiah } from "@/shared/utils/utils";
import type { AdminBooking, BookingStatus } from "@/features/admin/store/admin";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/shared/components/ui/sheet";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";
import { StatusBadge } from "@/features/admin/components/StatusBadge";
import { SeatImageMap } from "@/features/admin/components/SeatImageMap";
import { toast } from "sonner";
import { Separator } from "@/shared/components/ui/separator";

export const Route = createFileRoute("/admin/bookings")({
  component: BookingsPage,
});

const PAGE = 10;

function BookingsPage() {
  const { bookings, pickupPoints, schedules, vehicles, setBookingStatus } = useAdmin();
  const [status, setStatus] = useState<string>("all");
  const [pickup, setPickup] = useState<string>("all");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<AdminBooking | null>(null);

  const filtered = useMemo(() => {
    const s = q.toLowerCase();
    return bookings.filter((b) => {
      if (status !== "all" && b.status !== status) return false;
      if (pickup !== "all" && b.pickupId !== pickup) return false;
      if (s && !(b.code.toLowerCase().includes(s) || b.passengerName.toLowerCase().includes(s))) return false;
      return true;
    });
  }, [bookings, status, pickup, q]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE));
  const slice = filtered.slice((page - 1) * PAGE, page * PAGE);

  const updateStatus = (id: string, st: BookingStatus) => {
    setBookingStatus(id, st);
    toast.success("Status diperbarui");
    if (selected?.id === id) setSelected({ ...selected, status: st });
  };

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
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="boarded">Boarded</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
                <SelectItem value="refunded">Refunded</SelectItem>
              </SelectContent>
            </Select>
            <Select value={pickup} onValueChange={(v) => { setPickup(v); setPage(1); }}>
              <SelectTrigger className="w-[220px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua pickup</SelectItem>
                {pickupPoints.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
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
                {slice.map((b) => {
                  const p = pickupPoints.find((pp) => pp.id === b.pickupId);
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
            const p = pickupPoints.find((pp) => pp.id === selected.pickupId);
            const sc = schedules.find((s) => s.id === selected.scheduleId);
            const v = vehicles.find((vv) => vv.id === sc?.vehicleId);
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
                    <Row k="Jadwal" v={sc ? `${sc.departureTime} → ${sc.arrivalTime}` : "—"} />
                    <Row k="Kendaraan" v={v ? `${v.name} • ${v.plate}` : "—"} />
                    <Row k="Kursi" v={selected.seats.join(", ")} />
                  </Section>
                  <Section title="Pembayaran">
                    <Row k="Total" v={formatRupiah(selected.amount)} />
                    <Row k="Dibuat" v={new Date(selected.createdAt).toLocaleString("id-ID")} />
                  </Section>
                  {v && v.imageUrl && v.seatMap && v.seatMap.length > 0 && (
                    <div>
                      <div className="mb-1 text-xs font-semibold uppercase text-muted-foreground">Layout Kursi</div>
                      <SeatImageMap imageUrl={v.imageUrl} markers={v.seatMap} booked={selected.seats} />
                    </div>
                  )}
                  <Separator />
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" disabled={selected.status === "paid"} onClick={() => updateStatus(selected.id, "paid")}>Confirm Paid</Button>
                    <Button size="sm" variant="secondary" disabled={selected.status === "boarded"} onClick={() => updateStatus(selected.id, "boarded")}>Mark Boarded</Button>
                    <Button size="sm" disabled={selected.status === "completed"} onClick={() => updateStatus(selected.id, "completed")}>Complete</Button>
                    <Button size="sm" variant="outline" disabled={selected.status === "cancelled"} onClick={() => updateStatus(selected.id, "cancelled")}>Cancel</Button>
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
