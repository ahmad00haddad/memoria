import { createServerFn } from "@tanstack/react-start";

export const getPhotographerProfileData = createServerFn({ method: "GET" })
  .inputValidator((d: { pid: string }) => d)
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { pid } = data;

    const [{ data: p }, { data: r }, { data: u }, { data: bk }, { count: cc }] = await Promise.all([
      supabaseAdmin.from("pricing_rules").select("*").eq("photographer_id", pid),
      supabaseAdmin.from("reviews").select("*").eq("photographer_id", pid).eq("is_published", true).order("created_at", { ascending: false }),
      supabaseAdmin.rpc("get_photographer_busy_dates", { _pid: pid }),
      supabaseAdmin.from("bookings").select("event_date,start_time,end_time").eq("photographer_id", pid).is("deleted_at", null).in("status", ["confirmed", "pending_deposit"]),
      supabaseAdmin.from("bookings").select("id", { count: "exact", head: true }).eq("photographer_id", pid).eq("status", "completed").is("deleted_at", null),
    ]);

    return {
      pricing: p ?? [],
      reviews: r ?? [],
      unavail: u ?? [],
      bookedSlots: bk ?? [],
      completedCount: cc ?? 0,
    };
  });
