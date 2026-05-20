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
    <nav className="fixed bottom-0 left-1/2 z-40 w-full max-w-md -translate-x-1/2 border-t border-border bg-card/95 backdrop-blur-lg shadow-float">
      <ul className="grid grid-cols-3">
        {items.map((it) => {
          const active = loc.pathname === it.to;
          const Icon = it.icon;
          return (
            <li key={it.to}>
              <Link
                to={it.to}
                className="relative flex flex-col items-center justify-center gap-1 py-2.5 text-xs"
              >
                {active && (
                  <motion.span
                    layoutId="navpill"
                    className="absolute inset-x-6 top-1 h-1 rounded-full bg-primary"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                <Icon
                  className={`h-5 w-5 transition-colors ${active ? "text-primary" : "text-muted-foreground"}`}
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
