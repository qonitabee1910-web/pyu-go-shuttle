import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { PageHeader } from "@/shared/components/PageHeader";

export const Route = createFileRoute("/auth/otp")({
  head: () => ({ meta: [{ title: "Verifikasi OTP — PYU-GO" }] }),
  component: OtpPage,
});

function OtpPage() {
  const [digits, setDigits] = useState(["", "", "", "", "", ""]);
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const [countdown, setCountdown] = useState(60);
  const nav = useNavigate();

  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown(countdown - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  const onChange = (i: number, v: string) => {
    const val = v.replace(/\D/g, "").slice(0, 1);
    const next = [...digits];
    next[i] = val;
    setDigits(next);
    if (val && i < 5) refs.current[i + 1]?.focus();
    if (next.every((d) => d !== "")) {
      setTimeout(() => nav({ to: "/" }), 400);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <PageHeader title="Verifikasi" back />

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="p-6">
        <h1 className="text-2xl font-extrabold">Masukkan kode OTP</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Kami sudah mengirim 6-digit kode ke nomor <span className="font-semibold text-foreground">+62 812***7890</span>
        </p>

        <div className="mt-8 flex justify-between gap-2">
          {digits.map((d, i) => (
            <input
              key={i}
              ref={(el) => { refs.current[i] = el; }}
              value={d}
              onChange={(e) => onChange(i, e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Backspace" && !digits[i] && i > 0) refs.current[i - 1]?.focus();
              }}
              inputMode="numeric"
              className="h-14 w-12 rounded-2xl border-2 border-border bg-card text-center text-xl font-extrabold outline-none focus:border-primary"
            />
          ))}
        </div>

        <div className="mt-6 text-center text-sm">
          {countdown > 0 ? (
            <span className="text-muted-foreground">Kirim ulang dalam <b className="text-foreground">{countdown}s</b></span>
          ) : (
            <button onClick={() => setCountdown(60)} className="font-bold text-primary">Kirim ulang OTP</button>
          )}
        </div>

        <button
          onClick={() => nav({ to: "/" })}
          className="mt-8 w-full rounded-full bg-primary py-3.5 text-sm font-bold text-primary-foreground shadow-card"
        >
          Verifikasi
        </button>
      </motion.div>
    </div>
  );
}
