import { createFileRoute } from "@tanstack/react-router";

// ============================================================================
// /api/public/hooks/booking-deadlines — كل 30 دقيقة من Cloudflare Cron
// ----------------------------------------------------------------------------
// 1) يطبّق المهل (expire_unpaid_bookings): 24 ساعة لرد المصوّرة. العربون بلا إلغاء تلقائي:
//    بعد 48 ساعة بلا إيصال نسأل المصوّرة أن تفحص حسابها (تؤكّد أو تلغي بنفسها).
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
          const sent: string[] = b.reminders_sent ?? [];
          // بعد 48 ساعة: سؤال واحد للمصوّرة + تذكير أخير للعروس، بدون إلغاء
          if (left <= 0) {
            if (sent.includes("dep48")) continue;
            try {
              await mark(b.id, sent, ["dep24", "dep6", "dep48"]);
              await notifyPhotographer(b.photographer_id, {
                title: "⏳ مرّت 48 ساعة بدون إيصال عربون",
                body: `افحصي حسابك: إذا وصل ${b.deposit_amount} د.أ اضغطي "وصلني العربون" بصفحة الحجز. إذا ما وصل، راسليها أو ألغي الحجز ليفتح التاريخ (${b.event_date}).`,
                link: `/dashboard/bookings/${b.id}`,
                template: "deposit_overdue_photographer",
                bookingId: b.id,
              });
              await notifyBride(b.id, {
                subject: "هل حوّلتِ العربون؟",
                title: "تذكير: ارفعي إيصال العربون",
                lines: [
                  `إذا حوّلتِ العربون (${b.deposit_amount} د.أ) ارفعي صورة الإيصال الآن من صفحة الحجز.`,
                  "إذا لم تحوّلي بعد، حوّلي اليوم أو راسلي المصوّرة، فالتاريخ ما زال محجوزاً لكِ بانتظار ردّكِ.",
                ],
                template: "deposit_overdue_client",
                ctaLabel: "رفع الإيصال",
              });
              out.deposit_reminders++;
            } catch (e) { console.error("[deadlines] deposit overdue notice failed", e); out.errors++; }
            continue;
          }
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
                `إذا حوّلتِ العربون (${b.deposit_amount} د.أ) لا تنسي رفع صورة الإيصال من صفحة الحجز، حتى تثبّت ${name} حجزكِ بسرعة.`,
              ],
              template: "deposit_reminder_client",
              ctaLabel: "تفاصيل دفع العربون",
            });
            out.deposit_reminders++;
          } catch (e) { console.error("[deadlines] deposit reminder failed", e); out.errors++; }
        }

        // اليوم بتوقيت الأردن ± أيام (YYYY-MM-DD)
        const jDay = (n: number) => new Date(Date.now() + 3 * H + n * 24 * H).toISOString().slice(0, 10);

        // 3ج) العقد غير موقّع والعرس قرّب: تذكير العروس قبل 14 ثم 7 أيام
        try {
          const { data: soon } = await admin.from("bookings")
            .select("id, photographer_id, event_date, reminders_sent")
            .eq("status", "confirmed").is("deleted_at", null)
            .gte("event_date", jDay(0)).lte("event_date", jDay(14)).limit(200);
          for (const b of (soon ?? []) as any[]) {
            const sent: string[] = b.reminders_sent ?? [];
            const daysLeft = Math.round((Date.parse(b.event_date) - Date.parse(jDay(0))) / (24 * H));
            const key = daysLeft <= 7 ? "contract7" : "contract14";
            if (sent.includes(key)) continue;
            const { data: c } = await admin.from("contracts").select("sign_token, status")
              .eq("booking_id", b.id).order("created_at", { ascending: false }).limit(1).maybeSingle();
            if (!c?.sign_token || c.status === "signed") continue;
            try {
              await mark(b.id, sent, key === "contract7" ? ["contract14", "contract7"] : ["contract14"]);
              const name = await nameOf(b.photographer_id);
              await notifyBride(b.id, {
                subject: `عقد التصوير بانتظار توقيعكِ — باقي ${daysLeft} يوم`,
                title: "وقّعي عقد التصوير",
                lines: [
                  `عرسكِ بعد ${daysLeft} يوم، وعقد التصوير مع ${name} لم يُوقَّع بعد.`,
                  "التوقيع يأخذ دقيقة، ويحمي حقّكِ وحقّ المصوّرة إن حدث أي خلاف.",
                ],
                template: "contract_sign_reminder",
                ctaLabel: "توقيع العقد",
                ctaUrl: `${appBase()}/contracts/${c.sign_token}`,
              });
              out.deposit_reminders++;
            } catch (e) { console.error("[deadlines] contract reminder failed", e); out.errors++; }
          }
        } catch (e) { console.error("[deadlines] contract reminders failed", e); out.errors++; }

        // 3د) المتبقي ما زال غير مدفوع بعد 7 أيام من العرس: تذكير ثانٍ للعروس + تنبيه للمصوّرة
        try {
          const { data: owed } = await admin.from("bookings")
            .select("id, photographer_id, client_name, event_date, total_price, deposit_amount, reminders_sent")
            .in("status", ["confirmed", "completed"]).is("deleted_at", null).is("final_paid_at", null)
            .lte("event_date", jDay(-7)).gte("event_date", jDay(-30)).limit(200);
          for (const b of (owed ?? []) as any[]) {
            const sent: string[] = b.reminders_sent ?? [];
            const remaining = Number(b.total_price || 0) - Number(b.deposit_amount || 0);
            if (remaining <= 0 || sent.includes("bal7")) continue;
            try {
              await mark(b.id, sent, ["bal7"]);
              const name = await nameOf(b.photographer_id);
              await notifyBride(b.id, {
                subject: `تذكير: باقي ${remaining} د.أ لـ ${name}`,
                title: "باقي المبلغ",
                lines: [
                  `مرّ أسبوع على مناسبتكِ، وما زال المتبقي (${remaining} د.أ) غير مسجَّل.`,
                  "إذا دفعتِه تجاهلي هذه الرسالة. إذا لا، تفاصيل الدفع في صفحة الحجز، وتُسلَّم صوركِ كاملة بعد الدفع.",
                ],
                template: "balance_due_7d",
                ctaLabel: "تفاصيل الدفع",
              });
              await notifyPhotographer(b.photographer_id, {
                title: `💰 المتبقي من ${b.client_name} لم يُسجَّل بعد`,
                body: `مرّ أسبوع على حجز ${b.event_date} والمتبقي ${remaining} د.أ. إذا استلمتِه سجّليه من صفحة الحجز، وإلا ذكّرناها الآن.`,
                link: `/dashboard/bookings/${b.id}`,
                template: "balance_due_7d_photographer",
                bookingId: b.id,
              });
              out.deposit_reminders++;
            } catch (e) { console.error("[deadlines] balance 7d failed", e); out.errors++; }
          }
        } catch (e) { console.error("[deadlines] balance reminders failed", e); out.errors++; }

        // 3هـ) رسالة من العروس بلا رد منذ 24 ساعة: تنبيه واحد للمصوّرة لكل رسالة
        try {
          const { data: recent } = await admin.from("messages")
            .select("id, booking_id, created_at, sender_id")
            .is("sender_id", null)
            .lte("created_at", new Date(Date.now() - 24 * H).toISOString())
            .gte("created_at", new Date(Date.now() - 72 * H).toISOString())
            .order("created_at", { ascending: false }).limit(300);
          const latest = new Map<string, any>();
          for (const m of (recent ?? []) as any[]) if (!latest.has(m.booking_id)) latest.set(m.booking_id, m);
          for (const [bookingId, m] of latest) {
            const { count: replies } = await admin.from("messages").select("id", { count: "exact", head: true })
              .eq("booking_id", bookingId).not("sender_id", "is", null).gt("created_at", m.created_at);
            if ((replies ?? 0) > 0) continue;
            const { data: b } = await admin.from("bookings")
              .select("id, photographer_id, client_name, status, deleted_at, reminders_sent").eq("id", bookingId).maybeSingle();
            if (!b || b.deleted_at || b.status === "cancelled") continue;
            const sent: string[] = b.reminders_sent ?? [];
            const key = `msg24:${m.id}`;
            if (sent.includes(key)) continue;
            try {
              await mark(b.id, sent.filter((k) => !k.startsWith("msg24:")), [key]);
              await notifyPhotographer(b.photographer_id, {
                title: `💬 ${b.client_name} تنتظر ردّك منذ يوم`,
                body: "رسالتها في محادثة الحجز ما زالت بلا رد. الرد السريع يطمئن العروس ويرفع ثقتها بك.",
                link: `/dashboard/bookings/${b.id}`,
                template: "unanswered_message_photographer",
                bookingId: b.id,
              });
              out.approval_reminders++;
            } catch (e) { console.error("[deadlines] unanswered msg failed", e); out.errors++; }
          }
        } catch (e) { console.error("[deadlines] unanswered messages failed", e); out.errors++; }

        // 4) تنبيه أمني: تغيّرت طرق استلام العربون (يسجّله trigger بقاعدة البيانات)
        try {
          const { data: evs } = await admin.from("payment_change_events")
            .select("id, user_id, new_methods, created_at").is("notified_at", null).order("created_at").limit(50);
          const done = new Set<string>();
          const { sendEmail, tplMessage } = await import("@/lib/email.server");
          const tail = (v?: string) => (v ? `…${String(v).replace(/\s/g, "").slice(-4)}` : "");
          for (const ev of (evs ?? []) as any[]) {
            // تغييرات متتالية لنفس الحساب = إيميل واحد
            if (!done.has(ev.user_id)) {
              done.add(ev.user_id);
              const { data: u } = await admin.auth.admin.getUserById(ev.user_id);
              const to = u?.user?.email;
              if (to) {
                const list = (Array.isArray(ev.new_methods) ? ev.new_methods : []).map((m: any) =>
                  m.kind === "cliq" ? `CliQ ${tail(m.alias)}` : m.kind === "wallet" ? `${m.provider || "محفظة"} ${tail(m.number)}` : `${m.bank || "بنك"} ${tail(m.iban)}`);
                const msg = tplMessage({
                  subject: "تنبيه: تغيّرت طرق استلام العربون في حسابك",
                  title: "تغيّرت طرق استلام العربون",
                  lines: [
                    `تغيّرت بيانات استلام العربون في حسابك على ميموريا (${new Date(ev.created_at).toLocaleString("ar-JO", { timeZone: "Asia/Amman" })}).`,
                    list.length ? `الطرق الحالية: ${list.join("، ")}` : "لم تعد هناك أي طريقة لاستلام العربون.",
                    "إذا كنتِ أنتِ: تجاهلي هذه الرسالة.",
                    "إذا لم تكوني أنتِ: غيّري كلمة المرور فوراً، وصحّحي البيانات، وراسلينا، فالعرائس قد يحوّلن لحساب غيرك.",
                  ],
                  cta: { label: "مراجعة طرق الدفع", url: `${appBase()}/dashboard/profile` },
                });
                await sendEmail({ to, subject: msg.subject, html: msg.html, template: "payment_methods_changed", related_user_id: ev.user_id });
              }
            }
            await admin.from("payment_change_events").update({ notified_at: new Date().toISOString() }).eq("id", ev.id);
          }
        } catch (e) { console.error("[deadlines] payment change alert failed", e); out.errors++; }

        return Response.json(out);
      },
    },
  },
});
