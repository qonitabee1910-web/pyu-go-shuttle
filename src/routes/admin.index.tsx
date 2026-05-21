import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table";
import { StatusBadge } from "@/features/admin/components/StatusBadge";
import { formatRupiah } from "@/shared/utils/utils";
import { Calendar, Ticket, TrendingUp, Users, Loader2 } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { adminKpis, adminRevenueSeries, adminActiveBookings } from "@/features/admin/services/admin.functions";

export const Route = createFileRoute("/admin/")({
  component: Dashboard,
});

function Dashboard() {
  const kpiFn = useServerFn(adminKpis);
  const revFn = useServerFn(adminRevenueSeries);
  const activeFn = useServerFn(adminActiveBookings);

  const { data: kpi } = useQuery({ queryKey: ["admin-kpi"], queryFn: () => kpiFn() });
  const { data: series = [] } = useQuery({ queryKey: ["admin-rev-30"], queryFn: () => revFn({ data: { days: 30 } }) });
  const { data: active = [], isLoading } = useQuery({ queryKey: ["admin-active"], queryFn: () => activeFn() });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Ringkasan operasional PYU - GO realtime.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi icon={<Ticket className="h-5 w-5" />} label="Booking hari ini" value={kpi?.bookingsToday ?? "—"} />
        <Kpi icon={<TrendingUp className="h-5 w-5" />} label="Pendapatan bulan ini" value={kpi ? formatRupiah(kpi.revenueMonth) : "—"} />
        <Kpi icon={<Calendar className="h-5 w-5" />} label="Trip berlangsung" value={kpi?.tripsOngoing ?? "—"} />
        <Kpi icon={<Users className="h-5 w-5" />} label="Driver online" value={kpi?.driversOnline ?? "—"} />
      </div>

      <Card>
        <CardHeader><CardTitle>Pendapatan 30 hari</CardTitle></CardHeader>
        <CardContent className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={series}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis dataKey="date" tickFormatter={(d) => d.slice(5)} fontSize={11} />
              <YAxis tickFormatter={(v) => `${Math.round(v / 1000)}k`} fontSize={11} />
              <Tooltip
                formatter={(v: number) => formatRupiah(v)}
                labelFormatter={(l) => `Tanggal ${l}`}
                contentStyle={{ borderRadius: 8, fontSize: 12 }}
              />
              <Line type="monotone" dataKey="total" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Booking aktif</CardTitle>
          <Link to="/admin/bookings" className="text-xs font-semibold text-primary">Lihat semua</Link>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Penumpang</TableHead>
                  <TableHead>Rute</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {active.map((b: any) => (
                  <TableRow key={b.id}>
                    <TableCell className="font-mono text-xs">{b.code}</TableCell>
                    <TableCell>{b.passenger_name}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {b.schedules?.routes?.origin ?? "—"} → {b.schedules?.routes?.destination ?? "—"}
                    </TableCell>
                    <TableCell>{formatRupiah(b.total)}</TableCell>
                    <TableCell><StatusBadge status={b.status} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
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
  );
}
