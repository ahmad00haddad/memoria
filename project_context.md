# EliteCapture (royal-lens-flow) — Project Context

> **ملف السياق التقني الشامل** — يُستخدم كمرجع لـ Lovable AI وأي مطوّر يعمل على المشروع.
> تاريخ الإنشاء: 2026-06-23
> الـ PRs المنجزة حتى الآن: #1 → #18

---

## 1. نظرة عامة على المشروع

**EliteCapture** منصة أردنية تربط مصوّرات الأعراس بالعرائس.

### Tech Stack
- **Framework:** TanStack Start (React SSR) + Vite + TypeScript
- **Deployment:** Cloudflare Workers (edge)
- **Database + Auth:** Supabase (PostgreSQL + Row Level Security)
- **Payments:** HyperPay (JOD) + Stripe (دولي) — provider-agnostic
- **Email:** Resend API
- **WhatsApp:** WhatsApp Cloud API (Meta Business)
- **Styling:** Tailwind CSS + shadcn/ui

### هيكل الملفات الرئيسي
```
src/
├── routes/          # TanStack File-based routing
│   ├── index.tsx    # الصفحة الرئيسية
│   ├── search.tsx   # البحث عن مصوّر
│   ├── photographers/$username.tsx  # صفحة المصوّر العامة
│   ├── track.$token.tsx             # صفحة تتبع الحجز (للعميل)
│   ├── contracts.$token.tsx         # توقيع العقد
│   ├── review.$token.tsx            # تقييم المصوّرة
│   ├── dashboard.*                  # لوحة تحكم المصوّرة
│   ├── admin.*                      # لوحة الأدمن
│   └── api/public/hooks/            # Webhooks (دفع + إيميل)
├── lib/             # Server functions + utilities
│   ├── booking.functions.ts         # حجوزات
│   ├── cancellation.functions.ts    # إلغاء الحجوزات
│   ├── calendar.functions.ts        # التقويم
│   ├── contracts.functions.ts       # العقود
│   ├── email.functions.ts           # إيميل التسليم
│   ├── email.server.ts              # Resend + templates
│   ├── gallery.functions.ts         # معرض التسليم
│   ├── payments.functions.ts        # بوّابة الدفع (client fns)
│   ├── payments.server.ts           # Stripe + HyperPay implementations
│   ├── production.functions.ts      # مراحل الإنتاج
│   ├── search.functions.ts          # البحث
│   ├── shotlist.functions.ts        # قائمة اللقطات
│   ├── upload.ts                    # 🆕 مساعد الرفع الشامل
│   ├── watermark.ts                 # علامة مائية (Canvas API)
│   └── whatsapp.server.ts           # WhatsApp Cloud API
├── components/
│   ├── site/                        # Header, Footer, MobileBottomNav
│   ├── ui/                          # shadcn components
│   ├── Lightbox.tsx                 # معرض الصور
│   ├── OnboardingWizard.tsx         # دليل البدء
│   ├── ShotList.tsx                 # قائمة اللقطات
│   ├── UploadZone.tsx               # 🆕 مكوّن رفع الملفات
│   └── WhatsAppQuickSend.tsx        # إرسال واتساب سريع
├── integrations/
│   ├── supabase/
│   │   ├── types.ts                 # Auto-generated DB types
│   │   ├── client.ts                # Supabase client (browser)
│   │   ├── client.server.ts         # Supabase admin (server-only)
│   │   └── auth-middleware.ts       # requireSupabaseAuth middleware
│   └── lovable/                     # ⚠️ لا تعدّل هذا المجلد
└── server.ts                        # Cloudflare Workers entry + security headers
```

---

## 2. قاعدة البيانات — جداول Supabase

### الجداول الرئيسية
| الجدول | الوصف |
|--------|-------|
| `profiles` | الملفات الشخصية للمصوّرات |
| `bookings` | الحجوزات (القلب الرئيسي للمنصة) |
| `booking_items` | بنود الحجز (باقة أساسية + إضافات) |
| `pricing_rules` | قواعد التسعير لكل مصوّرة |
| `contracts` | العقود الرقمية |
| `contract_templates` | قوالب العقود |
| `delivery_galleries` | معارض تسليم الصور |
| `delivery_photos` | صور المعرض |
| `messages` | رسائل المصوّر ↔ العميل |
| `notifications` | إشعارات in-app (Realtime) |
| `reviews` | تقييمات العملاء |
| `subscriptions` | اشتراكات المصوّرات |
| `subscription_payments` | مدفوعات الاشتراك |
| `payment_events` | أحداث webhook (idempotency) |
| `audit_logs` | سجل التدقيق الشامل |
| `email_log` | سجل الإيميلات المُرسَلة |
| `shot_list_items` | قائمة اللقطات (تاسك قبل التصوير) |
| `photographer_private` | بيانات خاصة (WhatsApp, CliQ, iCal) |
| `photographer_unavailability` | أيام عدم التوفر |
| `user_roles` | صلاحيات المستخدمين (admin) |
| `whatsapp_templates` | قوالب WhatsApp |
| `referrals` | سجل الإحالات |
| `push_subscriptions` | 🆕 اشتراكات PWA Push |

### دوال SQL الرئيسية (RPCs)
| الدالة | الوصف |
|--------|-------|
| `create_booking_guarded()` | إنشاء حجز ذري مع منع التعارض |
| `has_booking_conflict()` | فحص تعارض المواعيد |
| `get_booking_by_token()` | جلب الحجز برمز التتبع |
| `confirm_booking_deposit_paid()` | تأكيد استلام العربون (من webhook) |
| `cancel_booking()` | إلغاء حجز (مصوّرة/أدمن) |
| `client_cancel_booking()` | إلغاء من العميل (برمز التتبع) |
| `client_mark_deposit_sent()` | العميل يُبلّغ بإرسال العربون |
| `client_mark_received()` | العميل يؤكد استلام الصور |
| `renew_subscription_paid()` | تجديد الاشتراك (من webhook) |
| `admin_renew_subscription()` | تجديد يدوي (أدمن) |
| `grant_referral_reward()` | منح مكافأة الإحالة |
| `soft_delete_booking()` | حذف ناعم للحجز |
| `approve_review()` | اعتماد تقييم (أدمن) |
| `reject_review()` | رفض تقييم (أدمن) |
| `get_photographer_busy_dates()` | أيام مشغولة المصوّرة |
| `get_sitemap_photographers()` | 🆕 قائمة المصوّرين للـ sitemap |
| `get_photographer_stats()` | 🆕 إحصاءات المصوّرة الشاملة |
| `seed_default_shot_list()` | إضافة قالب لقطات افتراضي |

---

## 3. Storage Buckets

| Bucket | العموم | الحد الأقصى | الأنواع المسموحة | المستخدِم |
|--------|--------|------------|-----------------|----------|
| `avatars` | عام ✅ | 5 MB | jpg/png/webp | المصوّرة (authenticated) |
| `deposit-proofs` | خاص 🔒 | 5 MB | jpg/png/webp/pdf | العميل (anonymous + token) |
| `payment-proofs` | خاص 🔒 | 5 MB | jpg/png/webp/pdf | المصوّرة (authenticated) |
| `delivery-photos` | خاص 🔒 | 20 MB | jpg/png/webp | المصوّرة (authenticated) |
| `portfolio` | عام ✅ | 10 MB | jpg/png/webp | المصوّرة (authenticated) |

### ملاحظة مهمة — رفع الملفات:
استخدم دائماً `uploadFile()` من `@/lib/upload.ts` بدلاً من استدعاء `supabase.storage.from().upload()` مباشرة.
هذا يضمن رسائل خطأ واضحة بالعربية ومعالجة شاملة لكل حالات الخطأ.

```typescript
import { uploadFile } from "@/lib/upload";

const result = await uploadFile(file, {
  bucket: "deposit-proofs",
  path: `public-tokens/${token}/${Date.now()}.jpg`,
  maxMb: 5,
  allowedTypes: "image_or_pdf",
  upsert: false,
});

if (!result.ok) {
  toast.error(result.userMessage); // رسالة عربية واضحة
  return;
}
// result.path = المسار في Storage
```

---

## 4. متغيرات البيئة (Environment Variables)

### مطلوبة (يتوقف عليها التطبيق)
```bash
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_PUBLISHABLE_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...   # server-only!
```

### اختيارية (تُفعّل ميزات معيّنة)
```bash
# البريد الإلكتروني
RESEND_API_KEY=re_...
EMAIL_FROM="EliteCapture <noreply@yourdomain.com>"

# بوّابة الدفع — HyperPay (الأردن)
PAYMENT_PROVIDER=hyperpay
HYPERPAY_ACCESS_TOKEN=...
HYPERPAY_ENTITY_ID=...
HYPERPAY_WEBHOOK_SECRET=...
PAYMENT_CURRENCY=JOD
SUBSCRIPTION_MONTHLY_PRICE=25

# بوّابة الدفع — Stripe (بديل)
PAYMENT_PROVIDER=stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# WhatsApp
WHATSAPP_API_TOKEN=EAAxxxxx
WHATSAPP_PHONE_ID=xxxxx

# الموقع
PUBLIC_APP_URL=https://elitecapture.com

# صور
CLOUDFLARE_IMAGES_ZONE=zone.elitecapture.com  # اختياري
```

---

## 5. مسارات الـ API

| المسار | الطريقة | الوصف |
|--------|---------|-------|
| `/api/public/hooks/payment` | POST | Webhook بوّابة الدفع (Stripe + HyperPay) |
| `/api/public/hooks/email-reminders` | POST | تذكيرات يومية (cron) |
| `/api/public/hooks/ical-sync` | POST | مزامنة iCal |
| `/api/public/ical/$token` | GET | تصدير iCal للمصوّرة |

---

## 6. Server Functions الأساسية

### booking.functions.ts
- `submitBookingRequest` — إنشاء حجز جديد (ذري + anti-duplicate)
- `getBookingByToken` — جلب الحجز برمز التتبع
- `clientMarkDepositSent` — العميل يُبلّغ بإرسال العربون
- `clientMarkReceived` — العميل يؤكد الاستلام
- `submitReviewByToken` — تقديم تقييم
- `confirmBookingAfterDeposit` — تأكيد الحجز (مصوّرة)
- `recordReferralAfterSignup` — تسجيل إحالة

### production.functions.ts 🆕
- `updateProductionStage` — تحديث مرحلة الإنتاج (مع audit log)
- `markFinalPaymentReceived` — تسجيل الدفعة النهائية
- `updateBookingStatus` — تغيير حالة الحجز
- `saveBookingSelectionLink` — حفظ رابط اختيار الصور

### payments.functions.ts
- `isPaymentsEnabled` — هل بوّابة الدفع مهيّأة؟
- `createDepositCheckout` — دفع العربون أونلاين
- `createSubscriptionCheckout` — 🆕 دفع الاشتراك أونلاين
- `processDepositRefund` — 🆕 معالجة الاسترداد (أدمن)

### cancellation.functions.ts
- `cancelBooking` — إلغاء من المصوّرة/الأدمن
- `clientCancelBooking` — إلغاء من العميل (برمز التتبع)
- `updateRefundPolicy` — تحديث سياسة الاسترداد

### calendar.functions.ts 🆕
- `getCalendarMonthData` — بيانات التقويم للشهر
- `toggleUnavailability` — تبديل يوم عدم توفر

---

## 7. تدفق رحلة المستخدم

### رحلة العميل (العروس)
```
1. تصفّح /search → اختيار مصوّرة
2. /photographers/:username → اختيار الباقة + اليوم + الوقت
3. إرسال الطلب → submitBookingRequest()
4. استلام إيميل + رابط تتبع /track/:token
5. إرسال العربون (CliQ أو أونلاين)
6. انتظار تأكيد المصوّرة
7. يوم التصوير 🎊
8. تسليم الصور → إيميل إشعار + رابط المعرض
9. تقييم المصوّرة /review/:token
```

### رحلة المصوّرة
```
1. التسجيل /photographers/join
2. إعداد الملف الشخصي + الباقات + العقود
3. نشر الملف (أدمن يوافق)
4. استقبال طلبات حجز → إشعار فوري (Realtime bell)
5. مراجعة الطلب → تأكيد بعد استلام العربون
6. يوم التصوير → تحديث مرحلة الإنتاج
7. رفع الصور → إرسال للعميل
8. استلام الدفعة النهائية
```

---

## 8. ميزات الأمان

### RLS (Row Level Security)
- كل جدول محمي بسياسات RLS
- `photographer_id = auth.uid()` على كل جدول خاص
- الإشعارات: `user_id = auth.uid()`
- العقود: المصوّر فقط يرى عقوده

### Security Headers (server.ts)
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: SAMEORIGIN`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=()`
- `Strict-Transport-Security: max-age=31536000` (production)

### Payment Security
- مبالغ العربون تُحسب على الخادم (لا تثق بالمتصفح)
- Webhook signature verification (HMAC-SHA256)
- Idempotency عبر جدول `payment_events`

---

## 9. Migrations (بالترتيب)

```
20260508... → initial schema
20260509... → pricing + reviews
20260510... → contracts
20260511... → messaging
20260603... → profile enhancements
20260604-07 → multiple improvements
20260607... → extended schema (10KB)
20260608... → payments + subscriptions
20260614... → multiple improvements
20260615... → shot_list_items + production tracking
20260616... → iCal + availability
20260621... → phase0 booking integrity (advisory lock)
20260622120000 → payments integration (HyperPay/Stripe columns)
20260622123601 → extended payments schema (15KB)
20260622130000 → cancellation + refund system
20260622140000 → review moderation + audit logs
20260623000000 → quickstart dismiss
20260623083000 → referral rewards
20260623090000 → RLS security hardening
20260623100000 → production fields + shot_list + subscription_payments
20260623110000 → SEO indexes + sitemap RPC
20260623120000 → delivery_due trigger + stats RPC + push_subscriptions
20260623130000 → 🆕 storage buckets complete (all buckets + policies)
```

---

## 10. Open Pull Requests

| PR | Branch | المحتوى |
|----|--------|---------|
| #16 | feat/phase1-server-fns-security | Backend Security + Payments + UX |
| #17 | feat/phase5-performance-seo | Performance + SEO + PWA |
| #18 | feat/phase6-fixes-enhancements | Critical Fixes + Advanced Features |
| **#19** | **feat/phase7-upload-fix** | **🆕 رفع الملفات الشامل + project_context.md** |

---

## 11. المشاكل المعروفة والحلول

### مشكلة رفع الصور
**السبب الأكثر شيوعاً:** bucket غير موجود في Supabase أو policy مفقودة.

**الحل:**
1. شغّل migration `20260623130000_storage_buckets_complete.sql`
2. استخدم دائماً `uploadFile()` من `@/lib/upload.ts`

### سيناريوهات الخطأ وحلولها
| الخطأ | السبب المحتمل | الحل |
|-------|--------------|------|
| "Bucket not found" | Bucket غير موجود في Supabase | شغّل migration الـ storage |
| "new row violates row-level security" | Policy مفقودة | شغّل migration الـ storage |
| "JWT expired" | انتهت جلسة المستخدم | تسجيل الخروج وإعادة الدخول |
| "Payload too large" | ملف أكبر من الحد المسموح | تصغير الملف أو ضبط الحد |
| "Failed to fetch" | انقطاع الإنترنت | إعادة المحاولة |
| "already exists" (409) | مسار الملف مكرر | استخدم `upsert: true` |

---

## 12. ملاحظات لـ Lovable AI

### ❌ لا تعدّل هذه الملفات:
- `components.json`
- `vite.config.ts`
- `tsconfig.json`
- `eslint.config.js`
- `src/integrations/lovable/`
- `src/router.tsx`
- `src/routeTree.gen.ts` (auto-generated)

### ✅ ملفات UI آمنة للتعديل:
- كل ملفات في `src/routes/` (JSX/UI فقط، لا منطق backend)
- كل ملفات في `src/components/` (لا تعدّل server fns)
- `src/styles.css`

### ✅ ملفات Backend جاهزة للاستخدام:
- `src/lib/production.functions.ts` — مراحل الإنتاج
- `src/lib/upload.ts` — رفع الملفات
- `src/lib/calendar.functions.ts` — التقويم
- `src/components/UploadZone.tsx` — مكوّن الرفع الجاهز

### مبدأ الفصل:
- **Backend/منطق:** ملفات `src/lib/*.ts` و `createServerFn()`
- **Frontend/UI:** ملفات `src/routes/*.tsx` و `src/components/*.tsx`
- **لا تكتب** `supabase.storage.from().upload()` في ملفات routes مباشرة — استخدم `uploadFile()` من `@/lib/upload.ts`
