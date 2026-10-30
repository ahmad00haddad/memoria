import { createFileRoute } from "@tanstack/react-router";

// Cron-invoked endpoint. Sends:
//  1) 24h event reminders for confirmed bookings happening tomorrow
//  2) 7-day subscription-expiry warning
//  3) 3-day subscription-expiry warning
//  4) "اشتراكك انتهى اليوم" — يوم انتهاء الاشتراك
//
// Idempotency: uses email_log to skip recipients that already received the
// same template in the last 20 hours.
//
// يُستدعى من Cloudflare Cron فقط (src/server.ts → scheduled) بسرّ CRON_SECRET.
//   curl -X POST https://{domain}/api/public/hooks/email-reminders \
//        -H "x-cron-secret: {CRON_SECRET}"

export const Route = createFileRoute("/api/public/hooks/email-reminders")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        // مفتاح Supabase العام لا يصلح للتحقق: هو منشور في الواجهة وwrangler.jsonc
        const secret = process.env.CRON_SECRET;
        if (!secret || request.headers.get("x-cron-secret") !== secret) {
          return new Response("Unauthorized", { status: 401 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { sendEmail, tplEventReminder24h, tplSubscriptionExpiring } =
          await import("@/lib/email.server");

        const results = { reminders: 0, sub_warnings: 0, sub_expired: 0, paytabs_reconciled: 0, errors: 0 };

        // ===================================================================
        // 0) PayTabs reconciliation — دفعات بطاقة معلّقة آخر 3 أيام فُقد إشعارها
        // ===================================================================
        try {
          const { isPayTabsConfigured, settleSubscriptionPayment } = await import("@/lib/paytabs.server");
          if (isPayTabsConfigured()) {
            const { data: open } = await (supabaseAdmin as any)
              .from("subscription_payments")
              .select("payment_reference")
              .eq("method", "gateway")
              .eq("status", "pending")
              .not("payment_reference", "is", null)
              .gte("created_at", new Date(Date.now() - 3 * 86400000).toISOString())
              .limit(50);
            for (const r of (open ?? []) as any[]) {
              const res = await settleSubscriptionPayment(r.payment_reference).catch(() => null);
              if (res?.status === "paid" && !res.already) results.paytabs_reconciled++;
            }
          }
        } catch (e) {
          console.error("[email-reminders] paytabs reconcile failed:", e);
          results.errors++;
        }

        // نافذة إزالة التكرار — 20 ساعة
        const since = new Date(Date.now() - 20 * 60 * 60 * 1000).toISOString();

        // ===================================================================
        // 1) 24h event reminders
        // ===================================================================
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const ymd = tomorrow.toISOString().slice(0, 10);

        const { data: bookings } = await supabaseAdmin
          .from("bookings")
          .select("id, photographer_id, client_email, client_name, event_date, start_time, venue_address, client_tracking_token, status, deleted_at")
          .eq("event_date", ymd)
          .eq("status", "confirmed" as any)
          .is("deleted_at", null);

        for (const bk of bookings ?? []) {
          if (!bk.client_email) continue;

          const { data: prior } = await supabaseAdmin
            .from("email_log").select("id")
            .eq("template", "event_reminder_24h")
            .eq("related_booking_id", bk.id)
            .gte("created_at", since).limit(1);
          if (prior && prior.length > 0) continue;

          try {
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
          } catch (e) {
            console.error("[email-reminders] 24h reminder failed:", e);
            results.errors++;
          }
        }

        // ===================================================================
        // 1b) باقي المبلغ — اليوم التالي للمناسبة، مرة واحدة لكل حجز
        // ===================================================================
        try {
          const { tplBalanceDue } = await import("@/lib/email.server");
          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);
          const { data: due } = await (supabaseAdmin as any)
            .from("bookings")
            .select("id, photographer_id, client_email, client_name, total_price, deposit_amount, client_tracking_token")
            .eq("event_date", yesterday.toISOString().slice(0, 10))
            .in("status", ["confirmed", "completed"])
            .is("final_paid_at", null)
            .is("deleted_at", null);
          for (const bk of (due ?? []) as any[]) {
            const remaining = Number(bk.total_price || 0) - Number(bk.deposit_amount || 0);
            if (!bk.client_email || remaining <= 0) continue;
            const { data: prior } = await supabaseAdmin
              .from("email_log").select("id")
              .eq("template", "balance_due").eq("related_booking_id", bk.id).limit(1);
            if (prior && prior.length > 0) continue;
            const { data: prof } = await supabaseAdmin
              .from("profiles").select("display_name").eq("id", bk.photographer_id).maybeSingle();
            const t = tplBalanceDue({
              client_name: bk.client_name || "عروستنا",
              photographer_name: prof?.display_name || "المصوّرة",
              remaining,
              track_token: bk.client_tracking_token,
            });
            const r = await sendEmail({
              to: bk.client_email, subject: t.subject, html: t.html,
              template: "balance_due", related_booking_id: bk.id,
            });
            if (r.ok) results.reminders++; else results.errors++;
          }
        } catch (e) {
          console.error("[email-reminders] balance-due reminder failed:", e);
          results.errors++;
        }

        // ===================================================================
        // 1c) مصوّرة لم تُكمل إعداد صفحتها — بعد يوم وبعد 3 أيام من التسجيل، مرة واحدة لكل منهما
        // ===================================================================
        try {
          const { tplSetupReminder } = await import("@/lib/email.server");
          for (const day of [1, 3]) {
            const to = new Date(Date.now() - day * 86400000).toISOString();
            const from = new Date(Date.now() - (day + 1) * 86400000).toISOString();
            const { data: stalled } = await (supabaseAdmin as any)
              .from("profiles")
              .select("id, display_name, avatar_url, is_published, is_demo, onboarding_completed_at")
              .gte("created_at", from).lt("created_at", to)
              .is("onboarding_completed_at", null)
              .eq("is_published", false);
            for (const p of (stalled ?? []) as any[]) {
              if (p.is_demo) continue;
              const template = `setup_reminder_${day}d`;
              const { data: prior } = await supabaseAdmin
                .from("email_log").select("id").eq("template", template).eq("related_user_id", p.id).limit(1);
              if (prior && prior.length > 0) continue;
              const { data: u } = await supabaseAdmin.auth.admin.getUserById(p.id);
              const email = u?.user?.email;
              if (!email) continue;
              const { count: pkgCount } = await supabaseAdmin
                .from("pricing_rules").select("id", { count: "exact", head: true }).eq("photographer_id", p.id);
              const t = tplSetupReminder({ name: p.display_name || "", hasPhoto: !!p.avatar_url, hasPackage: (pkgCount ?? 0) > 0, day });
              const r = await sendEmail({ to: email, subject: t.subject, html: t.html, template, related_user_id: p.id });
              if (r.ok) results.reminders++; else results.errors++;
            }
          }
        } catch (e) {
          console.error("[email-reminders] setup reminder failed:", e);
          results.errors++;
        }

        // ===================================================================
        // 2+3) تذكيرات انتهاء الاشتراك — 7 أيام و3 أيام
        // ===================================================================
        for (const daysLeft of [7, 3]) {
          const winStart = new Date();
          winStart.setDate(winStart.getDate() + daysLeft);
          winStart.setHours(0, 0, 0, 0);

          const winEnd = new Date(winStart);
          winEnd.setDate(winEnd.getDate() + 1);

          const template = `subscription_expiring_${daysLeft}d`;

          const { data: subs } = await supabaseAdmin
            .from("subscriptions")
            .select("photographer_id, current_period_end, status")
            .eq("status", "active")
            .gte("current_period_end", winStart.toISOString())
            .lt("current_period_end", winEnd.toISOString());

          for (const s of subs ?? []) {
            try {
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
              if (r.ok) results.sub_warnings++; else results.errors++;
            } catch (e) {
              console.error(`[email-reminders] sub expiry ${daysLeft}d failed:`, e);
              results.errors++;
            }
          }
        }

        // ===================================================================
        // 4) إيميل "اشتراكك انتهى اليوم" — للمصوّرات التي انتهى اشتراكها اليوم
        // ===================================================================
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date();
        todayEnd.setHours(23, 59, 59, 999);

        const { data: expiredSubs } = await supabaseAdmin
          .from("subscriptions")
          .select("photographer_id, current_period_end, status")
          .in("status", ["active", "expired"])
          .gte("current_period_end", todayStart.toISOString())
          .lte("current_period_end", todayEnd.toISOString());

        for (const s of expiredSubs ?? []) {
          try {
            const { data: prior } = await supabaseAdmin
              .from("email_log").select("id")
              .eq("template", "subscription_expired_today")
              .eq("related_user_id", s.photographer_id)
              .gte("created_at", since).limit(1);
            if (prior && prior.length > 0) continue;

            const { data: u } = await supabaseAdmin.auth.admin.getUserById(s.photographer_id);
            const email = u?.user?.email;
            if (!email) continue;

            const { data: prof } = await supabaseAdmin
              .from("profiles").select("display_name").eq("id", s.photographer_id).maybeSingle();

            // تعطيل الملف الشخصي تلقائياً
            await supabaseAdmin
              .from("profiles")
              .update({ is_published: false, updated_at: new Date().toISOString() })
              .eq("id", s.photographer_id);

            await supabaseAdmin
              .from("subscriptions")
              .update({ status: "expired" } as any)
              .eq("photographer_id", s.photographer_id);

            // إيميل انتهاء الاشتراك
            const name = prof?.display_name || "المصوّرة";
            const base = process.env.PUBLIC_APP_URL || "https://memoria-production.ahmad000haddad.workers.dev";
            const r = await sendEmail({
              to: email,
              subject: "انتهى اشتراكك في Memoria — جدّد الآن",
              html: `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"></head>
<body style="margin:0;background:#f7f5f1;font-family:Tahoma,Arial,sans-serif;color:#1a1a1a;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f7f5f1;padding:32px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" style="max-width:560px;background:#fff;border:1px solid #e6e2d8;border-radius:4px;overflow:hidden;">
        <tr><td style="padding:24px 28px;border-bottom:1px solid #efece4;">
          <div style="font-family:Georgia,serif;font-size:22px;color:#a07a32;">Memoria</div>
          <div style="font-size:12px;color:#7a7466;margin-top:4px;">منصة مصوّرات الأعراس والمناسبات</div>
        </td></tr>
        <tr><td style="padding:28px;">
          <h1 style="font-family:Georgia,serif;font-size:20px;margin:0 0 16px;">انتهى اشتراكك ⏰</h1>
          <p>مرحباً ${name},</p>
          <p>للأسف انتهى اشتراكك في Memoria اليوم. تم إخفاء ملفك الشخصي مؤقتاً من نتائج البحث.</p>
          <p>لاستعادة ظهورك وحجوزاتك، جدّد اشتراكك الآن:</p>
          <div style="margin-top:24px;text-align:center;">
            <a href="${base}/dashboard/subscription" style="display:inline-block;background:#a07a32;color:#fff;text-decoration:none;padding:14px 32px;border-radius:3px;font-size:15px;font-weight:600;">تجديد الاشتراك</a>
          </div>
          <p style="margin-top:20px;font-size:13px;color:#7a7466;">إن كان لديك أي استفسار، تواصل معنا عبر البريد الإلكتروني.</p>
        </td></tr>
        <tr><td style="padding:16px 28px;background:#faf8f3;border-top:1px solid #efece4;font-size:11px;color:#8a8472;text-align:center;">
          هذه رسالة آلية من Memoria — لا داعي للرد عليها مباشرة.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`,
              template: "subscription_expired_today",
              related_user_id: s.photographer_id,
            });
            if (r.ok) results.sub_expired++; else results.errors++;
          } catch (e) {
            console.error("[email-reminders] expired sub notification failed:", e);
            results.errors++;
          }
        }

        return Response.json({ ok: true, ...results, ran_for: ymd });
      },
    },
  },
});
