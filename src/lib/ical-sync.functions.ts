import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// مزامنة بسيطة لـ iCal من Google Calendar: نقرأ الفعاليات اليومية (VALUE=DATE)
// والفعاليات بساعات محددة، ونحجب الأيام الموافقة لها في photographer_unavailability.
function parseIcalDates(ics: string): { date: string; summary: string }[] {
  const events: { date: string; summary: string }[] = [];
  const blocks = ics.split(/BEGIN:VEVENT/i).slice(1);
  for (const raw of blocks) {
    const block = raw.split(/END:VEVENT/i)[0] ?? "";
    const sumMatch = /SUMMARY:([^\r\n]+)/i.exec(block);
    const summary = (sumMatch?.[1] ?? "Google event").trim().slice(0, 120);
    // DTSTART;VALUE=DATE:YYYYMMDD  أو  DTSTART:YYYYMMDDTHHMMSSZ
    const dStart = /DTSTART[^:\r\n]*:([0-9TZ:+-]+)/i.exec(block);
    const dEnd = /DTEND[^:\r\n]*:([0-9TZ:+-]+)/i.exec(block);
    if (!dStart) continue;
    const toDate = (s: string) => {
      const m = /^(\d{4})(\d{2})(\d{2})/.exec(s);
      return m ? `${m[1]}-${m[2]}-${m[3]}` : null;
    };
    const start = toDate(dStart[1]);
    const end = dEnd ? toDate(dEnd[1]) : start;
    if (!start) continue;
    const s = new Date(start + "T00:00:00Z");
    const e = new Date((end ?? start) + "T00:00:00Z");
    for (let d = new Date(s); d <= e; d.setUTCDate(d.getUTCDate() + 1)) {
      if (d.getTime() === e.getTime() && (dEnd && /T/.test(dEnd[1]) === false)) break; // DTEND حصري لليوم الكامل
      events.push({
        date: `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`,
        summary,
      });
    }
  }
  return events;
}

function assertSafeIcalUrl(raw: string): string {
  const fetchUrl = raw.replace(/^webcal:\/\//i, "https://");
  let u: URL;
  try { u = new URL(fetchUrl); } catch { throw new Error("رابط غير صالح"); }
  if (u.protocol !== "https:") throw new Error("الرابط يجب أن يكون https");
  const host = u.hostname.toLowerCase();
  // Reject literal IPs and private/loopback/link-local ranges
  const isIPv4 = /^\d{1,3}(\.\d{1,3}){3}$/.test(host);
  const isIPv6 = host.includes(":");
  if (isIPv6) throw new Error("عناوين IPv6 غير مسموحة");
  if (isIPv4) {
    const [a, b] = host.split(".").map(Number);
    if (
      a === 10 || a === 127 || a === 0 ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 169 && b === 254) ||
      a >= 224 // multicast/reserved
    ) throw new Error("عنوان IP داخلي غير مسموح");
  }
  if (host === "localhost" || host.endsWith(".local") || host.endsWith(".internal")) {
    throw new Error("نطاق داخلي غير مسموح");
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
    if (!url) throw new Error("لم يتم تعيين رابط Google Calendar iCal بعد.");
    const fetchUrl = assertSafeIcalUrl(url);
    const res = await fetch(fetchUrl, {
      headers: { Accept: "text/calendar" },
      redirect: "error",
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) throw new Error(`تعذّر جلب التقويم: ${res.status}`);
    const ics = await res.text();
    if (ics.length > 2_000_000) throw new Error("الملف كبير جدًا");
    const events = parseIcalDates(ics);

    const { data: existing } = await supabase
      .from("photographer_unavailability").select("date,reason").eq("photographer_id", userId);
    const existingByDate = new Map((existing ?? []).map((r: any) => [r.date, r.reason as string | null]));
    // امسحي القديم القادم من Google ثم أعيدي الإدراج (لتحديث الحذف من جانب Google)
    const googleDates = (existing ?? []).filter((r: any) => (r.reason ?? "").startsWith("Google:")).map((r: any) => r.date);
    if (googleDates.length) {
      await supabase.from("photographer_unavailability").delete()
        .eq("photographer_id", userId).in("date", googleDates);
    }
    const seen = new Set<string>();
    const rows = events
      .filter((e) => {
        if (seen.has(e.date)) return false;
        seen.add(e.date);
        // لا تكتبي فوق حجب يدوي
        const prev = existingByDate.get(e.date);
        return !prev || prev.startsWith("Google:");
      })
      .map((e) => ({ photographer_id: userId, date: e.date, reason: `Google: ${e.summary}` }));
    if (rows.length) {
      const { error } = await supabase.from("photographer_unavailability").insert(rows);
      if (error) throw error;
    }
    await supabase.from("photographer_private").update({ external_ical_synced_at: new Date().toISOString() }).eq("user_id", userId);
    return { inserted: rows.length };
  });