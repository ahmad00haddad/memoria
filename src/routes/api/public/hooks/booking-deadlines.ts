import { createFileRoute } from "@tanstack/react-router";

// ============================================================================
// /api/public/hooks/booking-deadlines — كل 30 دقيقة من Cloudflare Cron
// ----------------------------------------------------------------------------
// 1) يطبّق المهل (expire_unpaid_bookings): 24 ساعة لرد المصوّرة، 48 ساعة للعربون.
// 2) يبلّغ الطرفين بكل إلغاء تلقائي (مرة واحدة: auto_cancel_notified_at).
// 3) تذكيرات: المصوّرة قبل نهاية مهلة الرد بـ 12 وساعتين، والعروس قبل نهاية
//    مهلة العربون بـ 24 و6 ساعات (مرة واحدة لكل تذكير: reminders_sent).
// لا إلغاء صامت: كل تغيير على حجز العروس يصلها.
// ============================================================================

const H = 3600_000;

export const Route = createFileRoute("/api/public/hooks/booking-deadlines")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env.CRON_SECRET;
        if (!secret || request.headers.get("x-cron-secret") !== secret) {
          return new Response("Unauthorized", { status: 401 });
        }
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { notifyBride, notifyPhotographer } = await import("@/lib/notify.server");
        const { appBase } = await import("@/lib/verification.server");
        const admin = supabaseAdmin as any;
        const out = { expired: 0, cancel_notices: 0, approval_reminders: 0, deposit_reminders: 0, errors: 0 };

        // 1) المهل
        try {
          const { data } = await admin.rpc("expire_unpaid_bookings");
          out.expired = Number(data ?? 0);
        } catch (e) { console.error("[deadlines] expire failed", e); out.errors++; }

        const names = new Map<string, string>();
        const nameOf = async (pid: string) => {
          if (!names.has(pid)) {
            const { data } = await admin.from("profiles").select("display_name, username").eq("id", pid).maybeSingle();
            names.set(pid, data?.display_name || data?.username || "المصوّرة");
          }
          return names.get(pid)!;
        };

        // 2) إشعارات الإلغاء التلقائي
        const { data: cancelled } = await admin.from("bookings")
          .select("id, photographer_id, client_name, event_date, auto_cancel_kind")
          .not("auto_cancel_kind", "is", null).is("auto_cancel_notified_at", null)
          .limit(100);
        for (const b of (cancelled ?? []) as any[]) {
          try {
            // نختم أولاً حتى لا يتكرر الإشعار لو تداخل تشغيلان
            const { data: claimed } = await admin.from("bookings")
              .update({ auto_cancel_notified_at: new Date().toISOString() })
              .eq("id", b.id).is("auto_cancel_notified_at", null).select("id").maybeSingle();
            if (!claimed) continue;
            const name = await nameOf(b.photographer_id);
            const searchUrl = `${appBase()}/search?date=${b.event_date}`;
            if (b.auto_cancel_kind === "approval_timeout") {
              await notifyBride(b.id, {
                subject: "طلب حجزك أُلغي تلقائياً",
                title: "المصوّرة لم تردّ على طلبك",
                lines: [
                  `${name} لم تردّ على طلب حجزك بتاريخ ${b.event_date} خلال 24 ساعة، فأُلغي الطلب تلقائياً.`,
                  "لم يُدفع أي مبلغ. يمكنك اختيار مصوّرة أخرى متاحة بنفس التاريخ.",
                ],
                template: "approval_timeout_client",
                ctaLabel: "مصوّرات متاحات بنفس التاريخ",
                ctaUrl: searchUrl,
              });
              await notifyPhotographer(b.photographer_id, {
                title: "فاتك طلب حجز",
                body: `طلب ${b.client_name} بتاريخ ${b.event_date} أُلغي تلقائياً لأنه لم يصل ردّك خلال 24 ساعة. التاريخ صار متاحاً من جديد.`,
                link: `/dashboard/bookings/${b.id}`,
                template: "approval_timeout_photographer",
                bookingId: b.id,
              });
            } else {
              await notifyBride(b.id, {
                subject: "انتهت مهلة العربون",
                title: "أُلغي طلب حجزك",
                lines: [
                  `انتهت مهلة دفع العربون (48 ساعة) لحجزك مع ${name} بتاريخ ${b.event_date}، فأُلغي الطلب وصار التاريخ متاحاً لغيرك.`,
                  "إذا كنتِ ما زلتِ تريدين الحجز، تواصلي مع المصوّرة أو أرسلي طلباً جديداً إن كان التاريخ متاحاً.",
                ],
                template: "deposit_timeout_client",
              });
              await notifyPhotographer(b.photographer_id, {
                title: "انتهت مهلة العربون",
                body: `${b.client_name} لم ترسل العربون خلال 48 ساعة لحجز ${b.event_date}، فأُلغي الطلب وصار التاريخ متاحاً.`,
                link: `/dashboard/bookings/${b.id}`,
                template: "deposit_timeout_photographer",
                bookingId: b.id,
              });
            }
            out.cancel_notices++;
          } catch (e) { console.error("[deadlines] cancel notice failed", e); out.errors++; }
        }

        const mark = async (id: string, sent: string[], add: string[]) =>
          admin.from("bookings").update({ reminders_sent: [...new Set([...sent, ...add])] }).eq("id", id);

        // 3أ) تذكير المصوّرة بالرد
        const { data: waiting } = await admin.from("bookings")
          .select("id, photographer_id, client_name, event_date, phone_verified_at, reminders_sent")
          .eq("needs_approval", true).is("approved_at", null).is("deleted_at", null)
          .in("status", ["pending_deposit", "quote"]).not("phone_verified_at", "is", null)
          .limit(200);
        for (const b of (waiting ?? []) as any[]) {
          const left = new Date(b.phone_verified_at).getTime() + 24 * H - Date.now();
          if (left <= 0) continue;
          const sent: string[] = b.reminders_sent ?? [];
          let due: string[] = [];
          if (left <= 2 * H && !sent.includes("appr2")) due = ["appr12", "appr2"];
          else if (left <= 12 * H && !sent.includes("appr12")) due = ["appr12"];
          if (!due.length) continue;
          try {
            await mark(b.id, sent, due);
            const hours = Math.max(1, Math.round(left / H));
            await notifyPhotographer(b.photographer_id, {
              title: `⏳ باقي ${hours} ساعة للرد على ${b.client_name}`,
              body: `طلب الحجز بتاريخ ${b.event_date} ما زال بانتظار موافقتك. إن لم تردّي يُلغى تلقائياً ويُفتح التاريخ لغيرها.`,
              link: `/dashboard/bookings/${b.id}`,
              template: "approval_reminder_photographer",
              bookingId: b.id,
            });
            out.approval_reminders++;
          } catch (e) { console.error("[deadlines] approval reminder failed", e); out.errors++; }
        }

        // 3ب) تذكير العروس بالعربون
        const { data: unpaid } = await admin.from("bookings")
          .select("id, photographer_id, event_date, deposit_amount, approved_at, reminders_sent")
          .eq("needs_approval", true).not("approved_at", "is", null).is("deleted_at", null)
          .eq("status", "pending_deposit").is("deposit_sent_at", null).is("deposit_proof_url", null)
          .gt("deposit_amount", 0)
          .limit(200);
        for (const b of (unpaid ?? []) as any[]) {
          const left = new Date(b.approved_at).getTime() + 48 * H - Date.now();
          if (left <= 0) continue;
          const sent: string[] = b.reminders_sent ?? [];
          let due: string[] = [];
          if (left <= 6 * H && !sent.includes("dep6")) due = ["dep24", "dep6"];
          else if (left <= 24 * H && !sent.includes("dep24")) due = ["dep24"];
          if (!due.length) continue;
          try {
            await mark(b.id, sent, due);
            const hours = Math.max(1, Math.round(left / H));
            const name = await nameOf(b.photographer_id);
            await notifyBride(b.id, {
              subject: `باقي ${hours} ساعة لتثبيت حجزك`,
              title: "تذكير بالعربون",
              lines: [
                `${name} وافقت على حجزك بتاريخ ${b.event_date}، والتاريخ محجوز لكِ لمدة ${hours} ساعة أخرى فقط.`,
                `حوّلي العربون (${b.deposit_amount} د.أ) وارفعي إثبات التحويل قبل انتهاء المهلة حتى لا يُلغى الطلب.`,
              ],
              template: "deposit_reminder_client",
              ctaLabel: "تفاصيل دفع العربون",
            });
            out.deposit_reminders++;
          } catch (e) { console.error("[deadlines] deposit reminder failed", e); out.errors++; }
        }

        return Response.json(out);
      },
    },
  },
});
