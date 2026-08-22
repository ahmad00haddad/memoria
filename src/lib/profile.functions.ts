import { createServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";

export const getPhotographerProfileData = createServerFn({ method: "GET" })
  .inputValidator((d: { pid: string }) => d)
  .handler(async ({ data }) => {
    const { pid } = data;

    // Use the RPC to fetch all data bypassing RLS (since we don't have Service Role Key)
    const { data: result, error } = await (supabase as any).rpc("get_public_profile_data", { p_id: pid });
    
    if (error || !result) {
      console.error("RPC Error:", error);
      return { pricing: [], reviews: [], unavail: [], bookedSlots: [], completedCount: 0 };
    }

    // The RPC returns a JSON object with the keys we need
    const r = result as any;
    return {
      pricing: r.pricing ?? [],
      reviews: r.reviews ?? [],
      unavail: r.unavail ?? [],
      bookedSlots: r.bookedSlots ?? [],
      completedCount: r.completedCount ?? 0,
    };
  });

