# Driver App + Admin Panel Expansion

Tambah dua area besar berbasis role: **Driver** (`/driver/*`) dan perluasan **Admin** (`/admin/*`).

## 1. Role & Akses
- Tambah enum role baru `driver` di `app_role` (sudah ada `admin`, `customer`).
- Layout route `_driver` (gate `has_role(driver)` atau user ada di tabel `drivers`).
- Layout `_admin` sudah ada lewat `requireAdminAuth`.
- Helper `checkIsDriver` server fn.

## 2. Driver App (`/driver/*`)
Route baru (flat):
- `driver.index.tsx` — Dashboard hari ini: jadwal trip aktif (join `schedules` + `vehicles` lewat `drivers.vehicle_id`), tombol toggle online/offline (`drivers.status`), card ride request masuk (subscribe realtime `ride_orders` status=`requested`).
- `driver.trips.tsx` — Daftar trip (schedules milik vehicle driver) hari ini & mendatang.
- `driver.trip.$scheduleId.tsx` — Manifest penumpang: list `seat_bookings` + booking + profil. Tombol **scan QR** (pakai lib `html5-qrcode`) untuk check-in (tandai `seat_bookings.checked_in_at`). Tombol Start / Finish trip (update kolom baru `schedules.status`).
- `driver.ride.$id.tsx` — Detail ride hailing aktif: terima/tolak/start/complete, update `ride_orders.status`.
- Komponen `LocationBroadcastToggle` — saat ON, kirim `navigator.geolocation.watchPosition` upsert ke `vehicle_locations` (untuk schedule) & `driver_locations` (untuk ride hailing) tiap 5 detik.

## 3. Admin Panel (`/admin/*`)
Yang sudah ada: bookings, schedules, vehicles, pickup-points, operations, index.

Tambah/rapikan:
- `admin.index.tsx` (revamp) — **KPI cards**: total booking hari ini, pendapatan bulan ini, trip aktif, driver online. **Revenue chart Recharts** (line/bar 30 hari terakhir dari `payments` status `paid`). **Active bookings table** (top 10 booking aktif).
- `admin.drivers.tsx` — CRUD driver (link ke profile, assign vehicle, set status). Tambah role `driver` ke `user_roles` saat create.
- `admin.routes.tsx` — CRUD `routes` (origin, destination, distance).
- `admin.analytics.tsx` — **Seat occupancy** (% kursi terisi per schedule, chart) + **ride heatmap** (grid lat/lng dari `ride_orders.pickup` 30 hari, render sederhana via Leaflet heat layer atau scatter di MapView).

Menu `AdminSidebar` ditambah link baru.

## 4. Database (1 migrasi)
- `alter type app_role add value 'driver'` (jika belum).
- `alter table seat_bookings add column checked_in_at timestamptz`.
- `alter table schedules add column status text default 'scheduled'` (`scheduled|ongoing|completed|cancelled`).
- RLS update untuk `seat_bookings`: driver dari vehicle terkait boleh update `checked_in_at`.
- RLS `schedules`: driver vehicle terkait boleh update status.
- RLS `ride_orders`: tambah read untuk driver online (sudah ada parties update).
- Realtime: `ride_orders` sudah on, pastikan `schedules` & `seat_bookings` jika diperlukan.

## 5. Server Functions baru
- `src/features/driver/services/driver.functions.ts`:
  - `checkIsDriver`, `getMyDriverProfile`, `setDriverStatus(online|offline)`
  - `listMyTripsToday`, `getTripManifest(scheduleId)`, `checkInSeatBooking(bookingId, seatNo)`
  - `startTrip(scheduleId)`, `finishTrip(scheduleId)`
  - `acceptRide(id)`, `rejectRide(id)`, `startRide(id)`, `completeRide(id)`
  - `pushVehicleLocation`, `pushDriverLocation`
- `src/features/admin/services/admin.functions.ts` (tambah):
  - `adminKpis`, `adminRevenueSeries(days)`, `adminActiveBookings`
  - `adminListDrivers`, `adminUpsertDriver`, `adminDeleteDriver`
  - `adminListRoutes`, `adminUpsertRoute`, `adminDeleteRoute`
  - `adminSeatOccupancy`, `adminRidePoints(days)`

## 6. Library
- Tambah `html5-qrcode` (QR scanner) — pure JS, edge-safe (hanya client).
- Recharts sudah ada.

## File yang berubah
**Baru:**
- `src/routes/_driver.tsx`, `src/routes/driver.index.tsx`, `driver.trips.tsx`, `driver.trip.$scheduleId.tsx`, `driver.ride.$id.tsx`
- `src/routes/admin.drivers.tsx`, `admin.routes.tsx`, `admin.analytics.tsx`
- `src/features/driver/services/driver.functions.ts`
- `src/features/driver/components/QrScanner.tsx`, `LocationBroadcastToggle.tsx`
- 1 migrasi DB

**Diubah:**
- `src/routes/admin.index.tsx` (revamp KPI+chart+table)
- `src/features/admin/services/admin.functions.ts` (KPI/CRUD/analytics)
- `src/features/admin/components/AdminSidebar.tsx` (menu baru)
- `src/shared/components/BottomNav.tsx` (link Driver jika role driver)

## Catatan
- Auto-match cron sekarang akan kebagian driver online → admin/driver bisa lihat hasilnya.
- Heatmap pakai scatter circle agar tidak butuh plugin baru.
- Tidak mengubah edge function `payment-webhook` yang sudah ada.
