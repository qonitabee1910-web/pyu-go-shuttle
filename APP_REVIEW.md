# Tinjauan & Rencana Refinement PYU-GO Shuttle

## 1. Audit Kode & Keamanan

### Temuan Utama
| Masalah | Prioritas | Deskripsi |
| :--- | :---: | :--- |
| **Race Condition Booking** | Tinggi | `createBooking` tidak melakukan pengecekan ketersediaan kursi secara atomik, berisiko double-booking. |
| **Auth Admin Client-side** | Tinggi | Pengecekan role admin di `AdminLayout` dilakukan di level komponen, bukan di level rute (`beforeLoad`). |
| **Data Terpisah (Split Brain)** | Tinggi | Dashboard admin menggunakan data mock/lokal, sementara alur user menggunakan Supabase. |
| **Hardcoded Timezone** | Sedang | Penggunaan `+07:00` di server functions bisa menyebabkan pergeseran waktu jika lingkungan berubah. |
| **Mock Data Leak** | Sedang | Konstanta seperti `KNO_AIRPORT` masih hardcoded di file mock, bukan dari database. |

---

## 2. Evaluasi UI/UX

### Alur Utama (Booking)
- **Kelebihan**: Desain mobile-first yang konsisten, stepper yang jelas, dan penggunaan toast untuk feedback.
- **Kekurangan**: 
  - `MapView` kurang informatif saat memilih titik jemput.
  - Kurangnya skeleton loader saat transisi antar langkah booking.

### Dashboard Admin
- **Kelebihan**: Layout sidebar yang modern dan fungsional.
- **Kekurangan**:
  - Data yang ditampilkan tidak real-time karena masih menggunakan seed data.
  - Interaksi edit data kendaraan/jadwal masih bersifat lokal.

---

## 3. Daftar Tugas Refinement

### Tahap 1: Stabilitas & Keamanan (Prioritas Tinggi)
- [ ] **Atomicity**: Implementasi transaksi database pada `createBooking`.
- [ ] **Route Protection**: Pindahkan `checkIsAdmin` ke rute `beforeLoad` di `admin.tsx`.
- [ ] **Admin Middleware**: Buat `requireAdminAuth` middleware untuk proteksi API level server.
- [ ] **Data Sync**: Hubungkan Dashboard Admin ke server functions Supabase.

### Tahap 2: Pengalaman Pengguna (Prioritas Sedang)
- [x] **Skeleton Loaders**: Implementasi skeleton UI untuk semua fetch data utama.
- [x] **Map Enhancements**: Tambahkan info detail (alamat lengkap, foto) pada titik jemput di peta.
- [x] **Standardisasi Waktu**: Gunakan library `dayjs` atau `date-fns` dengan timezone yang konsisten (WIB/Jakarta).

### Tahap 3: Pemeliharaan (Prioritas Rendah)
- [x] **Cleanup**: Hapus sisa-sisa `mock-data.ts` dan ganti dengan fetch dari DB.
- [x] **Validation**: Perkuat validasi input (nomor telepon, format nama) menggunakan Zod.


---

## 4. Kriteria Penerimaan (Acceptance Criteria)

1. **Booking Aman**: Dua user yang memesan kursi yang sama secara bersamaan tidak akan mendapatkan kode booking yang sama (salah satu harus gagal).
2. **Akses Terproteksi**: User tanpa role admin tidak dapat melihat layout admin atau memanggil API admin (status 403/401).
3. **Data Real-time**: Perubahan status booking oleh user langsung terlihat di dashboard admin tanpa refresh manual (menggunakan Query invalidation).
4. **UX Mulus**: Tidak ada layout shift saat loading data berkat penggunaan skeleton screens.
