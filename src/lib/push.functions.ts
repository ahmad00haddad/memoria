import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** المفتاح العام لـ VAPID (آمن للعرض) — null إن لم يُهيَّأ الإرسال بعد. */
export const getVapidPublicKey = createServerFn({ method: "GET" }).handler(async () => {
  const { isPushConfigured } = await import("@/lib/push.server");
  return isPushConfigured() ? (process.env.VAPID_PUBLIC_KEY as string) : null;
});

/** جهاز واحد = حساب واحد: قبل الحفظ نحذف أي صف لنفس الـendpoint يخص مستخدماً آخر (دخول حساب ثانٍ على نفس المتصفح) */
export const claimPushEndpoint = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { endpoint: string }) => {
    if (!d || typeof d.endpoint !== "string" || d.endpoint.length > 1000 || !/^https:\/\//.test(d.endpoint)) throw new Error("invalid endpoint");
    return { endpoint: d.endpoint };
  })
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await (supabaseAdmin as any).from("push_subscriptions").delete().eq("endpoint", data.endpoint).neq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** إشعار تجربة للمصوّرة بعد التفعيل: تتأكد أنه يصل فعلاً */
export const sendTestPush = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { sendPushToUser } = await import("@/lib/push.server");
    await sendPushToUser(context.userId, { title: "ميموريا", body: "✅ الإشعارات شغّالة. هيك رح يوصلك كل طلب جديد.", link: "/dashboard" });
    return { ok: true };
  });
