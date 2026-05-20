import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Bell, HelpCircle, Settings, LogOut, Shield, Loader2 } from "lucide-react";
import { PageHeader } from "@/shared/components/PageHeader";
import { useAuth } from "@/shared/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/account")({
  head: () => ({ meta: [{ title: "Akun — PYU-GO" }] }),
  component: AccountPage,
});

function AccountPage() {
  const { user, loading, signOut } = useAuth();
  const nav = useNavigate();
  const [profile, setProfile] = useState<{ full_name: string | null; phone: string | null } | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("full_name, phone").eq("id", user.id).maybeSingle()
      .then(({ data }) => setProfile(data ?? { full_name: null, phone: null }));
    supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle()
      .then(({ data }) => setIsAdmin(!!data));
  }, [user]);

  useEffect(() => {
    if (!loading && !user) nav({ to: "/auth/login" });
  }, [loading, user, nav]);

  const handleLogout = async () => {
    await signOut();
    toast.success("Berhasil keluar");
    nav({ to: "/auth/login" });
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-secondary/30">
        <PageHeader title="Akun Saya" back={false} />
        <div className="flex items-center justify-center p-10 text-sm text-muted-foreground">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Memuat...
        </div>
      </div>
    );
  }

  const name = profile?.full_name ?? user.email?.split("@")[0] ?? "Pengguna";
  const initial = name.charAt(0).toUpperCase();
  const items = [
    { icon: Bell, label: "Notifikasi" },
    { icon: Shield, label: "Keamanan" },
    { icon: HelpCircle, label: "Pusat Bantuan" },
    { icon: Settings, label: "Pengaturan" },
  ];

  return (
    <div className="min-h-screen bg-secondary/30 pb-24">
      <PageHeader title="Akun Saya" back={false} />

      <div className="p-4">
        <div className="rounded-2xl bg-hero-gradient p-5 text-primary-foreground shadow-card">
          <div className="flex items-center gap-3">
            <div className="grid h-14 w-14 place-items-center rounded-full bg-white/20 text-xl font-bold backdrop-blur">
              {initial}
            </div>
            <div className="min-w-0">
              <div className="text-base font-bold truncate">{name}</div>
              <div className="text-xs opacity-90 truncate">{profile?.phone ?? user.email}</div>
            </div>
          </div>
        </div>

        <div className="mt-4 overflow-hidden rounded-2xl bg-card shadow-soft">
          {items.map((it, i) => {
            const Icon = it.icon;
            return (
              <button
                key={i}
                className="flex w-full items-center gap-3 border-b border-border px-4 py-3 text-left last:border-0 hover:bg-muted"
              >
                <Icon className="h-5 w-5 text-primary" />
                <span className="flex-1 text-sm font-medium">{it.label}</span>
              </button>
            );
          })}
        </div>

        {isAdmin && (
          <button
            onClick={() => nav({ to: "/admin" })}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-primary/30 bg-primary/5 py-3 text-sm font-semibold text-primary"
          >
            <Shield className="h-4 w-4" /> Buka Admin Console
          </button>
        )}

        <button
          onClick={handleLogout}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-destructive/30 bg-destructive/5 py-3 text-sm font-semibold text-destructive"
        >
          <LogOut className="h-4 w-4" /> Keluar
        </button>

        <div className="mt-6 text-center text-xs text-muted-foreground">PYU-GO v1.0.0</div>
      </div>
    </div>
  );
}
