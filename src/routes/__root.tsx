import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useLocation,
  useNavigate,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { BottomNav } from "@/shared/components/BottomNav";
import { supabase } from "@/integrations/supabase/client";

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold">Halaman tidak ditemukan</h2>
        <p className="mt-2 text-sm text-muted-foreground">Halaman yang kamu cari tidak ada atau telah dipindahkan.</p>
        <div className="mt-6">
          <Link to="/" className="inline-flex items-center justify-center rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-card hover:opacity-90">Ke Beranda</Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold">Halaman gagal dimuat</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
        <div className="mt-6 flex justify-center gap-2">
          <button onClick={() => { router.invalidate(); reset(); }} className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground">Coba lagi</button>
          <a href="/" className="rounded-full border border-input px-5 py-2.5 text-sm font-semibold">Beranda</a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, maximum-scale=1" },
      { name: "theme-color", content: "#0a0a1a" },
      { title: "PYU-GO — Shuttle KNO" },
      { name: "description", content: "Pesan shuttle ke Bandara KNO dalam satu aplikasi. Cepat, premium, terpercaya." },
      { property: "og:title", content: "PYU-GO — Shuttle KNO" },
      { property: "og:description", content: "Pesan shuttle ke Bandara KNO dalam satu aplikasi. Cepat, premium, terpercaya." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "PYU-GO — Shuttle KNO" },
      { name: "twitter:description", content: "Pesan shuttle ke Bandara KNO dalam satu aplikasi. Cepat, premium, terpercaya." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/5a489b8d-30d6-401c-a9b6-56eb947ef8c0/id-preview-6b16f882--5bdf1bcc-0b2a-4ceb-b824-6b17161e0023.lovable.app-1779246558355.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/5a489b8d-30d6-401c-a9b6-56eb947ef8c0/id-preview-6b16f882--5bdf1bcc-0b2a-4ceb-b824-6b17161e0023.lovable.app-1779246558355.png" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=DM+Sans:wght@400;500;600;700&display=swap" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <head><HeadContent /></head>
      <body>{children}<Scripts /></body>
    </html>
  );
}

const HIDE_NAV_PREFIXES = ["/auth", "/shuttle/pickup", "/shuttle/service", "/shuttle/schedule", "/shuttle/passenger", "/shuttle/seats", "/shuttle/payment", "/shuttle/ticket", "/shuttle/tracking", "/admin"];
const PUBLIC_PREFIXES = ["/auth"];

function AuthGate({ children }: { children: React.ReactNode }) {
  const loc = useLocation();
  const nav = useNavigate();
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<any>(null);

  useEffect(() => {
    let mounted = true;

    async function checkSession() {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;
      
      setSession(data.session);
      const isPublic = PUBLIC_PREFIXES.some((p) => loc.pathname.startsWith(p)) || loc.pathname === "/";
      
      if (!data.session && !isPublic) {
        nav({ to: "/auth/login", search: { redirect: loc.pathname } });
      }
      setReady(true);
    }

    checkSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      router.invalidate();
      
      const isPublic = PUBLIC_PREFIXES.some((p) => loc.pathname.startsWith(p)) || loc.pathname === "/";
      if (!newSession && !isPublic) {
        nav({ to: "/auth/login", search: { redirect: loc.pathname } });
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [loc.pathname, nav, router]);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }
  
  return <>{children}</>;
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const loc = useLocation();
  const isAdmin = loc.pathname.startsWith("/admin");
  const hideNav = HIDE_NAV_PREFIXES.some((p) => loc.pathname.startsWith(p));

  if (isAdmin) {
    return (
      <QueryClientProvider client={queryClient}>
        <AuthGate><Outlet /></AuthGate>
      </QueryClientProvider>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <AuthGate>
        <div className="mx-auto min-h-screen w-full max-w-md bg-background relative">
          <div className={hideNav ? "" : "pb-24"}>
            <Outlet />
          </div>
          {!hideNav && <BottomNav />}
        </div>
      </AuthGate>
    </QueryClientProvider>
  );
}
