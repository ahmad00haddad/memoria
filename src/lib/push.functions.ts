import { createServerFn } from "@tanstack/react-start";

/** المفتاح العام لـ VAPID (آمن للعرض) — null إن لم يُهيَّأ الإرسال بعد. */
export const getVapidPublicKey = createServerFn({ method: "GET" }).handler(async () => {
  const { isPushConfigured } = await import("@/lib/push.server");
  return isPushConfigured() ? (process.env.VAPID_PUBLIC_KEY as string) : null;
});
