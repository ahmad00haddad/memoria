import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { t as tr } from "@/i18n";

// ============================================================================
// account.functions.ts — حذف الحساب من صاحبته (self-service)
// يُخفي الصفحة ويُعلّم الملف محذوفاً ويمنع الدخول. لا نحذف الصفوف فعلياً حتى لا تفقد
// العروس سجلّ حجزها (الحذف الكامل يبقى للإدارة). يُرفض إن وُجدت حجوزات قادمة مؤكدة.
// ============================================================================

export const deleteMyAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { confirm: string }) => {
    if (String(d?.confirm ?? "").trim() !== "حذف") throw new Error(tr("اكتبي كلمة «حذف» للتأكيد"));
    return { confirm: "حذف" };
  })
  .handler(async ({ context }) => {
    const { userId } = context as any;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const admin = supabaseAdmin as any;
    const today = new Date().toISOString().slice(0, 10);
    const { count } = await admin.from("bookings").select("id", { count: "exact", head: true })
      .eq("photographer_id", userId).is("deleted_at", null)
      .in("status", ["confirmed", "pending_deposit"]).gte("event_date", today);
    if ((count ?? 0) > 0) throw new Error(tr("عندكِ حجوزات قادمة. أنهيها أو ألغيها قبل حذف الحساب."));
    const now = new Date().toISOString();
    const { error } = await admin.from("profiles")
      .update({ deleted_at: now, is_published: false, updated_at: now }).eq("id", userId);
    if (error) throw new Error(error.message);
    await admin.from("audit_logs").insert({
      action: "profile.self_delete", actor_id: userId, entity_type: "profile", entity_id: userId,
      after_data: { self_deleted: true },
    });
    try {
      await admin.auth.admin.updateUserById(userId, { ban_duration: "876000h" });
    } catch (e) { console.error("[account] ban failed", e); }
    return { ok: true };
  });
