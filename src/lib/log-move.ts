import { createServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";

export const logMove = createServerFn({ method: "POST" })
  .validator((data: { bookingId: string; fromStage: string; toStage: string }) => data)
  .handler(async ({ data }) => {
    try {
      const { error } = await (supabase.rpc as any)("log_production_stage_move", {
        p_booking_id: data.bookingId,
        p_from_stage: data.fromStage,
        p_to_stage: data.toStage,
      });

      if (error) {
        console.error("[logMove] RPC error:", error.message);
        // We don't throw to avoid breaking the UX, it's just an audit log.
      }
      return { success: true };
    } catch (err: any) {
      console.error("[logMove] caught error:", err?.message);
      // Fail silently to avoid breaking UX for Dumb User
      return { success: false, error: "Silent failure" };
    }
  });
