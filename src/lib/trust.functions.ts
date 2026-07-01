import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// ============================================================================
// trust.functions.ts — التحقق من المصوّرات + النزاعات + تفضيلات الإشعارات
// ----------------------------------------------------------------------------
// مستوحى من التقرير التنفيذي (أقسام 10.2، 10.5، 13.2):
//   * verifyPhotographerStatus — الأدمن يتحقق من المصوّرة (ثقة).
//   * raiseDispute — رفع نزاع على حجز (عميل/مصوّرة).
//   * resolveDispute — الأدمن يحلّ النزاع.
//   * updateNotificationPreferences — المستخدم يتحكّم بإشعاراته.
//   * requestVerification — المصوّرة تطلب التحقق.
// ============================================================================

const UUID_RE = /^[0-9a-f-]{36}$/i;

// ----- الأدمن يتحقق من المصوّرة -----
export const verifyPhotographerStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { photographer_id: string; status: "verified" | "rejected" | "pending_review" }) => {
    if (!d || !UUID_RE.test(d.photographer_id)) throw new Error("invalid photographer_id");
    if (!["verified", "rejected", "pending_review"].includes(d.status)) throw new Error("invalid status");
    return d;
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as any;
    // التحقق من دور الأدمن
    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", userId);
    const isAdmin = (roles ?? []).some((r: any) => r.role === "admin");
    if (!isAdmin) throw new Error("forbidden");

    const { error } = await supabase.rpc("admin_verify_photographer", {
      _photographer_id: data.photographer_id,
      _status: data.status,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ----- المصوّرة تطلب التحقق -----
export const requestVerification = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("profiles")
      .update({ verification_status: "pending_review", updated_at: new Date().toISOString() })
      .eq("id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ----- رفع نزاع على حجز -----
export const raiseDispute = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { booking_id: string; reason: string; raised_by_role: "client" | "photographer" }) => {
    if (!d || !UUID_RE.test(d.booking_id)) throw new Error("invalid booking_id");
    if (!d.reason || d.reason.length < 10 || d.reason.length > 5000) {
      throw new Error("السبب يجب أن يكون بين 10 و5000 حرف");
    }
    if (!["client", "photographer"].includes(d.raised_by_role)) throw new Error("invalid role");
    return d;
  })
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { userId } = context;

    // تحقّق من ملكية الحجز.
    const { data: bk } = await supabaseAdmin
      .from("bookings")
      .select("id, photographer_id, client_user_id")
      .eq("id", data.booking_id)
      .is("deleted_at", null)
      .maybeSingle();
    if (!bk) throw new Error("الحجز غير موجود");

    const isOwner = data.raised_by_role === "photographer"
      ? bk.photographer_id === userId
      : bk.client_user_id === userId;
    if (!isOwner) throw new Error("forbidden");

    const { error } = await supabaseAdmin.from("booking_disputes").insert({
      booking_id: data.booking_id,
      raised_by: userId,
      raised_by_role: data.raised_by_role,
      reason: data.reason,
    });
    if (error) throw new Error(error.message);

    // إشعار الأدمن.
    const { data: admins } = await supabaseAdmin
      .from("user_roles").select("user_id").eq("role", "admin");
    if (admins && admins.length > 0) {
      const notifications = admins.map((a: any) => ({
        user_id: a.user_id,
        title: "نزاع جديد",
        body: `تم رفع نزاع على حجز. السبب: ${data.reason.slice(0, 120)}`,
        link: `/admin`,
      }));
      await supabaseAdmin.from("notifications").insert(notifications);
    }

    return { ok: true };
  });

// ----- الأدمن يحلّ نزاع -----
export const resolveDispute = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { dispute_id: string; status: "resolved" | "dismissed"; resolution?: string | null }) => {
    if (!d || !UUID_RE.test(d.dispute_id)) throw new Error("invalid dispute_id");
    if (!["resolved", "dismissed"].includes(d.status)) throw new Error("invalid status");
    if (d.resolution && d.resolution.length > 5000) throw new Error("resolution too long");
    return d;
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as any;
    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", userId);
    const isAdmin = (roles ?? []).some((r: any) => r.role === "admin");
    if (!isAdmin) throw new Error("forbidden");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("booking_disputes")
      .update({
        status: data.status,
        resolution: data.resolution ?? null,
        resolved_by: userId,
        resolved_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", data.dispute_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ----- تحديث تفضيلات الإشعارات -----
export const updateNotificationPreferences = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { preferences: Record<string, boolean> }) => {
    if (!d || typeof d.preferences !== "object" || d.preferences === null) {
      throw new Error("invalid preferences");
    }
    // تحقّق من المفاتيح المسموحة.
    const allowed = new Set([
      "booking_new", "booking_confirmed", "booking_cancelled",
      "deposit_received", "message_new", "review_new",
      "subscription_expiring", "event_reminder", "marketing",
    ]);
    for (const key of Object.keys(d.preferences)) {
      if (!allowed.has(key)) throw new Error(`invalid preference key: ${key}`);
      if (typeof d.preferences[key] !== "boolean") throw new Error(`invalid value for ${key}`);
    }
    return d;
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("profiles")
      .update({
        notification_preferences: data.preferences,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });