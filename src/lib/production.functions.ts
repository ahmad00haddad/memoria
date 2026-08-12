import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// ============================================================================
// production.functions.ts — دوال إدارة مراحل الإنتاج (خادمية بالكامل)
// ----------------------------------------------------------------------------
// تُستبدل بها الكتابات المباشرة من Client في dashboard.bookings.$id.tsx.
// كل دالة تتحقق من الملكية، تسجّل في audit_logs، وترسل الإشعارات عند الحاجة.
// ============================================================================

const UUID_RE = /^[0-9a-f-]{36}$/i;

// ----- تحديث مرحلة الإنتاج (editing / delivering / delivered) -----
export const updateProductionStage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { booking_id: string; stage: string }) => {
    if (!d || typeof d.booking_id !== "string" || !UUID_RE.test(d.booking_id)) {
      throw new Error("invalid booking_id");
    }
    const VALID = ["awaiting", "shooting", "selecting", "editing", "ready", "delivered"];
    if (!VALID.includes(d.stage)) throw new Error(`stage يجب أن يكون من: ${VALID.join(", ")}`);
    return d;
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as any;

    // التحقق من الملكية قبل التحديث
    const { data: bk, error: fetchErr } = await supabase
      .from("bookings")
      .select("id, photographer_id, status, production_stage, editing_started_at, client_email, client_name, client_phone, event_date, client_tracking_token, client_user_id")
      .eq("id", data.booking_id)
      .maybeSingle();
    if (fetchErr) throw new Error(fetchErr.message);
    if (!bk) throw new Error("الحجز غير موجود");
    if (bk.photographer_id !== userId) throw new Error("غير مصرح");

    const now = new Date().toISOString();
    const patch: any = { production_stage: data.stage, updated_at: now };

    // ضبط timestamps تلقائياً حسب المرحلة
    const STAGES_ORDER = ["awaiting", "shooting", "selecting", "editing", "ready", "delivered"];
    const fromIdx = STAGES_ORDER.indexOf(bk.production_stage || "awaiting");
    const toIdx = STAGES_ORDER.indexOf(data.stage);
    const isMovingBackward = toIdx < fromIdx;

    // حراسة خادمية للتسلسل والحالة (لا نعتمد على واجهة العميل)
    if (bk.status === "cancelled") throw new Error("لا يمكن تغيير مرحلة حجز ملغي");
    if (bk.status === "completed" && bk.production_stage !== "delivered") {
      throw new Error("هذا الحجز مغلق ولا يمكن تغيير مرحلته");
    }
    if (toIdx === fromIdx) return { ok: true, stage: data.stage, unchanged: true };
    if (toIdx > fromIdx + 1) throw new Error("لا يمكن تخطي المراحل. انقلي الحجز خطوة بخطوة.");

    if (data.stage === "editing" && !bk.editing_started_at) {
      patch.editing_started_at = now;
    }
    if (data.stage === "delivered") {
      patch.editing_completed_at = now;
      patch.delivered_at = now;
      patch.status = "completed";
    }

    if (isMovingBackward) {
      if (bk.production_stage === "editing" && data.stage === "selecting") {
        patch.editing_started_at = null;
        patch.editing_completed_at = null;
      }
      if (bk.production_stage === "delivered") {
        patch.delivered_at = null;
        patch.editing_completed_at = null;
        patch.status = "confirmed";
      }
    }

    const { error: updateErr } = await supabase
      .from("bookings")
      .update(patch)
      .eq("id", data.booking_id);
    if (updateErr) throw new Error(updateErr.message);

    // إشعار واتساب حسب المرحلة — fire-and-forget
    if (bk.client_phone) {
      try {
        const { sendWhatsAppNotification } = await import("@/lib/whatsapp.server");
        const base = process.env.PUBLIC_APP_URL || "https://memoria-jo.lovable.app";
        const trackingUrl = bk.client_tracking_token
          ? `${base}/track/${bk.client_tracking_token}`
          : undefined;
        const { data: prof } = await supabase
          .from("profiles")
          .select("display_name")
          .eq("id", userId)
          .maybeSingle();
        const photographerName = (prof as any)?.display_name || "المصورة";

        // أرسل إشعاراً للعميل بمرحلة المونتاج فقط (لا نُرسل لكل مرحلة لتجنب الإزعاج)
        if (data.stage === "editing") {
          await sendWhatsAppNotification(userId, bk.client_phone, "editing", {
            client_name: bk.client_name || "عميلتنا",
            photographer_name: photographerName,
            event_date: String(bk.event_date ?? ""),
            tracking_url: trackingUrl,
          });
        }
      } catch (e) {
        console.error("[production] editing WhatsApp failed", e);
      }
    }

    // تسجيل في audit_logs (عبر service-role لتجاوز RLS)
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      await supabaseAdmin.from("audit_logs").insert({
        action: `booking.production_stage.${data.stage}`,
        actor_id: userId,
        entity_type: "booking",
        entity_id: data.booking_id,
        before_data: { production_stage: bk.production_stage } as any,
        after_data: { production_stage: data.stage, ...(data.stage === "delivered" ? { status: "completed" } : {}) } as any,
      });
    } catch (e) { console.error("[production] audit log failed", e); }

    // إشعار العميل عند التسليم
    if (data.stage === "delivered") {
      // إشعار in-app للعميل
      if (bk.client_user_id) {
        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          await supabaseAdmin.from("notifications").insert({
            user_id: bk.client_user_id,
            title: "صورك جاهزة! 🎉",
            body: "تم تسليم صور حجزك. يمكنك الآن مراجعتها.",
            link: bk.client_tracking_token ? `/track/${bk.client_tracking_token}` : null,
          });
        } catch (e) { console.error("[production] notification failed", e); }
      }

      // إيميل التسليم (fire-and-forget)
      try {
        const { sendGalleryDeliveredEmail } = await import("@/lib/email.functions");
        await sendGalleryDeliveredEmail({ data: { booking_id: data.booking_id } });
      } catch (e) { console.error("[production] delivery email failed", e); }

      // واتساب التسليم — إشعار فوري بجاهزية الصور (fire-and-forget)
      if (bk.client_phone) {
        try {
          const { sendWhatsAppNotification } = await import("@/lib/whatsapp.server");
          const base = process.env.PUBLIC_APP_URL || "https://memoria-jo.lovable.app";
          const trackingUrl = bk.client_tracking_token
            ? `${base}/track/${bk.client_tracking_token}`
            : undefined;
          const { data: profDlv } = await supabase
            .from("profiles")
            .select("display_name")
            .eq("id", userId)
            .maybeSingle();
          await sendWhatsAppNotification(userId, bk.client_phone, "delivery", {
            client_name: bk.client_name || "عميلتنا",
            photographer_name: (profDlv as any)?.display_name || "المصورة",
            event_date: String(bk.event_date ?? ""),
            tracking_url: trackingUrl,
          });
        } catch (e) {
          console.error("[production] delivery WhatsApp failed", e);
        }
      }

      // واتساب طلب التقييم — بعد ساعة افتراضياً (هنا نرسله فوراً ويمكن تأجيله لاحقاً)
      if (bk.client_phone) {
        try {
          const { sendWhatsAppNotification } = await import("@/lib/whatsapp.server");
          const base = process.env.PUBLIC_APP_URL || "https://memoria-jo.lovable.app";
          const reviewUrl = bk.client_tracking_token
            ? `${base}/review/${bk.client_tracking_token}`
            : undefined;
          const { data: profRev } = await supabase
            .from("profiles")
            .select("display_name")
            .eq("id", userId)
            .maybeSingle();
          await sendWhatsAppNotification(userId, bk.client_phone, "review", {
            client_name: bk.client_name || "عميلتنا",
            photographer_name: (profRev as any)?.display_name || "المصورة",
            event_date: String(bk.event_date ?? ""),
            tracking_url: reviewUrl,
          });
        } catch (e) {
          console.error("[production] review WhatsApp failed", e);
        }
      }
    }

    return { ok: true, stage: data.stage };
  });

// ----- تسجيل استلام الدفعة النهائية -----
export const markFinalPaymentReceived = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { booking_id: string; amount?: number | null; note?: string | null }) => {
    if (!d || typeof d.booking_id !== "string" || !UUID_RE.test(d.booking_id)) {
      throw new Error("invalid booking_id");
    }
    if (d.amount != null && (typeof d.amount !== "number" || d.amount < 0 || d.amount > 1000000)) {
      throw new Error("invalid amount");
    }
    if (d.note != null && (typeof d.note !== "string" || d.note.length > 2000)) {
      throw new Error("invalid note");
    }
    return d;
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as any;

    const { data: bk, error: fetchErr } = await supabase
      .from("bookings")
      .select("id, photographer_id, total_price, deposit_amount, final_paid_at")
      .eq("id", data.booking_id)
      .maybeSingle();
    if (fetchErr) throw new Error(fetchErr.message);
    if (!bk) throw new Error("الحجز غير موجود");
    if (bk.photographer_id !== userId) throw new Error("غير مصرح");
    if (bk.final_paid_at) throw new Error("تم تسجيل الدفعة النهائية مسبقاً");

    const amount = data.amount ?? Math.max(0, Number(bk.total_price ?? 0) - Number(bk.deposit_amount ?? 0));
    const now = new Date().toISOString();

    const { error: updateErr } = await supabase
      .from("bookings")
      .update({
        final_paid_at: now,
        final_paid_amount: amount,
        updated_at: now,
      })
      .eq("id", data.booking_id);
    if (updateErr) throw new Error(updateErr.message);

    // تسجيل في audit_logs
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      await supabaseAdmin.from("audit_logs").insert({
        action: "booking.final_payment_received",
        actor_id: userId,
        entity_type: "booking",
        entity_id: data.booking_id,
        after_data: { final_paid_at: now, final_paid_amount: amount, note: data.note ?? null } as any,
      });
    } catch (e) { console.error("[production] final payment audit log failed", e); }

    return { ok: true, amount };
  });

// ----- تحديث حالة الحجز (للحالات غير "confirmed") -----
export const updateBookingStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { booking_id: string; status: string }) => {
    if (!d || typeof d.booking_id !== "string" || !UUID_RE.test(d.booking_id)) {
      throw new Error("invalid booking_id");
    }
    const VALID = ["quote", "pending_deposit", "completed"];
    if (!VALID.includes(d.status)) {
      throw new Error(`status يجب أن يكون من: ${VALID.join(", ")} (استخدم confirmBookingAfterDeposit للتأكيد، وcancelBooking للإلغاء)`);
    }
    return d;
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as any;

    const { data: bk, error: fetchErr } = await supabase
      .from("bookings")
      .select("id, photographer_id, status")
      .eq("id", data.booking_id)
      .maybeSingle();
    if (fetchErr) throw new Error(fetchErr.message);
    if (!bk) throw new Error("الحجز غير موجود");
    if (bk.photographer_id !== userId) throw new Error("غير مصرح");

    const now = new Date().toISOString();
    const { error: updateErr } = await supabase
      .from("bookings")
      .update({ status: data.status, updated_at: now })
      .eq("id", data.booking_id);
    if (updateErr) throw new Error(updateErr.message);

    // تسجيل في audit_logs
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      await supabaseAdmin.from("audit_logs").insert({
        action: `booking.status.${data.status}`,
        actor_id: userId,
        entity_type: "booking",
        entity_id: data.booking_id,
        before_data: { status: bk.status } as any,
        after_data: { status: data.status } as any,
      });
    } catch (e) { console.error("[production] status update audit log failed", e); }

    return { ok: true };
  });

// ----- حفظ رابط اختيار الصور -----
export const saveBookingSelectionLink = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { booking_id: string; link: string }) => {
    if (!d || typeof d.booking_id !== "string" || !UUID_RE.test(d.booking_id)) {
      throw new Error("invalid booking_id");
    }
    if (!d.link || typeof d.link !== "string") throw new Error("الرابط مطلوب");
    if (d.link.length > 2000) throw new Error("الرابط طويل جداً");
    // التحقق من صيغة URL
    try { new URL(d.link); } catch { throw new Error("صيغة الرابط غير صحيحة"); }
    return d;
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as any;

    const { data: bk, error: fetchErr } = await supabase
      .from("bookings")
      .select("id, photographer_id, client_user_id, client_tracking_token")
      .eq("id", data.booking_id)
      .maybeSingle();
    if (fetchErr) throw new Error(fetchErr.message);
    if (!bk) throw new Error("الحجز غير موجود");
    if (bk.photographer_id !== userId) throw new Error("غير مصرح");

    const { error: updateErr } = await supabase
      .from("bookings")
      .update({ selection_link: data.link, updated_at: new Date().toISOString() })
      .eq("id", data.booking_id);
    if (updateErr) throw new Error(updateErr.message);

    // إشعار العميل بوجود رابط الاختيار
    if (bk.client_user_id) {
      try {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        await supabaseAdmin.from("notifications").insert({
          user_id: bk.client_user_id,
          title: "رابط اختيار الصور جاهز",
          body: "أرسل لك المصوّرة رابط لاختيار صورك المفضلة.",
          link: bk.client_tracking_token ? `/track/${bk.client_tracking_token}` : null,
        });
      } catch (e) { console.error("[production] selection link notification failed", e); }
    }

    return { ok: true };
  });
