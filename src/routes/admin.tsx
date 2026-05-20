import { createFileRoute, Outlet, useNavigate, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { SidebarProvider, SidebarTrigger } from "@/shared/components/ui/sidebar";
import { AdminSidebar } from "@/features/admin/components/AdminSidebar";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { LogOut, Loader2 } from "lucide-react";
import { Toaster } from "@/shared/components/ui/sonner";
import { supabase } from "@/integrations/supabase/client";
import { checkIsAdmin } from "@/features/admin/services/admin.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Admin — PYU-GO" }] }),
  beforeLoad: async ({ context }) => {
    // Note: We use the server function directly. 
    // In TanStack Start, this will run on the server if possible.
    try {
      const res = await checkIsAdmin();
      if (!res.isAdmin) {
        throw redirect({ to: "/", search: { error: "Akses admin diperlukan" } });
      }
    } catch (e) {
      if (e instanceof Error && e.message.includes("redirect")) throw e;
      throw redirect({ to: "/auth/login" });
    }
  },
  component: AdminLayout,
});

function AdminLayout() {
  const nav = useNavigate();

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-muted/30">
        <AdminSidebar />
        <div className="flex flex-1 flex-col">
          <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-card/80 px-4 backdrop-blur">
            <SidebarTrigger />
            <div className="flex-1 text-sm font-semibold">Admin Console</div>
            <Badge variant="outline" className="border-primary/40 bg-primary/5 text-primary">Live</Badge>
            <Button variant="ghost" size="sm" onClick={async () => { await supabase.auth.signOut(); nav({ to: "/" }); }}>
              <LogOut className="mr-1 h-4 w-4" /> Keluar
            </Button>
          </header>
          <main className="flex-1 p-4 md:p-6"><Outlet /></main>
        </div>
        <Toaster />
      </div>
    </SidebarProvider>
  );
}
