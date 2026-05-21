# Hapus seluruh mock-up, gunakan database

## Tujuan
Semua data di aplikasi harus berasal dari Supabase (tabel `pickup_points`, `routes`, `vehicles`, `schedules`, `seats`, `bookings`, `seat_bookings`, `drivers`, `driver_locations`, `payments`). Tidak ada lagi data hardcoded / zustand-persist sebagai sumber data.

## Yang masih mock saat ini

1. **Admin panel pakai `useAdmin` (zustand + localStorage)** — bukan DB:
   - `src/routes/admin.schedules.tsx`
   - `src/routes/admin.vehicles.tsx`
   - `src/routes/admin.pickup-points.tsx`
   - `src/routes/admin.bookings.tsx`
   - `src/routes/admin.operations.tsx`

2. **`nearbyDrivers` hardcoded** di `src/shared/types/shuttle.ts`, dipakai `src/routes/ride.tsx` (titik driver di peta + list driver).

3. **Hardcode di `shuttle.functions.ts`**:
   - `listHomePageData.popularRoutes` — `price: 150000` & `duration: "1j 30m"` ditulis manual.
   - "Mocking popular as a subset" comment.

4. **`mockPayBooking`** server-fn di `src/features/booking/services/payments.functions.ts` — rename + jangan tandai sebagai mock (logikanya sudah nulis ke DB, hanya namanya yang menyesatkan).

## Perubahan

### A. Admin CRUD → server functions + DB
Buat / lengkapi `src/features/admin/services/admin.functions.ts` dengan:
- `adminListPickupPoints`, `adminUpsertPickupPoint`, `adminDeletePickupPoint`
- `adminListVehicles`, `adminUpsertVehicle`, `adminDeleteVehicle`, `adminSetVehicleStatus`
- `adminListSchedules`, `adminUpsertSchedule`, `adminDeleteSchedule`, `adminToggleScheduleActive`
- `adminListBookings`, `adminSetBookingStatus`

Semua middleware `requireSupabaseAuth` + cek `has_role(admin)` via query `user_roles`.

Refactor 5 route admin di atas: ganti `useAdmin()` → `useQuery` + `useMutation` (TanStack Query) memanggil server-fn. Hapus import `useAdmin` di route-route tsb.

`useAdmin` zustand tetap dibiarkan untuk sementara (dipakai juga utk types `BookingStatus`, `AdminSchedule`, dll.) — pindahkan type-nya ke `src/features/admin/types.ts` lalu kosongkan store-nya (hapus state data, sisakan types saja, atau hapus file & update import).

### B. Driver realtime → DB
Ganti `nearbyDrivers` mock di `/ride`:
- Buat server-fn `listOnlineDriversNearby({ lat, lng, radiusKm })` query `drivers` + `driver_locations` (latest).
- Subscribe realtime `driver_locations` di komponen agar marker bergerak.
- Hapus `nearbyDrivers` & properti `nearbyDrivers` dari `src/shared/types/shuttle.ts`.

### C. Home page popular routes
- Tambah server-fn `listPopularRoutes` yang query agregasi dari `bookings` (top 4 pickup_id berdasar jumlah booking 30 hari terakhir) JOIN `pickup_points` + harga termurah dari `schedules`.
- Ganti pemanggilan di `listHomePageData`.

### D. Rename `mockPayBooking` → `payBooking`
- Update referensi di `src/routes/shuttle.payment.tsx`.
- Catatan kolom `payments.method` default `'mock'` di DB tetap dibiarkan (sudah pakai data real, hanya label).

## File yang diubah / dibuat
- **Create**: `src/features/admin/services/admin.functions.ts` (extend), `src/features/ride/services/drivers.functions.ts`, `src/features/admin/types.ts`
- **Edit**: 5 admin routes, `src/routes/ride.tsx`, `src/shared/types/shuttle.ts`, `src/features/shuttle/services/shuttle.functions.ts`, `src/features/booking/services/payments.functions.ts`, `src/routes/shuttle.payment.tsx`
- **Edit / kosongkan**: `src/features/admin/store/admin.ts`

## Catatan
- Tidak ada perubahan skema DB — semua tabel & RLS yang diperlukan sudah ada.
- Realtime channel: `drivers`, `driver_locations`, `bookings`, `ride_orders`, `seats` (sudah aktif).
- Estimasi ±13 file diubah, 3 file baru.
