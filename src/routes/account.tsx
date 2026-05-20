import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Bell, HelpCircle, Settings, LogOut, Shield, Loader2, Camera, Save } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { PageHeader } from "@/shared/components/PageHeader";
import { useAuth } from "@/shared/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { getMyProfile, updateMyProfile } from "@/features/account/services/profile.functions";
import { Input } from "@/shared/components/ui/input";
import { Button } from "@/shared/components/ui/button";

export const Route = createFileRoute("/account")({
  head: () => ({ meta: [{ title: "Akun — PYU-GO" }] }),
  component: AccountPage,
});

function AccountPage() {
  const { user, loading, signOut } = useAuth();
  const nav = useNavigate();
  const qc = useQueryClient();
  const fetchProfile = useServerFn(getMyProfile);
  const updateProfileFn = useServerFn(updateMyProfile);

  const [isAdmin, setIsAdmin] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: profile } = useQuery({
    queryKey: ["my-profile"],
    queryFn: () => fetchProfile(),
    enabled: !!user,
  });

  useEffect(() => {
    if (profile) {
      setName(profile.full_name ?? "");
      setPhone(profile.phone ?? "");
    }
  }, [profile]);

  useEffect(() => {
    if (!user) return;
    supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle()
      .then(({ data }) => setIsAdmin(!!data));
  }, [user]);

  useEffect(() => { if (!loading && !user) nav({ to: "/auth/login" }); }, [loading, user, nav]);

  const saveMutation = useMutation({
    mutationFn: async (vars: { full_name?: string; phone?: string; avatar_url?: string }) => updateProfileFn({ data: vars }),
    onSuccess: () => {
      toast.success("Profil tersimpan");
      qc.invalidateQueries({ queryKey: ["my-profile"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Gagal menyimpan"),
  });

  const handleLogout = async () => {
    await signOut();
    toast.success("Berhasil keluar");
    nav({ to: "/auth/login" });
  };

  const handleUpload = async (file: File) => {
    if (!user) return;
    if (file.size > 2 * 1024 * 1024) { toast.error("Maksimal 2MB"); return; }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
      const path = `${user.id}/avatar-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("avatars").upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;
      const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);
      await saveMutation.mutateAsync({ avatar_url: publicUrl });
    } catch (e: any) {
      toast.error(e?.message ?? "Upload gagal");
    } finally {
      setUploading(false);
    }
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

  const displayName = profile?.full_name ?? user.email?.split("@")[0] ?? "Pengguna";
  const initial = displayName.charAt(0).toUpperCase();
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
            <button
              onClick={() => fileRef.current?.click()}
              className="relative grid h-16 w-16 place-items-center overflow-hidden rounded-full bg-white/20 text-xl font-bold backdrop-blur"
              aria-label="Ganti foto profil"
            >
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt={displayName} className="h-full w-full object-cover" />
              ) : initial}
              <span className="absolute bottom-0 right-0 grid h-5 w-5 place-items-center rounded-full bg-primary text-primary-foreground">
                {uploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Camera className="h-3 w-3" />}
              </span>
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f); e.currentTarget.value = ""; }}
            />
            <div className="min-w-0">
              <div className="text-base font-bold truncate">{displayName}</div>
              <div className="text-xs opacity-90 truncate">{user.email}</div>
            </div>
          </div>
        </div>

        <div className="mt-4 rounded-2xl bg-card p-4 shadow-soft">
          <div className="mb-3 text-sm font-bold">Info Pribadi</div>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-semibold text-muted-foreground">Nama Lengkap</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nama lengkap" />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground">Nomor HP</label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="08xxxxxxxxxx" inputMode="tel" />
            </div>
            <Button
              className="w-full"
              disabled={saveMutation.isPending}
              onClick={() => saveMutation.mutate({ full_name: name || undefined, phone: phone || undefined })}
            >
              {saveMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Simpan
            </Button>
          </div>
        </div>

        <div className="mt-4 overflow-hidden rounded-2xl bg-card shadow-soft">
          {items.map((it, i) => {
            const Icon = it.icon;
            return (
              <button key={i} className="flex w-full items-center gap-3 border-b border-border px-4 py-3 text-left last:border-0 hover:bg-muted">
                <Icon className="h-5 w-5 text-primary" />
                <span className="flex-1 text-sm font-medium">{it.label}</span>
              </button>
            );
          })}
        </div>

        {isAdmin && (
          <button onClick={() => nav({ to: "/admin" })} className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-primary/30 bg-primary/5 py-3 text-sm font-semibold text-primary">
            <Shield className="h-4 w-4" /> Buka Admin Console
          </button>
        )}

        <button onClick={handleLogout} className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-destructive/30 bg-destructive/5 py-3 text-sm font-semibold text-destructive">
          <LogOut className="h-4 w-4" /> Keluar
        </button>

        <div className="mt-6 text-center text-xs text-muted-foreground">PYU-GO v1.0.0</div>
      </div>
    </div>
  );
}
