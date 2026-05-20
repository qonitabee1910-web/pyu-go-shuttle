import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { motion } from "framer-motion";
import { Mail, Lock, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import logo from "@/assets/logo.png";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { handleError } from "@/shared/utils/error-handler";

export const Route = createFileRoute("/auth/login")({
  head: () => ({ meta: [{ title: "Masuk — PYU-GO" }] }),
  component: LoginPage,
});

function LoginPage() {
  const [show, setShow] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const nav = useNavigate();
  const search = Route.useSearch();
  const redirect = (search as any).redirect || "/";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      toast.success("Berhasil masuk");
      nav({ to: redirect });
    } catch (err: any) {
      handleError(err, "Login");
    } finally {
      setLoading(false);
    }
  };

  const google = async () => {
    setLoading(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (result.error) throw result.error;
      if (result.redirected) return;
      nav({ to: "/" });
    } catch (err: any) {
      handleError(err, "OAuth");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-hero-gradient">
      <div className="px-6 pt-10 text-primary-foreground">
        <img src={logo} alt="PYU-GO" className="h-10 w-auto brightness-0 invert" width={140} height={36} />
        <h1 className="mt-8 text-3xl font-extrabold leading-tight">Selamat datang kembali</h1>
        <p className="mt-1 text-sm opacity-90">Masuk untuk melanjutkan perjalanan kamu.</p>
      </div>

      <motion.div initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="mt-8 min-h-[60vh] rounded-t-3xl bg-card p-6 shadow-float">
        <form onSubmit={submit} className="space-y-3">
          <div className="flex items-center gap-2 rounded-2xl border border-border px-4 py-3">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className="w-full bg-transparent text-sm outline-none" />
          </div>
          <div className="flex items-center gap-2 rounded-2xl border border-border px-4 py-3">
            <Lock className="h-4 w-4 text-muted-foreground" />
            <input type={show ? "text" : "password"} required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Kata sandi" className="w-full bg-transparent text-sm outline-none" />
            <button type="button" onClick={() => setShow(!show)}>
              {show ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
            </button>
          </div>

          <button disabled={loading} className="mt-2 w-full rounded-full bg-primary py-3.5 text-sm font-bold text-primary-foreground shadow-card disabled:opacity-60">
            {loading ? "Memproses..." : "Masuk"}
          </button>
        </form>

        <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
          <div className="h-px flex-1 bg-border" /> atau lanjutkan dengan <div className="h-px flex-1 bg-border" />
        </div>

        <button onClick={google} disabled={loading} className="w-full rounded-2xl border border-border bg-card py-3 text-sm font-semibold hover:bg-muted disabled:opacity-60">
          Masuk dengan Google
        </button>

        <div className="mt-6 text-center text-sm text-muted-foreground">
          Belum punya akun? <Link to="/auth/register" className="font-bold text-primary">Daftar</Link>
        </div>
      </motion.div>
    </div>
  );
}
