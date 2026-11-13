// ============================================================================
// push.server.ts — إرسال Web Push (VAPID) من الـ Worker بدون مكتبات Node.
// لا ترمي أخطاء أبداً. الاشتراكات الميتة (404/410) تُحذف تلقائياً.
// الأسرار: VAPID_PRIVATE_KEY (wrangler secret) + VAPID_PUBLIC_KEY (var عامّ).
// ============================================================================

import { buildPushPayload } from "@block65/webcrypto-web-push";
import { appBase } from "@/lib/verification.server";

export function isPushConfigured() {
  return Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
}

export type PushMsg = { title: string; body: string; /** مسار داخل الموقع */ link: string };

export async function sendPushToUser(userId: string, msg: PushMsg) {
  try {
    if (!isPushConfigured()) return;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: subs } = await (supabaseAdmin as any).from("push_subscriptions")
      .select("id, endpoint, p256dh_key, auth_key").eq("user_id", userId);
    if (!subs?.length) return;

    const vapid = {
      subject: appBase(),
      publicKey: process.env.VAPID_PUBLIC_KEY!,
      privateKey: process.env.VAPID_PRIVATE_KEY!,
    };
    const data = JSON.stringify({
      title: msg.title, body: msg.body, url: `${appBase()}${msg.link}`,
    });

    const dead: string[] = [];
    await Promise.all(subs.map(async (s: any) => {
      try {
        const payload = await buildPushPayload(
          { data, options: { ttl: 86400, urgency: "high" } },
          { endpoint: s.endpoint, expirationTime: null, keys: { p256dh: s.p256dh_key, auth: s.auth_key } },
          vapid,
        );
        const res = await fetch(s.endpoint, payload);
        if (res.status === 404 || res.status === 410) dead.push(s.id);
        else if (!res.ok) console.error("[push] status", res.status);
      } catch (e) { console.error("[push] send failed", e); }
    }));
    if (dead.length) await (supabaseAdmin as any).from("push_subscriptions").delete().in("id", dead);
  } catch (e) { console.error("[push] failed", e); }
}
