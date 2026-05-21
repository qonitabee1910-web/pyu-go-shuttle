import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Progress } from "@/shared/components/ui/progress";
import { adminSeatOccupancy, adminRidePoints } from "@/features/admin/services/admin.functions";

export const Route = createFileRoute("/admin/analytics")({
  component: AnalyticsPage,
});

function AnalyticsPage() {
  const occFn = useServerFn(adminSeatOccupancy);
  const ptsFn = useServerFn(adminRidePoints);
  const { data: occupancy = [] } = useQuery({ queryKey: ["admin-occupancy"], queryFn: () => occFn() });
  const { data: points = [] } = useQuery({ queryKey: ["admin-ride-points"], queryFn: () => ptsFn({ data: { days: 30 } }) });

  // Heatmap-like binning into 30x20 grid using min/max bounds
  const heat = useMemo(() => {
    if (points.length === 0) return null;
    const lats = points.map((p) => p.lat);
    const lngs = points.map((p) => p.lng);
    const minLat = Math.min(...lats), maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
    const cols = 30, rows = 20;
    const grid: number[][] = Array.from({ length: rows }, () => Array(cols).fill(0));
    let max = 0;
    points.forEach((p) => {
      const cx = Math.min(cols - 1, Math.floor(((p.lng - minLng) / (maxLng - minLng || 1)) * cols));
      const cy = Math.min(rows - 1, Math.floor(((maxLat - p.lat) / (maxLat - minLat || 1)) * rows));
      grid[cy][cx] += 1;
      if (grid[cy][cx] > max) max = grid[cy][cx];
    });
    return { grid, max, rows, cols };
  }, [points]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Analytics</h1>
        <p className="text-sm text-muted-foreground">Okupansi kursi & heatmap titik jemput ride-hailing.</p>
      </div>

      <Card>
        <CardHeader><CardTitle>Okupansi kursi (20 jadwal terbaru)</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {occupancy.length === 0 && <div className="text-sm text-muted-foreground">Belum ada data jadwal.</div>}
          {occupancy.map((s: any) => (
            <div key={s.id}>
              <div className="flex justify-between text-sm">
                <span className="font-medium">{s.label}</span>
                <span className="text-muted-foreground">{s.booked}/{s.total} ({s.pct}%)</span>
              </div>
              <div className="text-[10px] text-muted-foreground">{new Date(s.when).toLocaleString("id-ID")}</div>
              <Progress value={s.pct} className="mt-1 h-2" />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Heatmap pickup ride (30 hari, {points.length} titik)</CardTitle></CardHeader>
        <CardContent>
          {!heat ? (
            <div className="text-sm text-muted-foreground">Belum ada data ride.</div>
          ) : (
            <div
              className="grid gap-px rounded bg-border"
              style={{ gridTemplateColumns: `repeat(${heat.cols}, 1fr)` }}
            >
              {heat.grid.flatMap((row, y) =>
                row.map((v, x) => {
                  const intensity = heat.max ? v / heat.max : 0;
                  const bg = v === 0
                    ? "hsl(var(--muted))"
                    : `oklch(70% ${0.15 + intensity * 0.2} ${20 + (1 - intensity) * 60})`;
                  return (
                    <div
                      key={`${y}-${x}`}
                      className="aspect-square"
                      style={{ backgroundColor: bg, opacity: v === 0 ? 0.3 : 0.4 + intensity * 0.6 }}
                      title={`${v} pickup`}
                    />
                  );
                }),
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
