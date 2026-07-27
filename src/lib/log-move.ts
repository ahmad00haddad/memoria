import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Audit log for kanban stage moves. Runs as the authenticated photographer so
// RLS/ownership checks inside the RPC apply. Fails silently to avoid breaking
// the UX flow — the move itself is not gated on this succeeding.
export const logMove = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { bookingId: string; fromStage: string; toStage: string }) => data)
  .handler(async ({ data, context }) => {
    try {
      const { error } = await (context.supabase.rpc as any)("log_production_stage_move", {
        p_booking_id: data.bookingId,
        p_from_stage: data.fromStage,
        p_to_stage: data.toStage,
      });
      if (error) console.error("[logMove] RPC error:", error.message);
      return { success: !error };
    } catch (err: any) {
      console.error("[logMove] caught error:", err?.message);
      return { success: false };
    }
  });
