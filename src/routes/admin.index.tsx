import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { useAdmin } from "@/features/admin/store/admin";
import { formatRupiah } from "@/shared/utils/utils";
import { Calendar, Ticket, TrendingUp, Users } from "lucide-react";
import { StatusBadge } from "@/features/admin/components/StatusBadge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table";

export const Route = createFileRoute("/admin/")({
  component: Dashboard,
});

function Dashboard() {
  const { bookings, schedules, pickupPoints, vehicles } = useAdmin();

  const stats = useMemo(() => {
    const today = new Date().toDateString();
    const todays = bookings.filter((b) => b.status === "paid" && new Date(b.createdAt).toDateString() === today);
    const revenue = bookings.filter((b) => b.status !== "cancelled").reduce((s, b) => s + b.amount, 0);
    const seatsBooked = bookings.filter((b) => b.status === "paid" || b.status === "boarded").reduce((s, b) => s + b.seats.length, 0);
    const seatsTotal = schedules.reduce((s, sc) => {
      const v = vehicles.find((vv) => vv.id === sc.vehicleId);
      const count = (v?.seatMap ?? []).filter((m) => m.kind === "seat").length;
      return s + count;
    }, 0);
    const occ = seatsTotal ? Math.round((seatsBooked / seatsTotal) * 100) : 0;
    return {
      bookingsToday: todays.length,
      revenue,
      occupancy: occ,
      activeSchedules: schedules.filter((s) => s.active).length,
    };
  }, [bookings, schedules, vehicles]);

  const topPickups = useMemo(() => {
    const map = new Map<string, number>();
    bookings.forEach((b) => map.set(b.pickupId, (map.get(b.pickupId) ?? 0) + b.seats.length));
    return pickupPoints
      .map((p) => ({ ...p, count: map.get(p.id) ?? 0 }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [bookings, pickupPoints]);

  const recent = [...bookings].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)).slice(0, 8);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Ringkasan operasional PYU - GO hari ini.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi icon={<Ticket className="h-5 w-5" />} label="Bookings today" value={stats.bookingsToday} />
        <Kpi icon={<TrendingUp className="h-5 w-5" />} label="Revenue (total)" value={formatRupiah(stats.revenue)} />
        <Kpi icon={<Users className="h-5 w-5" />} label="Seat occupancy" value={`${stats.occupancy}%`} />
        <Kpi icon={<Calendar className="h-5 w-5" />} label="Active schedules" value={stats.activeSchedules} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent bookings</CardTitle>
            <Link to="/admin/bookings" className="text-xs font-semibold text-primary">View all</Link>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Passenger</TableHead>
                  <TableHead>Seats</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recent.map((b) => (
                  <TableRow key={b.id}>
                    <TableCell className="font-mono text-xs">{b.code}</TableCell>
                    <TableCell>{b.passengerName}</TableCell>
                    <TableCell>{b.seats.length}</TableCell>
                    <TableCell>{formatRupiah(b.amount)}</TableCell>
                    <TableCell><StatusBadge status={b.status} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Top pickup points</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {topPickups.map((p) => {
              const max = topPickups[0]?.count || 1;
              return (
                <div key={p.id}>
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">{p.name}</span>
                    <span className="text-muted-foreground">{p.count} seats</span>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${(p.count / max) * 100}%` }} />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Kpi({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-5">
        <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary">{icon}</div>
        <div>
          <div className="text-xs font-medium text-muted-foreground">{label}</div>
          <div className="text-xl font-bold">{value}</div>
        </div>
      </CardContent>
    </Card>
  );
}
