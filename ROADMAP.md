# EliteCapture — Engineering Roadmap

This roadmap tracks the audit-driven improvements. Phases 0–2 are implemented
as stacked pull requests; Phase 3 items require the owner's external accounts /
secrets and are scoped here with concrete implementation notes.

---

## ✅ Phase 0 — Booking integrity & secret hygiene (PR #1)
- `has_booking_conflict()` + `create_booking_guarded()` — atomic, advisory-locked,
  conflict-checked, idempotent booking creation (fixes double-booking race).
- `submitBookingRequest` uses the guarded RPC; no duplicate emails on retries.
- `.env` git-ignored + `.env.example` added.

**Post-merge:** run the migration on Supabase; rotate Supabase keys as a precaution.

## ✅ Phase 1 — Anti-abuse, email, privacy (PR #2)
- Cloudflare Turnstile on the public booking form (progressive — off until keys set).
- `app_rate_limit()` backstop (5 booking requests / email / hour).
- `EMAIL_FROM` env (use a verified Resend domain — otherwise emails hit spam).
- Removed the public `wa.me` number; all enquiries route through tracked booking.

**Post-merge:** run the migration; set `EMAIL_FROM` + verify the Resend domain
(SPF/DKIM); optionally set `VITE_TURNSTILE_SITE_KEY` + `TURNSTILE_SECRET_KEY`.

## ✅ Phase 2 — Installable PWA / mobile app (PR #3)
- Service worker (offline fallback + caching), `offline.html`, richer manifest,
  iOS/PWA meta + SW registration. Installable on iOS & Android.

**Next for app stores:** PWABuilder → Google Play (TWA); Capacitor → App Store.
Add a dedicated 192×192 icon (currently reusing 512).

## ✅ Priority 1 — Online deposit payments & auto subscription billing (PR — feat/priority-1-payments-subscriptions)
طبقة مدفوعات provider-agnostic + webhook موثّق + تجديد اشتراك تلقائي. كلها env-gated
(عند غياب المفاتيح: no-op آمن، ويبقى CliQ اليدوي + التجديد اليدوي عبر الأدمن فعّالين).

- **`payments.server.ts`** — واجهة موحّدة `PaymentProvider` (`createDepositCheckout`,
  `verifyWebhook`, `getPaymentStatus`). تنفيذ Stripe مرجعي عبر REST + Web Crypto
  (متوافق مع Cloudflare Workers، بلا SDK). هيكل HyperPay (JOD) جاهز للتنفيذ لاحقاً.
- **`createDepositCheckout` (server fn)** — عام، server-authoritative بالرمز (token)
  لا بـ booking_id من العميل؛ يعيد حساب مبلغ العربون من قاعدة البيانات.
- **webhook `api/public/hooks/payment`** — تحقّق توقيع + idempotency عبر جدول
  `payment_events` + تأكيد ذرّي للعربون (`confirm_booking_deposit_paid`) + إيميل/واتساب.
- **فوترة اشتراك تلقائية** — `renew_subscription_paid` (تمديد `current_period_end`)،
  وتوسيع `email-reminders` لتذكيرات قبل الانتهاء بـ 7 و3 أيام.
- **`whatsapp.server.ts`** — مساعد WhatsApp Cloud API (env-gated، no-op آمن).
- migration: `20260622120000_payments_integration.sql` (أعمدة ربط الدفع + `payment_events` +
  الدوال أعلاه، RLS مُفعّل على الجدول الجديد). تحديث `types.ts`.

**Post-merge:** شغّل الـ migration؛ اضبط `PAYMENT_PROVIDER` + `STRIPE_SECRET_KEY` +
`STRIPE_WEBHOOK_SECRET` (وللإنتاج بالدينار: HyperPay)؛ اضبط نقطة webhook لدى المزوّد على
`/api/public/hooks/payment`؛ اختياري: `WHATSAPP_API_TOKEN` + `WHATSAPP_PHONE_ID`،
و`PUBLIC_APP_URL`.

---

## 🔭 Phase 3 — Growth features (need external accounts/secrets)

### 3.1 Online deposit payment gateway 🔴 (highest business impact)
Replace the manual CliQ + proof-upload flow with automatic deposit collection.
- **Jordan options:** HyperPay / MadfooatCom (eFAWATEERcom); Stripe if eligible.
- **Plan:**
  - New server fn `createDepositCheckout(bookingId)` → returns gateway redirect URL.
  - Webhook route `api/public/hooks/payment` → verify signature → set
    `deposit_confirmed_at`, status `confirmed`, email the client.
  - Keep manual CliQ as a fallback for clients who prefer it.
- **Secrets:** `PAYMENT_API_KEY`, `PAYMENT_WEBHOOK_SECRET`.

### 3.2 WhatsApp Cloud API notifications 🟠
- Server helper `sendWhatsApp(to, template, vars)`; call alongside email in
  `submitBookingRequest` and on status changes.
- **Secrets:** `WHATSAPP_API_TOKEN`, `WHATSAPP_PHONE_ID` (Meta Business).

### 3.3 Automatic subscription billing 🟠
- Recurring billing via the same gateway; webhook updates
  `subscriptions.current_period_end`; dunning emails before expiry.
- Removes the manual admin-renewal step.

### 3.4 Cancellation / refund flow 🟡
- Photographer + client cancel actions → status `cancelled`; deposit-refund policy;
  notify both parties. (`has_booking_conflict` already ignores `cancelled`.)

### 3.5 Review moderation 🟡
- Reviews currently publish immediately (`is_published = true`). Add an admin
  moderation queue and insert new reviews as `false` once the queue UI exists.

### 3.6 Photographer analytics 🟡
- Extend `/dashboard/reports`: conversion rate, monthly revenue, lead source,
  booking funnel.

### 3.7 Media optimization 🟡
- Cloudflare Images / WebP transforms for delivery galleries (faster loads, lower egress).

---

## 🔒 Standing security checklist
- [ ] Audit live RLS policies; ensure no unintended `USING (true)` remains
      (notably `contracts`, `notifications`).
- [ ] Rotate Supabase keys (precaution — `.env` was historically committed).
- [ ] Verify the service-role key is server-only (never shipped to the browser).
