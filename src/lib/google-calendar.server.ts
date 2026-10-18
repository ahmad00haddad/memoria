// ============================================================================
// Google Calendar — ربط مباشر عبر OAuth (بديل رابط iCal السرّي).
// ----------------------------------------------------------------------------
// - القراءة: FreeBusy (calendar.freebusy) — أوقات الانشغال فقط، بدون عناوين أو تفاصيل.
// - الكتابة: تقويم ثانوي «Memoria» ننشئه نحن (calendar.app.created)، نكتب فيه
//   الحجوزات فوراً عند أي تغيير (Webhook من قاعدة البيانات) وكل 30 دقيقة احتياطاً.
// - refresh_token محفوظ في google_calendar_links (RLS بلا سياسات = service role فقط).
// ============================================================================
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { applyExternalDays } from "@/lib/ical-sync.functions";

const TZ = "Asia/Amman";
export const GOOGLE_SCOPES = [
  "openid",
  "email",
  "https://www.googleapis.com/auth/calendar.freebusy",
  "https://www.googleapis.com/auth/calendar.app.created",
];

export function isGoogleConfigured() {
  return !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.CRON_SECRET);
}

function appUrl() {
  return process.env.PUBLIC_APP_URL || "https://memoria-production.ahmad000haddad.workers.dev";
}
export const redirectUri = () => `${appUrl()}/api/public/google/callback`;

// ---------- state موقَّع (يربط الرجوع من Google بالمستخدم دون جلسة) ----------
const b64url = (buf: ArrayBuffer | Uint8Array) =>
  btoa(String.fromCharCode(...new Uint8Array(buf instanceof Uint8Array ? buf : new Uint8Array(buf))))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

async function hmac(data: string) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(process.env.CRON_SECRET!), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return b64url(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data)));
}

export async function signState(userId: string) {
  const payload = `${userId}.${Date.now()}`;
  return `${payload}.${await hmac(payload)}`;
}

export async function verifyState(state: string): Promise<string | null> {
  const [uid, ts, sig] = state.split(".");
  if (!uid || !ts || !sig) return null;
  if (Date.now() - Number(ts) > 15 * 60_000) return null; // صالح 15 دقيقة
  return (await hmac(`${uid}.${ts}`)) === sig ? uid : null;
}

export async function googleAuthUrl(userId: string) {
  const p = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: redirectUri(),
    response_type: "code",
    scope: GOOGLE_SCOPES.join(" "),
    access_type: "offline",
    prompt: "consent", // لضمان refresh_token في كل ربط
    include_granted_scopes: "true",
    state: await signState(userId),
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${p}`;
}

// ---------- التوكنات ----------
async function tokenRequest(body: Record<string, string>) {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: process.env.GOOGLE_CLIENT_ID!, client_secret: process.env.GOOGLE_CLIENT_SECRET!, ...body }),
  });
  const json: any = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(json.error_description || json.error || `Google token ${res.status}`);
    (err as any).code = json.error;
    throw err;
  }
  return json as { access_token: string; refresh_token?: string; id_token?: string; scope?: string };
}

export const exchangeCode = (code: string) =>
  tokenRequest({ code, grant_type: "authorization_code", redirect_uri: redirectUri() });

async function accessTokenFor(userId: string) {
  const { data: link } = await supabaseAdmin.from("google_calendar_links" as any).select("*").eq("user_id", userId).maybeSingle();
  if (!link) throw new Error("Google غير مربوط");
  try {
    const t = await tokenRequest({ refresh_token: (link as any).refresh_token, grant_type: "refresh_token" });
    return { token: t.access_token, link: link as any };
  } catch (e: any) {
    if (e.code === "invalid_grant") {
      await setLinkStatus(userId, { last_error: "انتهت صلاحية الربط أو أُلغي من Google — أعيدي الربط" });
    }
    throw e;
  }
}

async function gapi(token: string, path: string, init: RequestInit = {}) {
  const res = await fetch(`https://www.googleapis.com/calendar/v3${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...(init.headers ?? {}) },
  });
  if (res.status === 204) return null;
  const json: any = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(json?.error?.message || `Google API ${res.status}`);
    (err as any).status = res.status;
    throw err;
  }
  return json;
}

async function setLinkStatus(userId: string, fields: Record<string, unknown>) {
  await supabaseAdmin.from("google_calendar_links" as any).update(fields).eq("user_id", userId);
}

/** يحفظ الربط بعد الرجوع من Google وينشئ تقويم «Memoria». */
export async function saveLink(userId: string, tokens: { refresh_token?: string; id_token?: string; access_token: string }) {
  if (!tokens.refresh_token) throw new Error("لم يُرسل Google صلاحية دائمة — أعيدي المحاولة");
  let email: string | null = null;
  try {
    email = JSON.parse(atob(tokens.id_token!.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"))).email ?? null;
  } catch { /* ignore */ }
  const cal = await gapi(tokens.access_token, "/calendars", {
    method: "POST",
    body: JSON.stringify({ summary: "Memoria — الحجوزات", timeZone: TZ, description: "حجوزات ميموريا (تُحدَّث تلقائياً)" }),
  });
  const { error } = await supabaseAdmin.from("google_calendar_links" as any).upsert({
    user_id: userId,
    refresh_token: tokens.refresh_token,
    google_email: email,
    memoria_calendar_id: cal.id,
    last_error: null,
    connected_at: new Date().toISOString(),
  }, { onConflict: "user_id" });
  if (error) throw error;
}

export async function removeLink(userId: string) {
  const { data: link } = await supabaseAdmin.from("google_calendar_links" as any).select("refresh_token").eq("user_id", userId).maybeSingle();
  if (link) {
    // إلغاء الصلاحية من جهة Google أيضاً (لا يهم إن فشل)
    await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent((link as any).refresh_token)}`, { method: "POST" }).catch(() => {});
  }
  await supabaseAdmin.from("google_calendar_links" as any).delete().eq("user_id", userId);
  await supabaseAdmin.from("photographer_unavailability").delete().eq("photographer_id", userId).like("reason", "Google:%");
}

// ---------- القراءة: أيام الانشغال ----------
const ymd = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);

async function busyDays(token: string): Promise<string[]> {
  const days = new Set<string>();
  const start = new Date();
  // FreeBusy يقبل نطاقاً محدوداً لكل طلب؛ نقسّم السنة القادمة إلى فترات 60 يوماً
  for (let i = 0; i < 7; i++) {
    const from = new Date(start.getTime() + i * 60 * 86400_000);
    const to = new Date(from.getTime() + 60 * 86400_000);
    const r = await gapi(token, "/freeBusy", {
      method: "POST",
      body: JSON.stringify({ timeMin: from.toISOString(), timeMax: to.toISOString(), timeZone: TZ, items: [{ id: "primary" }] }),
    });
    for (const b of r?.calendars?.primary?.busy ?? []) {
      const s = new Date(b.start);
      const e = new Date(new Date(b.end).getTime() - 1); // نهاية حصرية
      for (let d = ymd(s), n = 0; d <= ymd(e) && n < 60; n++) {
        days.add(d);
        const t = new Date(d + "T12:00:00Z"); t.setUTCDate(t.getUTCDate() + 1);
        d = t.toISOString().slice(0, 10);
      }
    }
  }
  const today = ymd(new Date());
  return [...days].filter((d) => d >= today);
}

// ---------- الكتابة: الحجوزات إلى تقويم «Memoria» ----------
// معرّف حدث ثابت لكل حجز (Google يقبل a-v و0-9) — PUT يحدّث بدل التكرار.
const eventId = (bookingId: string) => `mem${bookingId.replace(/-/g, "")}`;
const STATUS_AR: Record<string, string> = { pending_deposit: "بانتظار العربون", confirmed: "مؤكَّد", completed: "مكتمل" };
const LIVE = ["pending_deposit", "confirmed", "completed"];

export async function pushBookings(userId: string, token: string, calendarId: string, onlyIds?: string[]) {
  let q = supabaseAdmin.from("bookings")
    .select("id,event_date,start_time,end_time,client_name,venue_name,status,deleted_at,client_phone")
    .eq("photographer_id", userId)
    .gte("event_date", ymd(new Date(Date.now() - 7 * 86400_000)));
  if (onlyIds?.length) q = q.in("id", onlyIds);
  const { data: rows } = await q;
  const cal = encodeURIComponent(calendarId);
  let written = 0;
  for (const b of rows ?? []) {
    const id = eventId(b.id);
    const live = LIVE.includes(b.status) && !b.deleted_at;
    try {
      if (!live) {
        await gapi(token, `/calendars/${cal}/events/${id}`, { method: "DELETE" }).catch((e) => {
          if (![404, 410].includes(e.status)) throw e;
        });
        continue;
      }
      const body = {
        id,
        summary: `${b.client_name} — ${STATUS_AR[b.status] ?? b.status}`,
        location: b.venue_name ?? "",
        description: `حجز ميموريا\n${appUrl()}/dashboard/bookings/${b.id}`,
        start: { dateTime: `${b.event_date}T${b.start_time.slice(0, 8)}`, timeZone: TZ },
        end: { dateTime: `${b.event_date}T${b.end_time.slice(0, 8)}`, timeZone: TZ },
        colorId: b.status === "pending_deposit" ? "5" : "10",
      };
      try {
        await gapi(token, `/calendars/${cal}/events/${id}`, { method: "PUT", body: JSON.stringify(body) });
      } catch (e: any) {
        if (e.status !== 404) throw e;
        await gapi(token, `/calendars/${cal}/events`, { method: "POST", body: JSON.stringify(body) });
      }
      written++;
    } catch (e: any) {
      console.error("[google] push booking", b.id, e?.message);
    }
  }
  return written;
}

/** مزامنة كاملة لمستخدم: سحب الانشغال + كتابة الحجوزات. */
export async function syncGoogleUser(userId: string) {
  try {
    const { token, link } = await accessTokenFor(userId);
    const days = await busyDays(token);
    const applied = await applyExternalDays(userId, days.map((date) => ({ date, summary: "مشغول في Google" })));
    const pushed = await pushBookings(userId, token, link.memoria_calendar_id);
    await setLinkStatus(userId, { last_sync_at: new Date().toISOString(), last_error: null, busy_days: applied.blocked });
    return { blocked: applied.blocked, pushed };
  } catch (e: any) {
    if (e.code !== "invalid_grant") await setLinkStatus(userId, { last_error: e?.message || "sync failed" }).catch(() => {});
    throw e;
  }
}

/** كتابة فورية لحجز واحد بعد تغييره (من Webhook قاعدة البيانات). */
export async function pushOneBooking(photographerId: string, bookingId: string) {
  const { data: link } = await supabaseAdmin.from("google_calendar_links" as any).select("user_id").eq("user_id", photographerId).maybeSingle();
  if (!link) return { skipped: true };
  const { token, link: full } = await accessTokenFor(photographerId);
  return { pushed: await pushBookings(photographerId, token, full.memoria_calendar_id, [bookingId]) };
}
