import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// ============================================================================
// calendar.functions.ts — دوال التقويم الخادمية
// ----------------------------------------------------------------------------
// تُضاف هنا دوال مساعدة للتقويم تحتاج server-side logic.
// الـ Calendar page حالياً تقرأ من Supabase client مباشرة — هذا مقبول
// لأن الـ RLS تحمي البيانات. نضيف هنا دوال للحالات الخاصة.
// ============================================================================

const UUID_RE = /^[0-9a-f-]{36}$/i;

/**
 * تُعيد ملخّص الحجوزات لشهر معيّن (لعرضها في التقويم بكفاءة).
 * تُدمج: حجوزات الشهر + أيام عدم التوفر + تواريخ التسليم القادمة.
 */
export const getCalendarMonthData = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { year: number; month: number }) => {
    if (!d || !Number.isInteger(d.year) || d.year < 2020 || d.year > 2030) {
      throw new Error("invalid year");
    }
    if (!Number.isInteger(d.month) || d.month < 1 || d.month > 12) {
      throw new Error("invalid month (1-12)");
    }
    return d;
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as any;

    const startDate = `${data.year}-${String(data.month).padStart(2, "0")}-01`;
    const endMonth = data.month === 12 ? 1 : data.month + 1;
    const endYear = data.month === 12 ? data.year + 1 : data.year;
    const endDate = `${endYear}-${String(endMonth).padStart(2, "0")}-01`;

    const [{ data: bookings }, { data: unavail }] = await Promise.all([
      supabase
        .from("bookings")
        .select("id, client_name, event_date, start_time, end_time, status, production_stage, delivery_due_at, total_price, service")
        .eq("photographer_id", userId)
        .gte("event_date", startDate)
        .lt("event_date", endDate)
        .is("deleted_at", null)
        .order("event_date", { ascending: true })
        .order("start_time", { ascending: true }),
      supabase
        .from("photographer_unavailability")
        .select("date, reason")
        .eq("photographer_id", userId)
        .gte("date", startDate)
        .lt("date", endDate),
    ]);

    // تجميع الحجوزات حسب التاريخ
    const byDate: Record<string, any[]> = {};
    for (const bk of bookings ?? []) {
      const d = String(bk.event_date);
      if (!byDate[d]) byDate[d] = [];
      byDate[d].push(bk);
    }

    // تجميع أيام عدم التوفر
    const unavailDates = new Set((unavail ?? []).map((u: any) => String(u.date)));

    // أيام التسليم القادمة (لتمييزها بلون مختلف)
    const deliveryDueSoon = (bookings ?? [])
      .filter((b: any) => b.delivery_due_at && b.production_stage !== "delivered")
      .map((b: any) => ({
        date: String(b.delivery_due_at).slice(0, 10),
        booking_id: b.id,
        client_name: b.client_name,
      }));

    return {
      bookings_by_date: byDate,
      unavail_dates: Array.from(unavailDates) as string[],
      delivery_due: deliveryDueSoon,
      total_bookings: (bookings ?? []).length,
      confirmed_count: (bookings ?? []).filter((b: any) => b.status === "confirmed").length,
      revenue_this_month: (bookings ?? [])
        .filter((b: any) => ["confirmed", "completed"].includes(b.status))
        .reduce((s: number, b: any) => s + Number(b.total_price ?? 0), 0),
    };
  });

/**
 * تُضيف/تُزيل يوم عدم توفر بضغطة واحدة.
 */
export const toggleUnavailability = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { date: string; reason?: string | null }) => {
    if (!d || typeof d.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(d.date)) {
      throw new Error("invalid date (YYYY-MM-DD)");
    }
    if (d.reason != null && (typeof d.reason !== "string" || d.reason.length > 500)) {
      throw new Error("invalid reason");
    }
    return d;
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as any;

    // التحقق من وجود تعارض مع حجز مؤكّد
    const { data: conflict } = await supabase
      .from("bookings")
      .select("id, client_name")
      .eq("photographer_id", userId)
      .eq("event_date", data.date)
      .in("status", ["confirmed", "pending_deposit"])
      .is("deleted_at", null)
      .limit(1);

    if (conflict && conflict.length > 0) {
      throw new Error(`لا يمكن إضافة يوم عدم التوفر — يوجد حجز مؤكّد لـ ${conflict[0].client_name} في هذا التاريخ`);
    }

    // التحقق من وجود مسبق
    const { data: existing } = await supabase
      .from("photographer_unavailability")
      .select("id")
      .eq("photographer_id", userId)
      .eq("date", data.date)
      .maybeSingle();

    if (existing) {
      // إزالة يوم عدم التوفر
      await supabase
        .from("photographer_unavailability")
        .delete()
        .eq("photographer_id", userId)
        .eq("date", data.date);
      return { action: "removed" as const, date: data.date };
    } else {
      // إضافة يوم عدم التوفر
      await supabase
        .from("photographer_unavailability")
        .insert({
          photographer_id: userId,
          date: data.date,
          reason: data.reason ?? null,
        });
      return { action: "added" as const, date: data.date };
    }
  });
