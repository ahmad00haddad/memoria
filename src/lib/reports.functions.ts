import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { computeReportStats, type ReportStats } from "./report-stats";

export type { ReportStats };

// ============================================================================
// reports.functions.ts — تحليلات المصوّرة (server-authoritative)
// ----------------------------------------------------------------------------
// كل الحسابات تتم على الخادم عبر supabaseAdmin (service-role) لضمان:
//   1) Server-authoritative: لا نثق بحسابات العميل.
//   2) تجنّب N+1: نجلب كل الحجوزات دفعة واحدة ثم نجمعها في الذاكرة.
//   3) الأمان: المصوّرة ترى بياناتها فقط (نفلتر بـ userId).
//
// الاستخدام: تستدعيها dashboard.reports.tsx عبر useServerFn.
// ============================================================================

const RANGE_RE = /^(30|90|365|all)$/;

export const getReportStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { range?: string }) => {
    const range = d?.range ?? "365";
    if (!RANGE_RE.test(range)) throw new Error("نطاق غير صالح");
    return { range };
  })
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // 1) اجلب كل الحجوزات للمصوّرة دفعة واحدة (لا N+1).
    const { data: bookings, error } = await supabaseAdmin
      .from("bookings")
      .select("id, client_name, event_date, service, status, total_price, deposit_amount, "
            + "deposit_confirmed_at, delivered_at, created_at, cancelled_at")
      .eq("photographer_id", userId)
      .is("deleted_at", null)
      .order("event_date", { ascending: false });

    if (error) throw new Error(error.message);

    const all = (bookings ?? []) as any[];
    // 13) مصادر العملاء (Referrals).
    const { data: referrals } = await supabaseAdmin
      .from("referrals")
      .select("referrer_id, referred_id")
      .eq("referrer_id", userId);

    // اربط الإحالات بالحجوزات الفعلية.
    const referredIds = (referrals ?? []).map((r: any) => r.referred_id);
    let referralSources: { referrer_id: string; count: number }[] = [];
    if (referredIds.length > 0) {
      const { data: refBookings } = await supabaseAdmin
        .from("bookings")
        .select("photographer_id")
        .in("photographer_id", referredIds)
        .is("deleted_at", null);
      const refCount: Record<string, number> = {};
      (refBookings ?? []).forEach((b: any) => {
        refCount[b.photographer_id] = (refCount[b.photographer_id] || 0) + 1;
      });
      referralSources = Object.entries(refCount).map(([id, count]) => ({ referrer_id: id, count }));
    }

    return computeReportStats(all, data.range, referralSources);
  });