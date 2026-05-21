import { createFileRoute, Outlet, redirect, Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { checkIsDriver } from "@/features/driver/services/driver.functions";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/shared/components/ui/button";
import { LogOut, LayoutDashboard, Calendar, Car } from "lucide-react";
import { Toaster } from "@/shared/components/ui/sonner";

export const Route = createFileRoute("/driver")({
  head: () => ({ meta: [{ title: "Driver — PYU-GO" }] }),
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/auth/login" });
    try {
      const r = await checkIsDriver();
      if (!r.isDriver) throw redirect({ to: "/" });
    } catch (e) {
      if (e instanceof Error && e.message.includes("redirect")) throw e;
      throw redirect({ to: "/" });
    }
  },
  component: DriverLayout,
});

function DriverLayout() {
  const nav = useNavigate();
  const path = useRouterState({ select: (r) => r.location.pathname });
  const items = [
    { to: "/driver", label: "Beranda", icon: LayoutDashboard, exact: true },
    { to: "/driver/trips", label: "Trip", icon: Calendar },
    { to: "/driver/rides", label: "Ride", icon: Car },
  ];
  return (
    <div className="min-h-screen bg-muted/30 pb-20">
      <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-card/90 px-4 backdrop-blur">
        <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground font-bold">D</div>
        <div className="flex-1 text-sm font-semibold">Driver Console</div>
        <Button variant="ghost" size="sm" onClick={async () => { await supabase.auth.signOut(); nav({ to: "/" }); }}>
          <LogOut className="mr-1 h-4 w-4" /> Keluar
        </Button>
      </header>
      <main className="mx-auto max-w-3xl p-4"><Outlet /></main>
      <nav className="fixed bottom-0 left-1/2 z-40 w-full max-w-md -translate-x-1/2 border-t border-border bg-card/95 backdrop-blur shadow-float">
        <ul className="grid grid-cols-3">
          {items.map((it) => {
            const active = it.exact ? path === it.to : path.startsWith(it.to);
            const Icon = it.icon;
            return (
              <li key={it.to}>
                <Link to={it.to} className="flex flex-col items-center justify-center gap-1 py-2.5 text-xs">
                  <Icon className={`h-5 w-5 ${active ? "text-primary" : "text-muted-foreground"}`} />
                  <span className={active ? "font-semibold text-primary" : "text-muted-foreground"}>{it.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <Toaster />
    </div>
  );
}
