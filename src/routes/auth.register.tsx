import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { motion } from "framer-motion";
import { User, Mail, Phone, Lock } from "lucide-react";
import { toast } from "sonner";
import logo from "@/assets/logo.png";
import { supabase } from "@/integrations/supabase/client";
import { handleError } from "@/shared/utils/error-handler";
import { registerSchema } from "@/shared/utils/validation";

export const Route = createFileRoute("/auth/register")({
  head: () => ({ meta: [{ title: "Daftar — PYU-GO" }] }),
  component: RegisterPage,
});

function RegisterPage() {
  const nav = useNavigate();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrors({});
    
    const result = registerSchema.safeParse({ fullName, email, phone, password });
    
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.issues.forEach((issue) => {
        if (issue.path[0]) fieldErrors[issue.path[0].toString()] = issue.message;
      });
      setErrors(fieldErrors);
      // Show first error as toast for quick feedback
      toast.error(result.error.issues[0].message);
      return;
    }

    setLoading(true);
    try {
      const { error, data } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin,
          data: { 
            full_name: fullName, 
            phone_number: phone
          },
        },
      });
      
      if (error) throw error;
      
      if (data?.user && data.session) {
         toast.success("Berhasil mendaftar!");
         nav({ to: "/" });
      } else {
         toast.success("Akun dibuat! Silakan cek email untuk konfirmasi.");
         nav({ to: "/auth/login" });
      }
    } catch (err: any) {
      handleError(err, "Registration");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-hero-gradient">
      <div className="px-6 pt-10 text-primary-foreground">
        <img src={logo} alt="PYU-GO" className="h-10 w-auto brightness-0 invert" width={140} height={36} />
        <h1 className="mt-8 text-3xl font-extrabold">Buat akun baru</h1>
        <p className="mt-1 text-sm opacity-90">Gabung & dapatkan promo perjalanan pertama.</p>
      </div>

      <motion.div initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="mt-8 rounded-t-3xl bg-card p-6 shadow-float">
        <form onSubmit={submit} className="space-y-3">
          <Field icon={<User className="h-4 w-4" />} placeholder="Nama lengkap" value={fullName} onChange={(e) => setFullName(e.target.value)} error={errors.fullName} />
          <Field icon={<Mail className="h-4 w-4" />} placeholder="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} error={errors.email} />
          <Field icon={<Phone className="h-4 w-4" />} placeholder="Nomor HP" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} error={errors.phone} />
          <Field 
            icon={<Lock className="h-4 w-4" />} 
            placeholder="Kata sandi (min 8 karakter, A-z, 0-9, !@#)" 
            type="password" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
            minLength={8} 
            error={errors.password}
          />
          <p className="px-1 text-[10px] text-muted-foreground leading-tight">
            Gunakan minimal 8 karakter dengan kombinasi huruf besar, kecil, angka, dan simbol untuk keamanan maksimal.
          </p>
          <label className="flex items-start gap-2 text-xs text-muted-foreground">
            <input type="checkbox" required className="mt-0.5 accent-primary" />
            Saya menyetujui Syarat & Ketentuan dan Kebijakan Privasi PYU-GO.
          </label>
          <button disabled={loading} className="w-full rounded-full bg-primary py-3.5 text-sm font-bold text-primary-foreground shadow-card disabled:opacity-60">
            {loading ? "Memproses..." : "Daftar"}
          </button>
        </form>
        <div className="mt-5 text-center text-sm text-muted-foreground">
          Sudah punya akun? <Link to="/auth/login" className="font-bold text-primary">Masuk</Link>
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
