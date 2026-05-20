# Integrasi Backend Lengkap (Supabase + Realtime + Edge Functions)

## Status saat ini

Sebagian besar fitur **sudah terhubung** ke backend:
- Auth (login, register, session, RLS), profile auto-create via trigger
- Pickup points, schedules, vehicles, seats — CRUD admin & passenger
- Booking + seat hold/release + pembayaran mock
- Realtime seat availability (`seats` table)

**Belum terhubung / bermasalah:**
1. **Ride Hailing** (`/ride`, `/ride/tracking`) — 100% data palsu (`nearbyDrivers` mock, driver "Budi Santoso" hardcoded, transisi pakai `setTimeout`). Tabel `ride_orders` & `driver_locations` sudah ada tapi tidak dipakai.
2. **Shuttle tracking** memanggil tabel **`vehicle_locations`** yang **tidak ada** di database — fitur lacak armada secara realtime gagal diam-diam.
3. **Payments** menulis kolom `external_id` yang tidak ada di tabel `payments`. Tidak ada webhook untuk konfirmasi pembayaran nyata.
4. **Home page** "rute populer" masih hardcode harga & durasi.
5. **Cron / housekeeping**: kursi yang di-hold tidak otomatis dilepas setelah expired; tidak ada job harian.
6. **Account page** tidak bisa edit profil (nama, telepon, avatar) — belum ada storage bucket.

---

## Yang akan dikerjakan

### 1. Database (1 migrasi)
- **Buat tabel `vehicle_locations`** (`vehicle_id`, `lat`, `lng`, `speed`, `heading`, `updated_at`) + RLS read-authenticated, write admin/driver, ENABLE realtime.
- **Tambah kolom `payments.external_id`** (text, nullable) + index untuk webhook lookup.
- **Tambah kolom `ride_orders.eta_min`, `vehicle_meta`** untuk info driver yang ditampilkan.
- **Storage bucket** `avatars` (public) + `vehicle-images` (public) dengan RLS per-user folder.
- **Function `release_expired_holds()`** — release seat `held` yang `hold_until < now()` jadi `available`.
- Aktifkan **realtime** untuk `ride_orders`, `driver_locations`, `vehicle_locations`, `bookings`.

### 2. Server functions baru (TanStack `createServerFn`)
- `createRideOrder` — insert ke `ride_orders` (status `requested`), simpan pickup/dropoff/fare/tier.
- `cancelRideOrder` — update status `cancelled` oleh penumpang.
- `getRideOrder(id)` — fetch order + driver profile + vehicle.
- `updateProfile` — update `profiles.full_name`, `phone`, `avatar_url`.
- `listPopularRoutes` — ganti hardcode home dengan agregasi nyata dari `schedules`.

### 3. Edge Functions (Supabase)
Dibuat 2 edge function (sesuai permintaan eksplisit user untuk edge function):
- **`payment-webhook`** (`/functions/v1/payment-webhook`, public, verify signature) — terima callback gateway pembayaran, update `payments.status` + `bookings.status` + `seats.status` jadi `booked`. Ini wajib edge function karena gateway eksternal memanggil URL Supabase.
- **`cron-housekeeping`** (dipanggil pg_cron tiap menit) — panggil `release_expired_holds()` + auto-match `ride_orders` status `requested` ke driver `online` terdekat (update `driver_id` + status `accepted`).

### 4. Realtime di UI
- **`/ride/tracking`** — hapus `setTimeout` palsu; subscribe ke `ride_orders` (status changes) + `driver_locations` (lokasi driver), tampil data driver nyata dari join.
- **`/shuttle/tracking`** — hook `useVehicleTracking` sekarang akan bekerja setelah tabel ada.
- **`/bookings`** — subscribe ke `bookings` user agar status `paid` muncul tanpa refresh.

### 5. UI updates
- `/ride/index.tsx` — submit form bikin `ride_orders` lewat `createRideOrder`, lalu navigate ke `/ride/tracking?id=...`.
- `/account.tsx` — form edit nama + telepon + upload avatar (storage bucket).
- `/index.tsx` — pakai `listPopularRoutes` (data agregasi nyata).

---

## Catatan teknis

- Edge function `payment-webhook` membutuhkan secret `PAYMENT_WEBHOOK_SECRET` (HMAC verify). Akan diminta lewat add_secret saat eksekusi.
- pg_cron dijadwalkan via migration (`select cron.schedule(...)`).
- `vehicle_locations` dipisah dari `driver_locations` agar shuttle (armada terjadwal) dan ride-hailing (driver perorangan) bisa di-track terpisah.
- Semua tabel baru wajib RLS + ENABLE realtime via `alter publication supabase_realtime add table ...`.
- File `.functions.ts` baru ditaruh di `src/features/<area>/services/` mengikuti pola yang ada.

## File yang berubah

**Baru:**
- `supabase/functions/payment-webhook/index.ts`
- `supabase/functions/cron-housekeeping/index.ts`
- `src/features/ride/services/ride-order.functions.ts`
- `src/features/ride/hooks/use-ride-order.ts`
- `src/features/account/services/profile.functions.ts`

**Diubah:**
- 1 migrasi DB (tabel, kolom, bucket, function, cron, realtime)
- `src/routes/ride.tsx`, `src/routes/ride.tracking.tsx`
- `src/routes/account.tsx`, `src/routes/index.tsx`, `src/routes/bookings.tsx`
- `src/features/shuttle/services/shuttle.functions.ts` (rapikan duplikasi `createClient` inline)
- `src/features/booking/services/payments.functions.ts` (hapus `external_id` kalau gateway nyata belum dipakai, atau pakai setelah kolom ditambah)
