import { createFileRoute } from "@tanstack/react-router";

// Cron-invoked endpoint (pg_cron via net.http_post). Sends:
//  1) 24-hour event reminders for confirmed bookings happening tomorrow
//  2) Subscription-expiry warnings 3 days before period end
//
// Idempotency: uses email_log to skip recipients that already received the
// same template in the last 20 hours.

export const Route = createFileRoute("/api/public/hooks/email-reminders")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        // فحص أن النداء يأتي من pg_cron (apikey = المفتاح العام)
        const apikey = request.headers.get("apikey") || request.headers.get("x-api-key");
        if (!apikey || apikey !== process.env.SUPABASE_PUBLISHABLE_KEY) {
          return new Response("Unauthorized", { status: 401 });
        }
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { sendEmail, tplEventReminder24h, tplSubscriptionExpiring } =
          await import("@/lib/email.server");

        const results = { reminders: 0, subs: 0, errors: 0 };

        // ----- 1) 24h event reminders -----
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const ymd = tomorrow.toISOString().slice(0, 10);

        const { data: bookings } = await supabaseAdmin
          .from("bookings")
          .select("id, photographer_id, client_email, client_name, event_date, start_time, venue_address, client_tracking_token, status, deleted_at")
          .eq("event_date", ymd)
          .eq("status", "confirmed" as any)
          .is("deleted_at", null);

        const since = new Date(Date.now() - 20 * 60 * 60 * 1000).toISOString();

        for (const bk of bookings ?? []) {
          if (!bk.client_email) continue;
          // Skip if already sent recently
          const { data: prior } = await supabaseAdmin
            .from("email_log").select("id")
            .eq("template", "event_reminder_24h")
            .eq("related_booking_id", bk.id)
            .gte("created_at", since).limit(1);
          if (prior && prior.length > 0) continue;

          const { data: prof } = await supabaseAdmin
            .from("profiles").select("display_name").eq("id", bk.photographer_id).maybeSingle();

          const t = tplEventReminder24h({
            client_name: bk.client_name || "عميلتنا",
            photographer_name: prof?.display_name || "المصوّرة",
            event_date: String(bk.event_date),
            start_time: String(bk.start_time),
            venue: bk.venue_address,
            track_token: bk.client_tracking_token!,
          });
          const r = await sendEmail({
            to: bk.client_email, subject: t.subject, html: t.html,
            template: "event_reminder_24h", related_booking_id: bk.id,
          });
          if (r.ok) results.reminders++; else results.errors++;
        }

        // ----- 2) Subscription expiry warnings (7 days + 3 days out) -----
        // نافذتان للتذكير قبل انتهاء الاشتراك. لكل نافذة قالب مستقل
        // (subscription_expiring_7d / _3d) فيكون منع التكرار مستقلاً لكل نافذة.
        for (const daysLeft of [7, 3]) {
          const winStart = new Date(); winStart.setDate(winStart.getDate() + daysLeft);
          const winEnd = new Date(); winEnd.setDate(winEnd.getDate() + daysLeft + 1);
          const template = `subscription_expiring_${daysLeft}d`;

          const { data: subs } = await supabaseAdmin
            .from("subscriptions")
            .select("photographer_id, current_period_end, status")
            .eq("status", "active")
            .gte("current_period_end", winStart.toISOString())
            .lt("current_period_end", winEnd.toISOString());

          for (const s of subs ?? []) {
            const { data: prior } = await supabaseAdmin
              .from("email_log").select("id")
              .eq("template", template)
              .eq("related_user_id", s.photographer_id)
              .gte("created_at", since).limit(1);
            if (prior && prior.length > 0) continue;

            const { data: u } = await supabaseAdmin.auth.admin.getUserById(s.photographer_id);
            const email = u?.user?.email;
            if (!email) continue;
            const { data: prof } = await supabaseAdmin
              .from("profiles").select("display_name").eq("id", s.photographer_id).maybeSingle();

            const t = tplSubscriptionExpiring({
              photographer_name: prof?.display_name || "المصوّرة",
              days_left: daysLeft,
            });
            const r = await sendEmail({
              to: email, subject: t.subject, html: t.html,
              template,
              related_user_id: s.photographer_id,
            });
            if (r.ok) results.subs++; else results.errors++;
          }
        }

        return Response.json({ ok: true, ...results, ran_for: ymd });
      },
    },
  },
});