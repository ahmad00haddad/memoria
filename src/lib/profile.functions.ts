import { createServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";

export const getPhotographerProfileData = createServerFn({ method: "GET" })
  .inputValidator((d: { pid: string }) => d)
  .handler(async ({ data }) => {
    const { pid } = data;

    // Use the RPC to fetch all data bypassing RLS (since we don't have Service Role Key)
    const [{ data: result, error }, { data: tier }] = await Promise.all([
      (supabase as any).rpc("get_public_profile_data", { p_id: pid }),
      supabase.rpc("photographer_tier", { _pid: pid }),
    ]);
    
    if (error || !result) {
      console.error("RPC Error:", error);
      return { pricing: [], reviews: [], unavail: [], bookedSlots: [], completedCount: 0, responseHours: null as number | null, isPro: tier === "pro" };
    }

    // The RPC returns a JSON object with the keys we need
    const r = result as any;
    return {
      pricing: r.pricing ?? [],
      reviews: r.reviews ?? [],
      unavail: r.unavail ?? [],
      bookedSlots: r.bookedSlots ?? [],
      completedCount: r.completedCount ?? 0,
      responseHours: (r.responseHours ?? null) as number | null,
      // شارة التوثيق تظهر لباقة Pro فقط
      isPro: tier === "pro",
    };
  });

