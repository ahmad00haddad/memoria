## تصحيح لتقييمي السابق

اعتذر — قلتُ سابقاً «17 خطأ TypeScript يمنع build الإنتاج». هذا **غير صحيح**. أعدتُ التحقق الآن:

- `bunx tsgo --noEmit` → ✅ صفر أخطاء
- `bun run build` → ✅ نجح (9.67s)

الحكم الواقعي: **جاهز تقنياً ~75%**. البناء يعمل، لكن هناك ديون أمنية وتحسينات واقعية يجب معالجتها قبل الإطلاق العام.

## المشاكل الحقيقية المتبقية

### 🟠 أمان قاعدة البيانات (30 تحذير linter)
- **~25 دالة `SECURITY DEFINER`** قابلة للاستدعاء من `anon` أو `authenticated` بلا حاجة. بعضها OK (RPCs عامة عن قصد مثل `search_photographers`, `get_booking_by_token`)، لكن يجب مراجعة كل دالة وREVOKE ما لا يحتاج وصولاً عاماً.
- **Extension في `public` schema** — نقل إلى schema مخصّص.
- **RLS مفعّل بلا policy** على جدول واحد (INFO) — إما policy واضحة أو إزالة الجدول.

### 🟠 حماية المسارات
- 4 مسارات محمية بحساسية عالية لا تزال خارج `_authenticated/`:
  - `notifications.tsx`, `onboarding.tsx` (يحتاجان جلسة)
  - `admin.*` عبر layout حراسة role (`has_role('admin')`) — الحالي يعتمد فحصاً في كل ملف

### 🟡 محتوى الإطلاق
- `about.tsx` / `contact.tsx` تحتوي بيانات placeholder (اسم كيان، عنوان، رقم دعم).
- `noreply@memoria.jo` غير مؤكَّد في Resend (SPF/DKIM/DMARC) → إيميلات قد تسقط في السبام.
- `memoria.jo` غير مربوط كنطاق مخصّص في Lovable حتى الآن.

### 🟡 جودة/مراقبة
- لا Sentry ولا PostHog مربوطة → أخطاء الإنتاج ستضيع.
- `bunx vitest` غير مُهيّأ رغم وجود `src/lib/tests/security.test.ts`.
- سلة الحركة ثقيلة: `framer-motion` + `gsap` + `@gsap/react` + `lenis` — GSAP لم يعد مستعملاً بعد اعتمادنا framer-motion.

## الخطة المقترحة (جلسة واحدة → ~90%)

### دفعة 1 — أمان قاعدة البيانات (هجرة واحدة)
1. `REVOKE EXECUTE ... FROM anon, authenticated` على الدوال الإدارية الحساسة (`delete_photographer_cascade`, `admin_renew_subscription`, `admin_set_published`, `restore_photographer`, `soft_delete_photographer`, `approve_review`, `reject_review`, `renew_subscription_paid`, `log_audit`, `refresh_featured_photographers`, `seed_default_shot_list`, `seed_default_whatsapp_templates`، إلخ).
2. إبقاء الوصول العام فقط على: `search_photographers`, `get_booking_by_token`, `is_subscription_active`, `is_photographer_busy`, `get_photographer_busy_dates`, `client_*`, `has_role`.
3. نقل الـ extension من `public` schema.
4. معالجة تحذير «RLS بلا policy».

### دفعة 2 — حراسة المسارات
5. نقل `notifications.tsx` و`onboarding.tsx` تحت `_authenticated/`.
6. إنشاء `_authenticated/admin.tsx` layout يتحقق من `has_role('admin')` وإعادة توجيه غير المخوّلين.

### دفعة 3 — محتوى وثقة
7. تنظيف placeholders في `about.tsx` / `contact.tsx` (أو إضافة شارة «قريباً»).
8. إزالة `gsap` و`@gsap/react` من `package.json` (تنظيف bundle).

### خارج نطاق هذه الجلسة (أقترحها بعدها)
- تأكيد `memoria.jo` في Resend + ربطه كنطاق مخصّص → عمل خارج المحرر.
- تثبيت Sentry + إعداد `vitest.config` → دفعة منفصلة.
- تدوير مفاتيح Supabase مرة أخيرة بعد التأكد من نظافة git.

## النتيجة المتوقعة بعد التنفيذ
- تحذيرات linter: 30 → ≤5
- المسارات المحمية: مركزية تحت `_authenticated/`
- Bundle client أخف بـ ~100KB (إزالة gsap)
- جاهزية واقعية: 75% → ~90%

هل أنفّذ الدفعات الثلاث؟