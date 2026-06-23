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
- **فاتورة اشتراك تلقائية** — `renew_subscription_paid` (تمديد `current_period_end`)،
  وتوسيع `email-reminders` لتذكيرات قبل الانتهاء بـ 7 و3 أيام.
- **`whatsapp.server.ts`** — مساعد WhatsApp Cloud API (env-gated، no-op آمن).
- migration: `20260622120000_payments_integration.sql`

**Post-merge:** شغّل الـ migration؛ اضبط `PAYMENT_PROVIDER` + `STRIPE_SECRET_KEY` +
`STRIPE_WEBHOOK_SECRET` (وللإنتاج بالدينار: HyperPay)؛ اضبط نقطة webhook لدى المزوّد على
`/api/public/hooks/payment`؛ اختياري: `WHATSAPP_API_TOKEN` + `WHATSAPP_PHONE_ID`،
و`PUBLIC_APP_URL`.

---

## ✅ Priority 2 — Cancellation & deposit refund (PR — feat/priority-2-cancellation-refund)
- migration `20260622130000_booking_cancellation.sql`: أعمدة `cancelled_at`,
  `cancellation_reason`, `cancelled_by`, `refund_amount`, `refund_status` على bookings؛
  سياسة استرداد على profiles (`deposit_refund_policy` full/partial/none + `deposit_refund_percent`).
- `cancel_booking(_id,_reason)` — المصوّرة/الأدمن، أي حالة غير completed؛ يحسب الاسترداد
  حسب السياسة، يسجّل في audit_logs، ويُشعر العميل (in-app + إيميل + واتساب).
- `client_cancel_booking(_token,_reason)` — العميل عبر الرمز، فقط قبل `confirmed`؛ يُشعر المصوّرة.
- server fns: `cancelBooking`, `clientCancelBooking`, `updateRefundPolicy` + قالب بريد `tplBookingCancelled`.
- حالة `cancelled` تُحرّر الموعد تلقائياً (مستثناة أصلاً من `has_booking_conflict` — تم التحقّق).

**Post-merge:** شغّل الـ migration. (الاسترداد الفعلي عبر بوّابة الدفع يُوصَّل لاحقاً عبر
`refund_status='pending'` — هوك جاهز لربط gateway refund API.)

---

## ✅ Priority 3 — Review moderation + extended audit (PR — feat/priority-3-reviews-audit)
- migration `20260622140000_review_moderation_and_audit.sql`:
  - التقييمات الجديدة `is_published` default = **false** (لا نلمس القائمة).
  - `approve_review` / `reject_review` (أدمن) + دالة `log_audit` عامة.
  - توسيع التدقيق: `soft_delete_booking` / `admin_renew_subscription` / `admin_set_published`
    تسجّل الآن في `audit_logs` (إضافةً لـ confirm في server fn، وcancel من الأولوية 2).
- `submitReviewByToken` ينشئ التقييم غير منشور (pending moderation).
- server fns: `listReviewsAdmin` / `adminApproveReview` / `adminRejectReview`.
- route أدمن `/admin/reviews` + رابط تنقّل في `/admin`.

**Post-merge:** شغّل الـ migration. التقييمات القائمة تبقى منشورة؛ الجديدة تمرّ بالمراجعة.

---

## ✅ PR #10 (feat/nav-dashboard-hygiene)
- إصلاح هيدر صفحة /guide، إزالة بلوك مزامنة التقويم المكرّر من اللوحة،
  إخفاء "حالة الجاهزية" تلقائياً + زر إغلاق دائم محفوظ في profiles.quickstart_dismissed_at،
  توحيد زر الرجوع BackToDashboard، وملاحظة Lovable عن ألوان لوحة الإنتاج.

## ✅ PR #11 (feat/pwa-install-page)
- صفحة /app لتثبيت التطبيق (PWA) + service worker + offline.html + تسجيل SW + manifest محسّن.

## ✅ PR #12 (feat/google-oauth-referral) — Google OAuth + ربط الإحالة
- إضافة زر "تسجيل الدخول / التسجيل بواسطة Google" في login.tsx و join.tsx.
- حفظ `referral_code` في `sessionStorage` قبل OAuth redirect لمنع ضياعه.
- معالجة `pending_referral_code` تلقائياً في dashboard.index.tsx بعد callback.

**Post-merge:** فعّل Google Provider في Supabase Auth؛ أضف Authorized Redirect URI في Google Console.

## ✅ PR #13 (feat/referral-reward-engine) — محرك مكافآت الإحالة (الخيار 1)
- دالة `grant_referral_reward()` مركزية (SECURITY DEFINER، idempotent):
  +14 يومًا للداعية فقط عند أول اشتراك مدفوع للمدعوّة.
- ربط المكافأة بـ `renew_subscription_paid()` (webhook) و `admin_renew_subscription()` (أدمن).
- تسجيل كل منح في `audit_logs`.
- migration: `20260623083000_referral_rewards.sql`

**Post-merge:** شغّل migration على Supabase.

## ✅ PR #14 (feat/dashboard-audit-rls) — تدقيق الأمان + إصلاح لوحة التحكم
### 🔐 إصلاحات أمنية (RLS)
- **notifications INSERT WITH CHECK (true)** محذوف — كان يسمح لأي مستخدم بحقن إشعارات لأي حساب.
- **contracts SELECT USING (true)** محذوف — كان يكشف جميع العقود لأي زائر.
  استُبدل بسياسة تقتصر على المصوّر صاحب العقد.

### 🛠️ إصلاحات لوحة التحكم
- `dashboard.reports.tsx`: try/catch + error state + empty state.
- `dashboard.production.tsx`: try/catch + error state؛ `.eq("photographer_id", uid)` في move() لمنع privilege escalation.
- `dashboard.referrals.tsx`: عداد `earnedDays = grantedCount * 14` صحيح بدلاً من عدد الإحالات.

**Post-merge:** شغّل migration: `20260623090000_rls_security_hardening.sql`

## ✅ PR #15 (feat/ux-improvements) — تحسينات UX وصفحة البحث
- `search.tsx`: إضافة error state لـ useQuery (شبكة معطوبة).
- `ROADMAP.md`: توثيق شامل لكل التغييرات.

---

## 🔍 Phase 3 — Growth features (need external accounts/secrets)

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

## 🎨 UI notes for Lovable (تصميم — تُكمَّل في Lovable)
- **لوحة متابعة الإنتاج (`/dashboard/production`)**: ألوان المراحل فاتحة فقط
  (`bg-*-50`) وغير واضحة، وتنكسر في الوضع الداكن (لا توجد مقابلات `dark:`).
  المطلوب: تباين أوضح + `dark:` لكل لون، مع إبقاء مفاتيح المراحل كما هي.
- **سلوك التمرير عند الرجوع**: صفحات `/dashboard/*` تُظهر `PageLoader` عند كل
  دخول (إعادة تركيب) فيُفقد موضع التمرير عند الرجوع رغم تفعيل `scrollRestoration`.
  تحسين مقترح لاحقاً: تحميل البيانات عبر route loaders أو إبقاء المحتوى السابق
  بدل استبداله بـ loader كامل.

## 🔒 Standing security checklist
- [x] ~~Audit live RLS policies; ensure no unintended `USING (true)` remains~~
      ~~(notably `contracts`, `notifications`).~~ **Fixed in PR #14.**
- [ ] Rotate Supabase keys (precaution — `.env` was historically committed).
- [ ] Verify the service-role key is server-only (never shipped to the browser).
