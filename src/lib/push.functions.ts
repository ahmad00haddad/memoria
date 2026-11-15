import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** المفتاح العام لـ VAPID (آمن للعرض) — null إن لم يُهيَّأ الإرسال بعد. */
export const getVapidPublicKey = createServerFn({ method: "GET" }).handler(async () => {
  const { isPushConfigured } = await import("@/lib/push.server");
  return isPushConfigured() ? (process.env.VAPID_PUBLIC_KEY as string) : null;
});

/** إشعار تجربة للمصوّرة بعد التفعيل: تتأكد أنه يصل فعلاً */
export const sendTestPush = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { sendPushToUser } = await import("@/lib/push.server");
    await sendPushToUser(context.userId, { title: "ميموريا", body: "✅ الإشعارات شغّالة. هيك رح يوصلك كل طلب جديد.", link: "/dashboard" });
    return { ok: true };
  });
