// اشتراك Web Push من المتصفح وحفظه في push_subscriptions (RLS: صفوفها فقط).
import { supabase } from "@/integrations/supabase/client";
import { getVapidPublicKey, claimPushEndpoint } from "@/lib/push.functions";

function b64urlToBytes(s: string) {
  const pad = "=".repeat((4 - (s.length % 4)) % 4);
  const raw = atob((s + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

function bufToB64url(buf: ArrayBuffer | null) {
  if (!buf) return "";
  let s = "";
  new Uint8Array(buf).forEach((b) => (s += String.fromCharCode(b)));
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function pushSupported() {
  return typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

export type PushResult = { ok: true } | { ok: false; reason: "brave" | "unsupported" | "error"; detail?: string };

/** نفس ensurePushSubscription لكن يشرح سبب الفشل (Brave يمنع خدمة Push افتراضياً) */
export async function subscribePushDetailed(): Promise<PushResult> {
  if (!pushSupported()) return { ok: false, reason: "unsupported" };
  lastError = null;
  const ok = await ensurePushSubscription();
  if (ok) return { ok: true };
  const isBrave = !!(navigator as any).brave;
  const msg = String((lastError as any)?.message ?? lastError ?? "");
  if (isBrave || /push service|AbortError|Registration failed/i.test(msg)) return { ok: false, reason: isBrave ? "brave" : "error", detail: msg };
  return { ok: false, reason: "error", detail: msg };
}
let lastError: unknown = null;

/** يشترك (أو يجدّد الاشتراك) ويحفظه. يرجع true عند النجاح. لا يطلب إذناً. */
export async function ensurePushSubscription(): Promise<boolean> {
  try {
    if (!pushSupported() || Notification.permission !== "granted") return false;
    const key = await getVapidPublicKey();
    if (!key) return false;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return false;

    const reg = await navigator.serviceWorker.ready;
    const sub = (await reg.pushManager.getSubscription())
      ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64urlToBytes(key) }));

    // لو كان الجهاز مسجّلاً لحساب آخر نفك ارتباطه أولاً (فشل هذه الخطوة لا يوقف الاشتراك)
    try { await claimPushEndpoint({ data: { endpoint: sub.endpoint } }); } catch (e) { console.error("[push] claim failed", e); }
    const { error } = await (supabase as any).from("push_subscriptions").upsert({
      user_id: session.user.id,
      endpoint: sub.endpoint,
      p256dh_key: bufToB64url(sub.getKey("p256dh")),
      auth_key: bufToB64url(sub.getKey("auth")),
      user_agent: navigator.userAgent.slice(0, 200),
      last_used_at: new Date().toISOString(),
    }, { onConflict: "user_id,endpoint" });
    if (error) lastError = error;
    return !error;
  } catch (e) {
    lastError = e;
    console.error("[push] subscribe failed", e);
    return false;
  }
}
