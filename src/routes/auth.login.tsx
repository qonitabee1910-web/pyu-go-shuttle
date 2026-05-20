import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { motion } from "framer-motion";
import { Mail, Lock, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import logo from "@/assets/logo.png";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { handleError } from "@/shared/utils/error-handler";
import { loginSchema } from "@/shared/utils/validation";

export const Route = createFileRoute("/auth/login")({
  head: () => ({ meta: [{ title: "Masuk — PYU-GO" }] }),
  component: LoginPage,
});

function LoginPage() {
  const [show, setShow] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const nav = useNavigate();
  const search = Route.useSearch();
  const redirect = (search as any).redirect || "/";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    
    const result = loginSchema.safeParse({ email, password });
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) fieldErrors[err.path[0].toString()] = err.message;
      });
      setErrors(fieldErrors);
      toast.error(result.error.errors[0].message);
      return;
    }

    setLoading(true);

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
          <Field icon={<Mail className="h-4 w-4" />} placeholder="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} error={errors.email} />
          
          <div className="space-y-1">
            <div className={`flex items-center gap-2 rounded-2xl border px-4 py-3 transition-colors ${errors.password ? 'border-destructive bg-destructive/5' : 'border-border focus-within:border-primary/50'}`}>
              <Lock className={`h-4 w-4 ${errors.password ? 'text-destructive' : 'text-muted-foreground'}`} />
              <input type={show ? "text" : "password"} required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Kata sandi" className="w-full bg-transparent text-sm outline-none" />
              <button type="button" onClick={() => setShow(!show)}>
                {show ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
              </button>
            </div>
            {errors.password && <p className="px-1 text-[10px] font-medium text-destructive">{errors.password}</p>}
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

function Field({ icon, error, ...props }: { icon: React.ReactNode, error?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="space-y-1">
      <div className={`flex items-center gap-2 rounded-2xl border px-4 py-3 transition-colors ${error ? 'border-destructive bg-destructive/5' : 'border-border focus-within:border-primary/50'}`}>
        <span className={`${error ? 'text-destructive' : 'text-muted-foreground'}`}>{icon}</span>
        <input required {...props} className="w-full bg-transparent text-sm outline-none" />
      </div>
      {error && <p className="px-1 text-[10px] font-medium text-destructive">{error}</p>}
    </div>
  );
}
