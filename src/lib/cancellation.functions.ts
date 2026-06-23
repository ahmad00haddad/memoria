import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// ============================================================================
// cancellation.functions.ts — إلغاء الحجوزات (مصوّرة/أدمن + عميل) واسترداد العربون
// ----------------------------------------------------------------------------
//   * cancelBooking          — مُصادَق، يستدعي cancel_booking عبر عميل المستخدم
//                              (auth.uid() = المصوّرة)؛ الدالة تتحقّق من الملكية.
//   * clientCancelBooking    — عام عبر الرمز، يستدعي client_cancel_booking عبر
//                              service-role؛ مسموح فقط قبل التأكيد.
//   * updateRefundPolicy     — المصوّرة تضبط سياسة استرداد العربون.
//
// كل المنطق الحسّاس (الصلاحية/الحالة/الاسترداد) محسوم على الخادم في دوال SQL
// (server-authoritative).
// ============================================================================

const UUID_RE = /^[0-9a-f-]{36}$/i;
const TOKEN_RE = /^[A-Za-z0-9_-]{16,64}$/;

function appBase(): string {
  return process.env.PUBLIC_APP_URL || "https://elitecapture.com";
}

// ----- المصوّرة/الأدمن تلغي الحجز -----
export const cancelBooking = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { booking_id: string; reason?: string | null }) => {
    if (!d || typeof d.booking_id !== "string" || !UUID_RE.test(d.booking_id)) {
      throw new Error("invalid booking_id");
    }
    if (d.reason != null && (typeof d.reason !== "string" || d.reason.length > 2000)) {
      throw new Error("invalid reason");
    }
    return { booking_id: d.booking_id, reason: d.reason ?? null };
  })
  .handler(async ({ data, context }) => {
    const { supabase } = context;

    const { data: res, error } = await supabase.rpc("cancel_booking", {
      _booking_id: data.booking_id,
      _reason: data.reason,
    } as any);
    if (error) {
      const m = error.message || "";
      if (m.includes("CANNOT_CANCEL_COMPLETED")) throw new Error("لا يمكن إلغاء حجز مكتمل");
      if (m.includes("ALREADY_CANCELLED")) throw new Error("الحجز ملغى مسبقاً");
      if (m.includes("BOOKING_NOT_FOUND")) throw new Error("الحجز غير موجود");
      if (m.includes("forbidden")) throw new Error("forbidden");
      throw new Error(m);
    }

    const info = (res || {}) as any;

    // إشعارات العميل (إيميل + واتساب) — fire-and-forget.
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { sendEmail, tplBookingCancelled } = await import("@/lib/email.server");
      const { data: prof } = await supabaseAdmin
        .from("profiles").select("display_name").eq("id", info.photographer_id).maybeSingle();
      const photographerName = prof?.display_name || "المصوّرة";

      if (info.client_email) {
        const t = tplBookingCancelled({
          client_name: info.client_name || "عميلتنا",
          photographer_name: photographerName,
          event_date: String(info.event_date),
          refund_amount: Number(info.refund_amount || 0),
          by: "photographer",
          track_token: info.tracking_token,
        });
        await sendEmail({
          to: info.client_email, subject: t.subject, html: t.html,
          template: "booking_cancelled", related_booking_id: info.booking_id,
        });
      }
      if (info.client_phone) {
        const { sendWhatsAppText } = await import("@/lib/whatsapp.server");
        const refundLine = Number(info.refund_amount || 0) > 0
          ? ` سيتم رد عربون بقيمة ${info.refund_amount}.` : "";
        await sendWhatsAppText(
          info.client_phone,
          `نأسف، تم إلغاء حجزك مع ${photographerName} بتاريخ ${info.event_date}.${refundLine}`,
        );
      }
    } catch (e) {
      console.error("[cancel] photographer-cancel notifications failed:", e);
    }

    return {
      ok: true,
      refund_amount: Number(info.refund_amount || 0),
      refund_status: info.refund_status || "none",
    };
  });

// ----- العميل يلغي الحجز (قبل التأكيد) -----
export const clientCancelBooking = createServerFn({ method: "POST" })
  .inputValidator((d: { token: string; reason?: string | null }) => {
    if (!d || typeof d.token !== "string" || !TOKEN_RE.test(d.token)) throw new Error("invalid token");
    if (d.reason != null && (typeof d.reason !== "string" || d.reason.length > 2000)) {
      throw new Error("invalid reason");
    }
    return { token: d.token, reason: d.reason ?? null };
  })
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: res, error } = await supabaseAdmin.rpc("client_cancel_booking", {
      _token: data.token,
      _reason: data.reason,
    } as any);
    if (error) {
      const m = error.message || "";
      if (m.includes("CLIENT_CANCEL_NOT_ALLOWED")) {
        throw new Error("لا يمكن الإلغاء بعد تأكيد الحجز — يرجى التواصل مع المصوّرة");
      }
      if (m.includes("invalid token")) throw new Error("رابط غير صالح");
      throw new Error(m);
    }

    const info = (res || {}) as any;

    // إشعار المصوّرة بالبريد — fire-and-forget.
    try {
      const { sendEmail, tplBookingCancelled } = await import("@/lib/email.server");
      const { data: pUser } = await supabaseAdmin.auth.admin.getUserById(info.photographer_id);
      const photographerEmail = pUser?.user?.email;
      const { data: prof } = await supabaseAdmin
        .from("profiles").select("display_name").eq("id", info.photographer_id).maybeSingle();
      if (photographerEmail) {
        const t = tplBookingCancelled({
          client_name: info.client_name || "العميل",
          photographer_name: prof?.display_name || "المصوّرة",
          event_date: String(info.event_date),
          refund_amount: 0,
          by: "client",
          booking_id: info.booking_id,
        });
        await sendEmail({
          to: photographerEmail, subject: t.subject, html: t.html,
          template: "booking_cancelled_by_client",
          related_booking_id: info.booking_id, related_user_id: info.photographer_id,
        });
      }
    } catch (e) {
      console.error("[cancel] client-cancel notification failed:", e);
    }

    return { ok: true };
  });

// ----- المصوّرة تضبط سياسة استرداد العربون -----
export const updateRefundPolicy = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { policy: "full" | "partial" | "none"; percent?: number | null }) => {
    if (!d || !["full", "partial", "none"].includes(d.policy)) throw new Error("invalid policy");
    let percent: number | null = null;
    if (d.policy === "partial") {
      percent = Number(d.percent);
      if (!Number.isInteger(percent) || percent < 0 || percent > 100) {
        throw new Error("نسبة الاسترداد يجب أن تكون بين 0 و100");
      }
    }
    return { policy: d.policy, percent };
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("profiles")
      .update({
        deposit_refund_policy: data.policy,
        deposit_refund_percent: data.percent,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// مرجع لرابط المتابعة (يُستخدم في الواجهة عند الحاجة).
export const trackUrlBase = appBase;
