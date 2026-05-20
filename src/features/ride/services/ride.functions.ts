import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Xendit Payment Integration
 * Note: In a real production app, use XENDIT_SECRET_KEY from env
 */

export const createXenditInvoice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { bookingId: string; amount: number; email: string; name: string }) =>
    z.object({
      bookingId: z.string().uuid(),
      amount: z.number().positive(),
      email: z.string().email(),
      name: z.string()
    }).parse(d)
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;

    // 1. Create Invoice via Xendit API
    // This is a simulation since we don't have the real API key in this environment
    const invoiceId = "inv-" + Math.random().toString(36).slice(2, 10);
    const invoiceUrl = `https://checkout.xendit.co/web/${invoiceId}`;

    // 2. Log payment attempt
    const { data: payment, error: pErr } = await (supabase as any)
      .from("payments")
      .insert({
        booking_id: data.bookingId,
        amount: data.amount,
        method: "xendit",
        status: "pending",
        external_id: invoiceId
      })
      .select()
      .single();

    if (pErr) throw pErr;

    return { invoiceUrl, invoiceId, paymentId: payment.id };
  });

export const getVehicleLocation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { vehicleId: string }) => 
    z.object({ vehicleId: z.string().uuid() }).parse(d)
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: loc, error } = await (supabase as any)
      .from("vehicle_locations")
      .select("*")
      .eq("vehicle_id", data.vehicleId)
      .single();
    
    if (error) return null;
    return loc;
  });
