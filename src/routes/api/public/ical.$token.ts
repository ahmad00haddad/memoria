import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { nextDay } from "@/lib/validation";

// تقويم المصوّرة بصيغة iCal للاشتراك من Google/Apple/Outlook.
// الأوقات محلية بتوقيت عمّان (TZID) كي لا تنزاح الحجوزات حسب منطقة تقويم المشترك.

function fmt(date: string, time: string) {
  return `${date.replace(/-/g, "")}T${time.replace(/:/g, "").slice(0, 6).padEnd(6, "0")}`;
}

/** نص آمن حسب RFC 5545: \ ; , وأسطر جديدة. */
function esc(v: string) {
  return v.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

/** طيّ الأسطر الأطول من 75 بايت (العربية متعددة البايت). */
function fold(line: string) {
  const enc = new TextEncoder();
  if (enc.encode(line).length <= 75) return line;
  const out: string[] = [];
  let cur = "";
  for (const ch of line) {
    if (enc.encode(cur + ch).length > (out.length ? 74 : 75)) { out.push(cur); cur = ""; }
    cur += ch;
  }
  out.push(cur);
  return out.join("\r\n ");
}

const STATUS_AR: Record<string, string> = {
  pending_deposit: "بانتظار العربون",
  confirmed: "مؤكَّد",
  completed: "مكتمل",
};

export const Route = createFileRoute("/api/public/ical/$token")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const token = params.token.replace(/\.ics$/i, "");
        const { data: priv } = await supabaseAdmin
          .from("photographer_private").select("user_id").eq("ical_token", token).maybeSingle();
        if (!priv) return new Response("Not found", { status: 404 });
        const { data: profile } = await supabaseAdmin
          .from("profiles").select("id, display_name").eq("id", priv.user_id).maybeSingle();
        if (!profile) return new Response("Not found", { status: 404 });

        const [{ data: bookings }, { data: unavail }] = await Promise.all([
          supabaseAdmin.from("bookings").select("id,event_date,start_time,end_time,client_name,venue_name,status")
            .eq("photographer_id", profile.id).is("deleted_at", null).in("status", ["pending_deposit", "confirmed", "completed"]),
          supabaseAdmin.from("photographer_unavailability").select("date,reason").eq("photographer_id", profile.id),
        ]);

        const stamp = `${new Date().toISOString().replace(/[-:]/g, "").split(".")[0]}Z`;
        const lines = [
          "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Memoria//AR//", "CALSCALE:GREGORIAN", "METHOD:PUBLISH",
          `X-WR-CALNAME:${esc(`Memoria - ${profile.display_name ?? ""}`)}`,
          "X-WR-TIMEZONE:Asia/Amman",
          // تلميح لتطبيقات التقويم بتحديث الاشتراك كل ساعة (Apple/Outlook تحترمه؛ Google يحدّث وفق جدوله)
          "REFRESH-INTERVAL;VALUE=DURATION:PT1H",
          "X-PUBLISHED-TTL:PT1H",
        ];
        for (const b of bookings ?? []) {
          lines.push("BEGIN:VEVENT",
            `UID:booking-${b.id}@memoria-jo`,
            `DTSTAMP:${stamp}`,
            `DTSTART;TZID=Asia/Amman:${fmt(b.event_date, b.start_time)}`,
            `DTEND;TZID=Asia/Amman:${fmt(b.end_time <= b.start_time ? nextDay(b.event_date) : b.event_date, b.end_time)}`,
            `SUMMARY:${esc(`${b.client_name} (${STATUS_AR[b.status] ?? b.status})`)}`,
            `LOCATION:${esc(b.venue_name ?? "")}`,
            "END:VEVENT");
        }
        for (const u of unavail ?? []) {
          // الأيام المستوردة من Google نفسها لا نعيدها إليه (تتكرر في تقويمها)
          if ((u.reason ?? "").startsWith("Google:")) continue;
          lines.push("BEGIN:VEVENT",
            `UID:unavail-${u.date}@memoria-jo`,
            `DTSTAMP:${stamp}`,
            `DTSTART;VALUE=DATE:${u.date.replace(/-/g, "")}`,
            `SUMMARY:${esc(`غير متاح${u.reason ? ` - ${u.reason}` : ""}`)}`,
            "TRANSP:TRANSPARENT",
            "END:VEVENT");
        }
        lines.push("END:VCALENDAR");
        return new Response(lines.map(fold).join("\r\n") + "\r\n", {
          headers: {
            "Content-Type": "text/calendar; charset=utf-8",
            "Content-Disposition": 'inline; filename="memoria.ics"',
            "Cache-Control": "no-cache",
          },
        });
      },
    },
  },
});
