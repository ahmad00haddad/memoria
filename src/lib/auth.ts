import { supabase } from "@/integrations/supabase/client";

export async function signOut() {
  // قبل الخروج: نحذف اشتراك الإشعارات لهذا الجهاز حتى لا تصل إشعارات هذه المصوّرة (أسماء/أرقام عرائس) لمن يدخل بعدها
  try {
    if (typeof navigator !== "undefined" && "serviceWorker" in navigator) {
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = await reg?.pushManager?.getSubscription();
      if (sub) {
        await (supabase as any).from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
        await sub.unsubscribe();
      }
    }
  } catch { /* لا نعطّل الخروج أبداً */ }
  // الحدث SIGNED_OUT يمسح الكاش أيضاً لكن الانتقال التالي قد يقطعه؛ المسح مرتين آمن
  try { (await import("@/lib/page-cache")).clearAppCache(); } catch { /* ignore */ }
  await supabase.auth.signOut();
  window.location.href = "/";
}
