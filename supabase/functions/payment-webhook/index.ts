// Edge Function: payment-webhook
// Public webhook receiver for an external payment gateway (Xendit-style).
// Verifies HMAC signature, then updates payments / bookings / seats accordingly.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "content-type, x-callback-token, x-signature",
};

async function hmacSha256Hex(secret: string, body: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function timingSafeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return mismatch === 0;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: corsHeaders });

  const secret = Deno.env.get("PAYMENT_WEBHOOK_SECRET");
  if (!secret) return new Response("Server not configured", { status: 500, headers: corsHeaders });

  const body = await req.text();
  const provided = req.headers.get("x-signature") ?? req.headers.get("x-callback-token") ?? "";
  const expected = await hmacSha256Hex(secret, body);
  if (!provided || !timingSafeEqual(provided.toLowerCase(), expected)) {
    return new Response("Invalid signature", { status: 401, headers: corsHeaders });
  }

  let payload: any;
  try { payload = JSON.parse(body); } catch { return new Response("Bad JSON", { status: 400, headers: corsHeaders }); }

  // Accept either external_id (preferred) or our payment_id directly
  const externalId: string | undefined = payload.external_id ?? payload.invoice_id ?? payload.id;
  const ourPaymentId: string | undefined = payload.payment_id;
  const status: string = (payload.status ?? "").toString().toLowerCase();
  if (!externalId && !ourPaymentId) {
    return new Response("Missing identifier", { status: 400, headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const query = supabase.from("payments").select("id, booking_id, status");
  const { data: payment, error: pErr } = ourPaymentId
    ? await query.eq("id", ourPaymentId).maybeSingle()
    : await query.eq("external_id", externalId!).maybeSingle();
  if (pErr || !payment) return new Response("Payment not found", { status: 404, headers: corsHeaders });

  const isPaid = ["paid", "settled", "success", "succeeded", "completed"].includes(status);
  const isFailed = ["failed", "expired", "cancelled", "canceled"].includes(status);
  if (!isPaid && !isFailed) {
    return new Response(JSON.stringify({ ok: true, ignored: true }), { headers: { ...corsHeaders, "content-type": "application/json" } });
  }

  await supabase.from("payments").update({
    status: isPaid ? "success" : "failed",
    paid_at: isPaid ? new Date().toISOString() : null,
  }).eq("id", payment.id);

  await supabase.from("transactions").insert({
    payment_id: payment.id,
    ref: "WHK" + Math.random().toString(36).slice(2, 10).toUpperCase(),
    payload,
  });

  if (isPaid) {
    await supabase.from("bookings").update({ status: "paid" }).eq("id", payment.booking_id);
    const { data: sbs } = await supabase
      .from("seat_bookings")
      .select("seat_id")
      .eq("booking_id", payment.booking_id);
    const seatIds = (sbs ?? []).map((s) => s.seat_id);
    if (seatIds.length > 0) {
      await supabase.from("seats").update({ status: "booked", hold_until: null }).in("id", seatIds);
    }
  }

  return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "content-type": "application/json" } });
});
