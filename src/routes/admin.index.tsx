import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { formatRupiah, getJakartaNow } from "@/shared/utils/utils";
import { Calendar, Ticket, TrendingUp, Users, Loader2 } from "lucide-react";
import { StatusBadge } from "@/features/admin/components/StatusBadge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table";
import { adminListBookings, adminListSchedules, adminListVehicles, adminListPickupPoints } from "@/features/admin/services/admin.functions";

export const Route = createFileRoute("/admin/")({
  component: Dashboard,
});

function Dashboard() {
  const fetchBookings = useServerFn(adminListBookings);
  const fetchSchedules = useServerFn(adminListSchedules);
  const fetchVehicles = useServerFn(adminListVehicles);
  const fetchPickups = useServerFn(adminListPickupPoints);

  const { data: bookings = [], isLoading: bLoading } = useQuery({ queryKey: ["admin-bookings"], queryFn: () => fetchBookings() });
  const { data: schedules = [], isLoading: sLoading } = useQuery({ queryKey: ["admin-schedules"], queryFn: () => fetchSchedules() });
  const { data: vehicles = [], isLoading: vLoading } = useQuery({ queryKey: ["admin-vehicles"], queryFn: () => fetchVehicles() });
  const { data: pickupPoints = [], isLoading: pLoading } = useQuery({ queryKey: ["admin-pickups"], queryFn: () => fetchPickups() });

  const stats = useMemo(() => {
    const today = getJakartaNow().toDateString();
    const todays = bookings.filter((b: any) => b.status === "paid" && new Date(b.created_at).toDateString() === today);
    const revenue = bookings.filter((b: any) => b.status !== "cancelled").reduce((s: number, b: any) => s + (b.total ?? 0), 0);
    
    // In real DB, seats are linked via seat_bookings
    const seatsBooked = bookings.filter((b: any) => b.status === "paid" || b.status === "boarded").length; 
    
    // This is a simplified occupancy for the dashboard
    const activeSchedulesCount = schedules.filter((s: any) => s.active).length;
    
    return {
      bookingsToday: todays.length,
      revenue,
      occupancy: 0, // Simplified for now
      activeSchedules: activeSchedulesCount,
    };
  }, [bookings, schedules]);

  const topPickups = useMemo(() => {
    const map = new Map<string, number>();
    bookings.forEach((b: any) => {
      const pid = b.schedules?.pickup_point_id;
      if (pid) map.set(pid, (map.get(pid) ?? 0) + 1);
    });
    return pickupPoints
      .map((p: any) => ({ ...p, count: map.get(p.id) ?? 0 }))
      .sort((a: any, b: any) => b.count - a.count)
      .slice(0, 5);
  }, [bookings, pickupPoints]);

  const recent = [...bookings].slice(0, 8);

  if (bLoading || sLoading || vLoading || pLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Ringkasan operasional PYU - GO hari ini.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi icon={<Ticket className="h-5 w-5" />} label="Bookings today" value={stats.bookingsToday} />
        <Kpi icon={<TrendingUp className="h-5 w-5" />} label="Revenue (total)" value={formatRupiah(stats.revenue)} />
        <Kpi icon={<Users className="h-5 w-5" />} label="Active Bookings" value={bookings.length} />
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
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recent.map((b: any) => (
                  <TableRow key={b.id}>
                    <TableCell className="font-mono text-xs">{b.code}</TableCell>
                    <TableCell>{b.passenger_name}</TableCell>
                    <TableCell>{formatRupiah(b.total)}</TableCell>
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
            {topPickups.map((p: any) => {
              const max = topPickups[0]?.count || 1;
              return (                <div key={p.id}>
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">{p.name}</span>
                    <span className="text-muted-foreground">{p.count} bookings</span>
                  </div>
                  <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div className="h-full bg-primary" style={{ width: `${(p.count / max) * 100}%` }} />
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
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-xs font-medium text-muted-foreground">{label}</CardTitle>
        <div className="text-primary">{icon}</div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
  )
}
