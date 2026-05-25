
# Refinement Plan — Premium Pass

## Locked design tokens (applied app-wide)

Diterapkan di `src/styles.css` sebagai single source of truth.

```text
Palette  : Midnight Indigo
  --background       #0a0a1a   (deep void)
  --surface          #141432   (card base)
  --surface-elev     #1a1a3e   (raised card / glass)
  --primary          #4f46e5   (electric indigo)
  --primary-glow     #7c6cff
  --accent           #a78bfa   (violet aurora)
  --border           rgba(255,255,255,0.08)
  --foreground       #e8e8f5
  --muted-foreground #8a8aa8
  --gradient-primary : linear-gradient(135deg, #4f46e5, #a78bfa)
  --gradient-hero    : radial 600px circle indigo glow di top-left
  --shadow-glow      : 0 20px 60px -20px rgba(79,70,229,0.45)
  --shadow-elegant   : 0 10px 40px -10px rgba(10,10,26,0.6)
  --glass            : backdrop-blur(20px) bg-white/5 border-white/10

Typography
  heading : "Space Grotesk", -apple, sans-serif  (weight 500-700, tight tracking)
  body    : "DM Sans", system-ui (weight 400-500)
  Skala   : hero 48/56, h1 32/40, h2 24/32, body 15/24, label 12/16 uppercase 0.08em

Motion
  Easing  : cubic-bezier(0.22, 1, 0.36, 1) (out-expo)
  Duration: 200ms (micro), 400ms (panel), 700ms (hero)
  Pattern : fade+lift 8px enter, glow pulse on primary, page transitions
```

## Bagian 1 — Customer (home, shuttle, ride, tracking)

- **Home (`index.tsx`)**: bento hero 12-col grid — kartu besar "Search shuttle" (split-screen mini map preview), kartu "Ride-hailing" gradient, kartu KPI live (jumlah trip hari ini), kartu rute populer carousel-glass. LCP image preload via `head().links`.
- **Pickup/Schedule/Seats/Payment/Ticket**: ganti card flat jadi `glass-card` (backdrop-blur + border 1px white/10). Stepper jadi pill animated. SeatPicker: seat glyph dengan glow saat selected, micro shake saat seat unavailable.
- **Tracking & Ride**: map full-bleed dengan bottom sheet glass yang draggable, driver card gradient + avatar ring glow, ETA pulsing.

## Bagian 2 — Driver (`/driver/*`)

- **Driver shell**: header gelap dengan status dot live-pulse (online/offline), bottom tab glass.
- **Trips index & detail**: bento — kartu trip hari ini (besar, gradient indigo, jam keberangkatan jumbo), passenger manifest pakai list dengan check-in QR button gradient. Start/Finish trip → button full width dengan haptic-style scale press.
- **Rides incoming**: kartu request slide-in dari kanan, glow border saat ada request baru, accept/decline besar.
- **LocationBroadcastToggle**: switch besar dengan ring pulse saat ON.

## Bagian 3 — Admin (`/admin/*`)

- **AdminSidebar**: glass dark, active item dengan gradient bar kiri + glow.
- **Dashboard index**: bento KPI cards (revenue, bookings, active drivers, seat occupancy) dengan sparkline mini, Recharts pakai gradient stroke indigo→violet, grid dot pattern subtle.
- **Tables (bookings, schedules, vehicles, pickup, routes, drivers)**: row hover lift, status badge pakai dot+label dengan warna semantik. Empty state ilustrasi + CTA.
- **Analytics**: ride heatmap pakai map tile gelap, seat occupancy donut + bar combo dengan gradient.
- **CRUD dialog**: jadi sheet kanan glass dengan slide-in 400ms; form fields underline-only style.

## Bagian 4 — Konsistensi & Performance

- **Component pass**: `Button` premium variant (gradient + shadow-glow), `Card` glass variant, `Badge` dot variant, `Input` underline variant. Semua via design tokens — zero hardcoded color.
- **Loading**: skeleton shimmer indigo halus untuk semua list/table.
- **Data fetching**: pastikan tiap halaman pakai `queryClient.ensureQueryData` di loader + `useSuspenseQuery` di komponen. Realtime channel di-unsubscribe di cleanup. Tambah `staleTime` 30s untuk read jarang berubah (routes, pickup_points, vehicles).
- **Auth/Account**: login/register/OTP card pakai hero gradient + glass card form, ilustrasi sederhana side panel di desktop.
- **Motion**: page transitions via Motion (fade+lift), reduce-motion respected.

## Bagian 5 — Bug fix runtime

Error ZodError "Invalid UUID di `pickupId`" di customer booking flow — input pickupId datang kosong/non-uuid ke server fn. Tambah guard di route (`shuttle.schedule.tsx` / `shuttle.pickup`) sebelum call, dan loosen schema jadi optional + fallback redirect ke `/shuttle/pickup` kalau pickupId invalid.

## File scope (estimasi)

```text
Edit  : src/styles.css, src/routes/__root.tsx
Edit  : src/routes/index.tsx + 8 shuttle.* routes
Edit  : src/routes/ride*.tsx, ride.tracking.tsx
Edit  : src/routes/driver.*.tsx (5 file) + features/driver/components/*
Edit  : src/routes/admin.*.tsx (8 file) + features/admin/components/*
Edit  : src/shared/components/{BottomNav,PageHeader,LivePulse,MapView}.tsx
Edit  : src/shared/components/ui/{button,card,badge,input,table,dialog,sheet,skeleton}.tsx
Edit  : src/features/shuttle/components/{BookingStepper,SeatPicker,PickupMiniMap}.tsx
Edit  : src/features/shuttle/services/shuttle.functions.ts (schema UUID fix)
```

Tidak ada perubahan skema DB, tidak ada perubahan business logic. Pure visual + UX + perf pass + 1 bugfix.

## Out of scope

- Penambahan fitur baru
- Perubahan auth flow / role gating
- Migrasi data atau RLS
