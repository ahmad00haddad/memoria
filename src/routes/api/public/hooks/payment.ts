import { createFileRoute } from "@tanstack/react-router";

// ============================================================================
// /api/public/hooks/payment — webhook بوّابة الدفع (Stripe مرجعياً)
// ----------------------------------------------------------------------------
// المسؤوليات:
//   1) قراءة الجسم الخام والتحقّق من توقيع المزوّد (يرفض الطلبات غير الموقّعة).
//   2) Idempotency: يُسجّل كل event id في payment_events ويتجاهل المكرّر.
//   3) عند نجاح دفع العربون → confirm_booking_deposit_paid (ذرّي) + إيميل/واتساب.
//   4) عند نجاح دفع اشتراك → renew_subscription_paid (تمديد current_period_end).
//
// ملاحظات:
//   * يعيد 400 فقط عند فشل التحقّق من التوقيع؛ وإلا 200 دائماً حتى لا يعيد المزوّد
//     المحاولة بلا داعٍ على أخطاء منطقية (مع تسجيلها).
//   * env-gated: إن لم تُضبط المفاتيح يُعيد 503 بهدوء دون كسر شيء.
// ============================================================================

export const Route = createFileRoute("/api/public/hooks/payment")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { getPaymentProvider } = await import("@/lib/payments.server");
        const provider = getPaymentProvider();
        if (!provider) {
          // البوّابة غير مهيّأة — لا شيء لمعالجته.
          return new Response(JSON.stringify({ ok: false, reason: "payments not configured" }), {
            status: 503,
            headers: { "Content-Type": "application/json" },
          });
        }

        // 1) الجسم الخام مطلوب للتحقّق من التوقيع.
        const rawBody = await request.text();
        const sig =
          request.headers.get("stripe-signature") ||
          request.headers.get("Stripe-Signature");

        let evt;
        try {
          evt = await provider.verifyWebhook(rawBody, sig);
        } catch (e: any) {
          console.error("[payment] signature verification failed:", e?.message || e);
          return new Response("invalid signature", { status: 400 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        // 2) Idempotency: نطالب بالحدث أولاً؛ التعارض = سبق معالجته.
        const obj = evt.object || {};
        // دعم كل من Stripe (metadata) وHyperPay (customParameters في metadata)
        const meta = (obj.metadata || obj.customParameters || {}) as Record<string, string>;
        const kind = meta.kind || (obj.subscription ? "subscription" : "deposit");
        const relatedBookingId =
          kind === "deposit" ? (meta.booking_id || obj.client_reference_id || null) : null;
        const relatedUserId = kind === "subscription" ? (meta.photographer_id || null) : null;

        const { error: claimErr } = await supabaseAdmin.from("payment_events").insert({
          id: evt.event_id,
          provider: provider.name,
          event_type: evt.type,
          related_booking_id: relatedBookingId,
          related_user_id: relatedUserId,
          reference_type: kind,
        });
        if (claimErr) {
          // 23505 = انتهاك مفتاح أساسي → حدث مكرّر، تجاهله بأمان.
          if ((claimErr as any).code === "23505") {
            return Response.json({ ok: true, deduped: true });
          }
          console.error("[payment] failed to claim event:", claimErr.message);
          return Response.json({ ok: false, error: "claim failed" }, { status: 200 });
        }

        // 3) الأحداث التي تعني نجاح الدفع.
        const isPaidEvent =
          evt.type === "checkout.session.completed" ||
          evt.type === "payment_intent.succeeded" ||
          evt.type === "invoice.paid" ||
          evt.type === "invoice.payment_succeeded";

        // إن كانت جلسة الدفع غير ناجحة فعلاً، لا تؤكّد.
        let sessionPaid = false;
        if (evt.type === "checkout.session.completed") {
          sessionPaid = obj.payment_status === "paid" || obj.payment_status === "no_payment_required";
        } else if (evt.type === "payment_intent.succeeded") {
          sessionPaid = obj.status === "succeeded";
        } else if (evt.type.startsWith("invoice.")) {
          sessionPaid = obj.status === "paid" || obj.paid === true;
        }

        if (!isPaidEvent || !sessionPaid) {
          return Response.json({ ok: true, ignored: evt.type });
        }

        try {
          if (kind === "subscription") {
            // ----- تجديد اشتراك -----
            const photographerId = meta.photographer_id;
            const months = Math.max(1, parseInt(meta.months || "1", 10) || 1);
            if (!photographerId) {
              return Response.json({ ok: true, note: "subscription event without photographer_id" });
            }
            const amount =
              typeof obj.amount_paid === "number" ? obj.amount_paid / 100 :
              typeof obj.amount_total === "number" ? obj.amount_total / 100 : null;
            const currency = (obj.currency || "jod").toUpperCase();
            const intent = obj.payment_intent || obj.id || null;

            const { error: rErr } = await supabaseAdmin.rpc("renew_subscription_paid", {
              _photographer_id: photographerId,
              _months: months,
              _provider: provider.name,
              _intent: intent,
              _amount: amount,
              _currency: currency,
            } as any);
            if (rErr) throw new Error(rErr.message);

            return Response.json({ ok: true, handled: "subscription", photographer_id: photographerId });
          }

          // ----- تأكيد عربون حجز -----
          if (!relatedBookingId) {
            return Response.json({ ok: true, note: "deposit event without booking_id" });
          }
          const intent = obj.payment_intent || obj.id || null;
          const session = obj.id || null;

          const { data: res, error: cErr } = await supabaseAdmin.rpc("confirm_booking_deposit_paid", {
            _booking_id: relatedBookingId,
            _provider: provider.name,
            _session: session,
            _intent: intent,
          } as any);
          if (cErr) throw new Error(cErr.message);

          const info = (res || {}) as any;

          // إشعارات (مرّة واحدة فقط — لا تُرسل إن كان مؤكّداً مسبقاً).
          if (!info.already_confirmed) {
            // توليد العقد تلقائياً من قالب المصورة عند تأكيد الحجز (إن وُجد قالب)
            try {
              await (supabaseAdmin.rpc as any)("auto_generate_contract", { _booking_id: info.booking_id });
            } catch (e) {
              console.error("[payment] auto_generate_contract failed:", e);
            }

            // إشعار داخل التطبيق للعميل المرتبط بحساب.
            if (info.client_user_id) {
              await supabaseAdmin.from("notifications").insert({
                user_id: info.client_user_id,
                title: "تأكيد الحجز",
                body: "تم استلام العربون وتأكيد حجزك.",
                link: `/dashboard/bookings/${info.booking_id}`,
              });
            }

            // بريد التأكيد + واتساب (fire-and-forget — لا تُفشل الـ webhook عليها).
            try {
              const { sendEmail, tplDepositConfirmed } = await import("@/lib/email.server");
              const { data: prof } = await supabaseAdmin
                .from("profiles").select("display_name").eq("id", info.photographer_id).maybeSingle();
              const photographerName = prof?.display_name || "المصوّرة";

              if (info.client_email) {
                const t = tplDepositConfirmed({
                  client_name: info.client_name || "عميلتنا",
                  photographer_name: photographerName,
                  event_date: String(info.event_date),
                  track_token: info.tracking_token,
                });
                await sendEmail({
                  to: info.client_email, subject: t.subject, html: t.html,
                  template: "deposit_confirmed", related_booking_id: info.booking_id,
                });
              }

              if (info.client_phone) {
                const { sendWhatsAppText } = await import("@/lib/whatsapp.server");
                await sendWhatsAppText(
                  info.client_phone,
                  `تم استلام العربون وتأكيد حجزك مع ${photographerName} بتاريخ ${info.event_date}. يمكنك متابعة الحجز عبر الرابط.`,
                );
              }
            } catch (e) {
              console.error("[payment] deposit confirm notifications failed:", e);
            }
          }

          return Response.json({
            ok: true,
            handled: "deposit",
            booking_id: info.booking_id,
            already_confirmed: Boolean(info.already_confirmed),
          });
        } catch (e: any) {
          console.error("[payment] processing error:", e?.message || e);
          // 200 حتى لا يعيد المزوّد المحاولة بلا فائدة؛ الخطأ مسجَّل.
          return Response.json({ ok: false, error: e?.message || "processing error" });
        }
      },
    },
  },
});
