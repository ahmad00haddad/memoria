import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

function fmt(date: string, time: string) {
  return `${date.replace(/-/g, "")}T${time.replace(/:/g, "").padEnd(6, "0")}`;
}

export const Route = createFileRoute("/api/public/ical/$token")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const { data: priv } = await supabaseAdmin
          .from("photographer_private").select("user_id").eq("ical_token", params.token).maybeSingle();
        if (!priv) return new Response("Not found", { status: 404 });
        const { data: profile } = await supabaseAdmin
          .from("profiles").select("id, display_name").eq("id", priv.user_id).maybeSingle();
        if (!profile) return new Response("Not found", { status: 404 });

        const [{ data: bookings }, { data: unavail }] = await Promise.all([
          supabaseAdmin.from("bookings").select("id,event_date,start_time,end_time,client_name,venue_name,status")
            .eq("photographer_id", profile.id).in("status", ["pending_deposit", "confirmed", "completed"]),
          supabaseAdmin.from("photographer_unavailability").select("date,reason").eq("photographer_id", profile.id),
        ]);

        const lines = [
          "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//EliteCapture//AR//",
          `X-WR-CALNAME:EliteCapture - ${profile.display_name}`,
        ];
        for (const b of bookings ?? []) {
          lines.push("BEGIN:VEVENT",
            `UID:booking-${b.id}@elitecapture`,
            `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").split(".")[0]}Z`,
            `DTSTART:${fmt(b.event_date, b.start_time)}`,
            `DTEND:${fmt(b.event_date, b.end_time)}`,
            `SUMMARY:${b.client_name} (${b.status})`,
            `LOCATION:${(b.venue_name ?? "").replace(/[\n,;]/g, " ")}`,
            "END:VEVENT");
        }
        for (const u of unavail ?? []) {
          lines.push("BEGIN:VEVENT",
            `UID:unavail-${u.date}@elitecapture`,
            `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").split(".")[0]}Z`,
            `DTSTART;VALUE=DATE:${u.date.replace(/-/g, "")}`,
            `SUMMARY:غير متاح${u.reason ? ` - ${u.reason}` : ""}`,
            "END:VEVENT");
        }
        lines.push("END:VCALENDAR");
        return new Response(lines.join("\r\n"), {
          headers: { "Content-Type": "text/calendar; charset=utf-8" },
        });
      },
    },
  },
});