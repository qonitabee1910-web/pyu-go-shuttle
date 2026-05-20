import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useSeatAvailability(scheduleId: string | null | undefined) {
  const qc = useQueryClient();
  useEffect(() => {
    if (!scheduleId) return;
    const ch = supabase
      .channel(`seats:${scheduleId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "seats", filter: `schedule_id=eq.${scheduleId}` },
        () => {
          qc.invalidateQueries({ queryKey: ["schedule-seats", scheduleId] });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [scheduleId, qc]);
}
