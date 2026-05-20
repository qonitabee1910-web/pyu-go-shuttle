import { z } from "zod";

export const registerSchema = z.object({
  fullName: z.string().min(3, "Nama lengkap minimal 3 karakter"),
  email: z.string().email("Format email tidak valid"),
  phone: z.string().min(10, "Nomor HP minimal 10 digit").regex(/^[0-9+]+$/, "Nomor HP hanya boleh berisi angka"),
  password: z.string()
    .min(8, "Kata sandi minimal 8 karakter")
    .regex(/[A-Z]/, "Kata sandi harus mengandung huruf besar")
    .regex(/[a-z]/, "Kata sandi harus mengandung huruf kecil")
    .regex(/[0-9]/, "Kata sandi harus mengandung angka")
    .regex(/[^A-Za-z0-9]/, "Kata sandi harus mengandung simbol"),
});

export const loginSchema = z.object({
  email: z.string().email("Format email tidak valid"),
  password: z.string().min(1, "Kata sandi wajib diisi"),
});

export const bookingPassengerSchema = z.object({
  name: z.string().min(3, "Nama penumpang minimal 3 karakter"),
  phone: z.string().min(10, "Nomor HP minimal 10 digit").regex(/^[0-9+]+$/, "Nomor HP hanya boleh berisi angka"),
});
