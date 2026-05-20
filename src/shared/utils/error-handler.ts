import { AuthError, PostgrestError } from "@supabase/supabase-js";
import { toast } from "sonner";

/**
 * Centralized Error Handler for PYU-GO Shuttle Platform
 * Maps technical error codes to user-friendly Indonesian messages.
 */

export type AppError = {
  message: string;
  code?: string;
  status?: number;
  originalError?: any;
};

export function parseError(err: any): AppError {
  // 1. Handle Supabase Auth Errors
  if (err instanceof AuthError) {
    switch (err.status) {
      case 400:
        if (err.message.includes("Invalid login credentials")) {
          return { message: "Email atau kata sandi salah.", status: 400, code: "auth/invalid-credentials" };
        }
        return { message: "Permintaan tidak valid. Mohon periksa kembali data Anda.", status: 400 };
      case 422:
        if (err.message.includes("already registered") || err.message.includes("sudah terdaftar")) {
          return { message: "Email ini sudah terdaftar. Silakan gunakan email lain atau masuk.", status: 422, code: "auth/email-exists" };
        }
        if (err.message.includes("Password") || err.message.includes("Kata sandi") || err.message.includes("weak_password")) {
          return { 
            message: "Kata sandi terlalu lemah. Gunakan minimal 8 karakter dengan kombinasi huruf besar, kecil, angka, dan simbol.", 
            status: 422, 
            code: "auth/weak-password" 
          };
        }
        return { message: "Data tidak dapat diproses. Pastikan format email dan kata sandi benar.", status: 422 };
      case 429:
        return { message: "Terlalu banyak percobaan. Mohon tunggu beberapa saat.", status: 429, code: "auth/too-many-requests" };
      default:
        return { message: err.message || "Terjadi kesalahan pada sistem autentikasi.", status: err.status };
    }
  }

  // 2. Handle Supabase Database Errors (Postgrest)
  if ((err as PostgrestError).code) {
    const pgErr = err as PostgrestError;
    switch (pgErr.code) {
      case "23505": // unique_violation
        return { message: "Data sudah ada dalam sistem.", code: "db/unique-violation" };
      case "42501": // insufficient_privilege
        return { message: "Anda tidak memiliki izin untuk melakukan aksi ini.", code: "db/permission-denied" };
      case "23503": // foreign_key_violation
        return { message: "Data referensi tidak ditemukan.", code: "db/fk-violation" };
      default:
        return { message: "Gagal memproses data ke server.", code: `db/${pgErr.code}` };
    }
  }

  // 3. Handle Network Errors
  if (err instanceof TypeError && err.message === "Failed to fetch") {
    return { message: "Koneksi internet terganggu. Periksa koneksi Anda.", code: "network/failed-to-fetch" };
  }

  // 4. Fallback for generic errors
  return {
    message: err.message || "Terjadi kesalahan yang tidak terduga. Silakan coba lagi.",
    originalError: err,
  };
}

/**
 * Displays a toast notification for the error and logs it to the console
 */
export function handleError(err: any, customTitle?: string) {
  const parsed = parseError(err);
  console.error(`[AppError] ${customTitle || "Error"}:`, err);
  
  toast.error(parsed.message, {
    description: parsed.code ? `Kode: ${parsed.code}` : undefined,
  });

  return parsed;
}
