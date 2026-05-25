import { Link, useLocation } from "@tanstack/react-router";
import { Home, Ticket, User } from "lucide-react";
import { motion } from "framer-motion";

const items = [
  { to: "/", label: "Beranda", icon: Home },
  { to: "/bookings", label: "Tiket", icon: Ticket },
  { to: "/account", label: "Akun", icon: User },
];

export function BottomNav() {
  const loc = useLocation();
  return (
    <nav className="fixed bottom-3 left-1/2 z-40 w-[calc(100%-1.5rem)] max-w-[26rem] -translate-x-1/2 glass-strong rounded-full shadow-elegant">
      <ul className="grid grid-cols-3">
        {items.map((it) => {
          const active = loc.pathname === it.to;
          const Icon = it.icon;
          return (
            <li key={it.to}>
              <Link
                to={it.to}
                className="relative flex flex-col items-center justify-center gap-0.5 py-2.5 text-[11px]"
              >
                {active && (
                  <motion.span
                    layoutId="navpill"
                    className="absolute inset-x-3 inset-y-1 -z-10 rounded-full bg-primary/15"
                    transition={{ type: "spring", stiffness: 400, damping: 32 }}
                  />
                )}
                <Icon
                  className={`h-[18px] w-[18px] transition-colors ${active ? "text-primary" : "text-muted-foreground"}`}
                />
                <span className={active ? "font-semibold text-primary" : "text-muted-foreground"}>
                  {it.label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
