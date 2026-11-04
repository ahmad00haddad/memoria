// ============================================================================
// abuse.server.ts — حدّ المعدّل بحسب IP أو مفتاح (يستعمل جدول rate_limits)
// ----------------------------------------------------------------------------
// الهدف: منع إغراق المصوّرات بطلبات وهمية، وإرسال إيميلات/رموز بالجملة لشخص آخر،
// وتجريب رموز التأكيد. إن تعطّل الجدول نفتح الطريق (fail-open) كي لا تتوقف الحجوزات.
// ============================================================================
import { getRequest } from "@tanstack/react-start/server";

export function clientIp(): string {
  try {
    const h = getRequest()?.headers;
    return (
      h?.get("cf-connecting-ip") ||
      h?.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      "unknown"
    );
  } catch {
    return "unknown";
  }
}

export function clientUserAgent(): string {
  try {
    return (getRequest()?.headers.get("user-agent") || "").slice(0, 200);
  } catch {
    return "";
  }
}

/** true = مسموح (ويُسجَّل المحاولة)، false = تجاوز الحد. */
export async function allow(key: string, action: string, max: number, windowSec: number): Promise<boolean> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const admin = supabaseAdmin as any;
    const since = new Date(Date.now() - windowSec * 1000).toISOString();
    const { count, error } = await admin.from("rate_limits")
      .select("id", { count: "exact", head: true })
      .eq("token", key).eq("action", action).gte("created_at", since);
    if (error) return true;
    if ((count ?? 0) >= max) return false;
    await admin.from("rate_limits").insert({ token: key, action });
    return true;
  } catch (e) {
    console.error("[abuse] rate-limit check failed (allowing)", e);
    return true;
  }
}

export const TOO_MANY = "محاولات كثيرة خلال وقت قصير. انتظري قليلاً ثم أعيدي المحاولة.";
