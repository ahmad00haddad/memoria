import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// ملخص السنة للمصوّرة — مخصّص للمشاركة على إنستغرام، لذا لا يحتوي أي مبالغ
// أو أسماء عميلات أو أرقام هواتف: أعداد وأنماط فقط.
export type YearRecap = {
  year: number;
  name: string;
  username: string | null;
  events: number;
  photos: number;
  hours: number;
  venues: number;
  topMonth: number | null; // 0..11
  topMonthCount: number;
  topWeekday: number | null; // 0=الأحد
  videoShare: number; // نسبة الحجوزات السينمائية 0..100
  reviews: number;
  avgRating: number | null;
};

export const getYearRecap = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { year?: number } | undefined) => ({ year: Number(d?.year) || new Date().getFullYear() }))
  .handler(async ({ context, data }): Promise<YearRecap> => {
    const { supabase, userId } = context;
    const from = `${data.year}-01-01`;
    const to = `${data.year}-12-31`;
    const [{ data: prof }, { data: rows }, { data: revs }] = await Promise.all([
      supabase.from("profiles").select("display_name, username").eq("id", userId).maybeSingle(),
      supabase.from("bookings")
        .select("event_date,start_time,end_time,venue_name,service,edited_photos_count,status")
        .eq("photographer_id", userId).is("deleted_at", null)
        .in("status", ["confirmed", "completed"])
        .gte("event_date", from).lte("event_date", to),
      supabase.from("reviews").select("rating, created_at")
        .eq("photographer_id", userId).eq("is_published", true)
        .gte("created_at", `${from}T00:00:00Z`).lte("created_at", `${to}T23:59:59Z`),
    ]);

    const list = rows ?? [];
    const months = new Array(12).fill(0);
    const weekdays = new Array(7).fill(0);
    const venues = new Set<string>();
    let photos = 0, minutes = 0, video = 0;
    for (const b of list) {
      const d = new Date(`${b.event_date}T12:00:00Z`);
      months[d.getUTCMonth()]++;
      weekdays[d.getUTCDay()]++;
      if (b.venue_name?.trim()) venues.add(b.venue_name.trim().toLowerCase());
      photos += Number(b.edited_photos_count) || 0;
      if (b.service === "cinematic_video") video++;
      const [sh, sm] = (b.start_time || "0:0").split(":").map(Number);
      const [eh, em] = (b.end_time || "0:0").split(":").map(Number);
      const span = eh * 60 + em - (sh * 60 + sm);
      if (span > 0 && span < 24 * 60) minutes += span;
    }
    const argmax = (a: number[]) => (Math.max(...a) > 0 ? a.indexOf(Math.max(...a)) : null);
    const topMonth = argmax(months);
    const ratings = (revs ?? []).map((r) => Number(r.rating)).filter((n) => n > 0);

    return {
      year: data.year,
      name: prof?.display_name || "",
      username: prof?.username ?? null,
      events: list.length,
      photos,
      hours: Math.round(minutes / 60),
      venues: venues.size,
      topMonth,
      topMonthCount: topMonth === null ? 0 : months[topMonth],
      topWeekday: argmax(weekdays),
      videoShare: list.length ? Math.round((video / list.length) * 100) : 0,
      reviews: ratings.length,
      avgRating: ratings.length ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10 : null,
    };
  });
