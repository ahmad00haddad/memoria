import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export { parseIcalDates, expandRule } from "./ical-parse";
import { parseIcalDates } from "./ical-parse";
import { t } from "@/i18n";

export function assertSafeIcalUrl(raw: string): string {
  const fetchUrl = raw.replace(/^webcal:\/\//i, "https://");
  let u: URL;
  try { u = new URL(fetchUrl); } catch { throw new Error(t("رابط غير صالح")); }
  if (u.protocol !== "https:") throw new Error(t("الرابط يجب أن يكون https"));
  const host = u.hostname.toLowerCase();
  // Reject literal IPs and private/loopback/link-local ranges
  const isIPv4 = /^\d{1,3}(\.\d{1,3}){3}$/.test(host);
  const isIPv6 = host.includes(":");
  if (isIPv6) throw new Error(t("عناوين IPv6 غير مسموحة"));
  if (isIPv4) {
    const [a, b] = host.split(".").map(Number);
    if (
      a === 10 || a === 127 || a === 0 ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 169 && b === 254) ||
      a >= 224 // multicast/reserved
    ) throw new Error(t("عنوان IP داخلي غير مسموح"));
  }
  if (host === "localhost" || host.endsWith(".local") || host.endsWith(".internal")) {
    throw new Error(t("نطاق داخلي غير مسموح"));
  }
  return u.toString();
}

export const syncExternalIcal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: profile } = await supabase
      .from("photographer_private").select("external_ical_url").eq("user_id", userId).maybeSingle();
    const url = profile?.external_ical_url?.trim();
    if (!url) throw new Error(t("لم يتم تعيين رابط Google Calendar iCal بعد."));
    return await syncAndRecord(userId, url);
  });

/** آخر نتيجة مزامنة لصاحب الحساب (تُعرض في صفحة التقويم). */
export const getIcalStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin.auth.admin.getUserById(context.userId);
    return (data.user?.app_metadata?.ical_status ?? null) as IcalStatus | null;
  });

export type IcalStatus = { ok: boolean; error?: string; blocked?: number; at: string };

/** يحفظ نتيجة آخر مزامنة في app_metadata (لا يحتاج عموداً، ولا يستطيع المستخدم تعديله). */
async function recordIcalStatus(userId: string, status: Omit<IcalStatus, "at">) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin.auth.admin.getUserById(userId);
  await supabaseAdmin.auth.admin.updateUserById(userId, {
    app_metadata: { ...(data.user?.app_metadata ?? {}), ical_status: { ...status, at: new Date().toISOString() } },
  });
}

export async function syncAndRecord(userId: string, url: string) {
  try {
    const out = await runIcalSyncForUser(userId, url);
    await recordIcalStatus(userId, { ok: true, blocked: out.blocked }).catch(() => {});
    return out;
  } catch (e: any) {
    await recordIcalStatus(userId, { ok: false, error: e?.message || "sync failed" }).catch(() => {});
    throw e;
  }
}

export async function runIcalSyncForUser(userId: string, url: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const fetchUrl = assertSafeIcalUrl(url);
  const res = await fetch(fetchUrl, {
    headers: { Accept: "text/calendar" },
    // Workers لا تدعم redirect: "error"؛ نمنع التحويل يدوياً (حماية SSRF)
    redirect: "manual",
    signal: AbortSignal.timeout(10_000),
  });
  if (res.status >= 300 && res.status < 400) throw new Error(t("الرابط يحوّل إلى عنوان آخر — استخدمي رابط iCal المباشر"));
  if (res.status === 404 || res.status === 403) {
    throw new Error(t("Google رفض الرابط — استخدمي «العنوان السرّي بتنسيق iCal» وليس العنوان العام"));
  }
  if (!res.ok) throw new Error(t("تعذّر جلب التقويم: {0}", [res.status]));
  const ics = await res.text();
  if (ics.length > 2_000_000) throw new Error(t("الملف كبير جدًا"));
  if (!/BEGIN:VCALENDAR/i.test(ics)) throw new Error(t("الرابط لا يعيد تقويماً بصيغة iCal"));
  const events = parseIcalDates(ics);
  const out = await applyExternalDays(userId, events);
  await supabaseAdmin.from("photographer_private").update({ external_ical_synced_at: new Date().toISOString() }).eq("user_id", userId);
  return out;
}

/**
 * يطبّق أيام الانشغال القادمة من Google (iCal أو OAuth) على photographer_unavailability:
 * لا يلمس الحجب اليدوي، ويضيف الجديد أولاً ثم يحذف ما لم يعد مشغولاً.
 */
export async function applyExternalDays(userId: string, events: { date: string; summary: string }[]) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data: existing } = await supabaseAdmin
    .from("photographer_unavailability").select("date,reason").eq("photographer_id", userId);
  const existingByDate = new Map((existing ?? []).map((r: any) => [r.date, r.reason as string | null]));
  const seen = new Set<string>();
  const fresh = events.filter((e) => {
    if (seen.has(e.date)) return false;
    seen.add(e.date);
    // لا نكتب فوق حجب يدوي
    const prev = existingByDate.get(e.date);
    return !prev || prev.startsWith("Google:");
  });
  const freshDates = new Set(fresh.map((e) => e.date));

  // نضيف الجديد أولاً ثم نحذف ما لم يعد في Google، كي لا تنفتح الأيام إن فشل أحد الطلبين.
  const rows = fresh
    .filter((e) => !existingByDate.has(e.date))
    .map((e) => ({ photographer_id: userId, date: e.date, reason: `Google: ${e.summary}` }));
  if (rows.length) {
    const { error } = await supabaseAdmin.from("photographer_unavailability").insert(rows);
    if (error) throw error;
  }
  const stale = (existing ?? [])
    .filter((r: any) => (r.reason ?? "").startsWith("Google:") && !freshDates.has(r.date))
    .map((r: any) => r.date);
  if (stale.length) {
    await supabaseAdmin.from("photographer_unavailability").delete()
      .eq("photographer_id", userId).in("date", stale);
  }
  return { inserted: rows.length, removed: stale.length, blocked: freshDates.size };
}
