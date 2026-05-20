# Perbaikan UX kursi & editor denah

## 1. Warna kursi lebih kontras (penumpang)

Saat ini kursi kosong (putih + outline biru), terisi (abu-abu + strip), dipilih (biru). Bedanya kurang jelas — penumpang sulit membedakan kosong vs terisi sekilas.

Ubah palette di `SeatGlyph` jadi 3 warna semantik yang tegas:

- **Kosong / Tersedia** → hijau (token baru `--seat-available` / success hijau lembut, outline hijau pekat)
- **Dipilih** → biru primary (tetap)
- **Terisi** → merah (`--destructive` lembut + outline merah pekat + strip diagonal)

Tambah token baru di `src/styles.css`:
- `--seat-available` (hijau pastel)
- `--seat-available-foreground` (hijau pekat)
- `--seat-booked` (merah pastel)
- `--seat-booked-foreground` (merah pekat)

Update legend di:
- `SeatImageMap` (denah dari foto) — otomatis ikut karena pakai `SeatGlyph`
- `SeatPicker` (grid 2D fallback) — selaraskan warna tombol & legenda
- `SeatImageEditor` legend bar

## 2. Auto-fit gambar denah ke canvas (admin)

Saat ini upload memakai `fileToDataUrl(maxDim=1200)` — hanya mengecilkan sisi terpanjang ke 1200px, aspect ratio bebas. Akibatnya canvas editor jadi sangat tinggi / sempit tergantung foto.

Ubah `fileToDataUrl` jadi `fitImageToCanvas(file, targetW=1200, targetH=800)`:
- Hitung skala `contain` (gambar selalu masuk penuh tanpa terpotong)
- Render ke canvas 1200×800 dengan background putih (letterbox)
- Hasilkan JPEG 0.82 — ukuran file lebih kecil & konsisten
- Stage editor otomatis pakai aspect ratio 3:2 yang sama, marker tidak meleset

Hasil: berapapun ukuran/rasio foto yang diupload, canvas selalu seragam dan marker tetap presisi.

## Detail teknis

File yang disentuh:
- `src/styles.css` — tambah 4 token warna kursi (light + dark)
- `src/features/admin/components/SeatGlyph.tsx` — pakai token baru
- `src/features/shuttle/components/SeatPicker.tsx` — selaraskan kelas warna
- `src/features/admin/components/SeatImageEditor.tsx` — ganti `fileToDataUrl` jadi `fitImageToCanvas` (target 1200×800, letterbox putih)

Tidak ada perubahan skema DB atau backend.
