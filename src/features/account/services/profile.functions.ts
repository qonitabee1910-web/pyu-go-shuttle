import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getMyProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name, phone, avatar_url")
      .eq("id", userId)
      .maybeSingle();
    if (error) throw error;
    return data ?? { id: userId, full_name: null, phone: null, avatar_url: null };
  });

export const updateMyProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { full_name?: string; phone?: string; avatar_url?: string | null }) =>
    z.object({
      full_name: z.string().min(1).max(120).optional(),
      phone: z.string().min(6).max(20).regex(/^[\d+\-\s()]+$/).optional(),
      avatar_url: z.string().url().nullable().optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("profiles")
      .update(data)
      .eq("id", userId);
    if (error) throw error;
    return { success: true };
  });
