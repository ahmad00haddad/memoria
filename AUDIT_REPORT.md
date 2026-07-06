# تقرير التدقيق الشامل — مشروع Memoria (ميموريا)

**تاريخ التقرير:** 2026-07-06
**النطاق:** الموقع الحي (`memoria-jo.lovable.app`) + المستودع الكامل
**نوع التقرير:** تدقيق فقط — لم يُعدَّل أي ملف

---

## 1. الملخص التنفيذي

**Memoria** منصة أردنية RTL لحجز مصوّرات المناسبات، مبنية على TanStack Start + Supabase (Lovable Cloud) مع PWA وإشعارات وتقويم iCal ودفع CliQ. المشروع ناضج وظيفياً (48 هجرة، 54 route، ~15k سطر) لكن يحمل **عيوباً حرجة تمنع الإطلاق الآن**.

### قرار الجاهزية

| المحور | القرار |
|---|---|
| **الجاهزية للنشر** | 🔴 **غير جاهز حالياً** — أخطاء TypeScript تمنع البناء + جدول `booking_disputes` بلا حماية `WITH CHECK` كافية |
| **جاهزية PWA** | 🟡 **جاهز بشروط** — service worker موجود لكن يحتاج مراجعة استراتيجية الكاش |

### أعلى 5 مخاطر

1. **🔴 حرج — 6 أخطاء TypeScript تمنع `bun run build`** (تفاصيل في §3.4).
2. **🔴 حرج — `booking_disputes.INSERT` بلا فحص `WITH CHECK`** يسمح لأي مستخدم مسجّل بإنشاء نزاع باسم أي شخص.
3. **🟠 عالٍ — تسريب معلومات في `recover.functions.ts`** عبر SQL injection محتمل في `.or()` مع قيمة مستخدم غير مُهرّبة.
4. **🟠 عالٍ — CSP يسمح بـ `'unsafe-inline' 'unsafe-eval'`** في `src/server.ts` — يبطل معظم فائدة CSP.
5. **🟠 عالٍ — `og:image` معرّف في `__root.tsx`** يتجاوز صور OG الخاصة بكل صفحة (مخالف لتعليمات TanStack Start).

---

## 2. فهم المنتج والسياق

- **المستخدمون:** عرائس/عائلات (عملاء) + مصوّرات محترفات (بائعات) + أدمن.
- **القيمة الأساسية:** حجز موثّق بعقد رقمي وعربون CliQ، بديل عن فوضى الواتساب.
- **المهام الأساسية:** بحث → معاينة ملف مصوّرة → طلب حجز → تحويل عربون → تأكيد → استلام صور → تقييم.
- **الجمهور:** الأردن، عربي RTL، جوال أولاً.

---

## 3. نتائج التدقيق حسب المحاور

### 3.1 UX/UI

| # | الشدة | الوصف | الحل |
|---|---|---|---|
| U1 | متوسط | الصفحة الرئيسية `/` تحمّل `featured` فوراً في `useEffect` بدل loader → وميض محتوى | نقل الجلب إلى `loader` مع `ensureQueryData` كما توصي وثائق TanStack |
| U2 | متوسط | `MobileBottomNav` يستعلم عن `notifications` في كل تغيير مسار → مكالمات مكررة | استخدام Realtime subscription واحد أو React Query مع `staleTime` |
| U3 | منخفض | استخدام مبالغ فيه لـ `framer-motion` (`LazyMotion` + `AnimatePresence` + `motion.div` في كل صفحة) → تكلفة CPU على الأجهزة الضعيفة | تقليل الحركات على `prefers-reduced-motion` (موجود جزئياً في Lenis فقط) |
| U4 | منخفض | Lenis smooth-scroll مفعّل على كل الصفحات بما فيها الداشبورد | تعطيله على مسارات `/dashboard/*` — لا يخدم UX الإداري |
| U5 | متوسط | زر "احجزي الآن" الرئيسي غير مميّز عن الأزرار الثانوية بصرياً في `hero` | زيادة تباين CTA الأساسي |
| U6 | منخفض | لا حالات فارغة رسمية لكثير من صفحات الداشبورد الفارغة (`/dashboard/bookings` بلا حجوزات) | إضافة `EmptyState` component موحّد |

### 3.2 بنية المعلومات والتنقل

| # | الشدة | الوصف | الحل |
|---|---|---|---|
| I1 | عالٍ | لا يوجد layout `_authenticated/` رغم وجود ~14 مسار داشبورد — التنقل بلا حراسة مركزية | إنشاء `src/routes/_authenticated/route.tsx` ونقل مسارات الداشبورد تحته |
| I2 | متوسط | التداخل بين `dashboard.bookings.tsx` و`dashboard.bookings.index.tsx` و`dashboard.bookings.$id.tsx` يجعل التنقل غامضاً | توحيد التسميات وتوثيق الـ Outlets |
| I3 | متوسط | مسارات الأدمن `admin.*` بدون طبقة حماية مركزية `_admin/` | فحص role في كل مسار أدمن على حدة (هش) → استخدام layout واحد |
| I4 | منخفض | مسار `/app` مبهم الوظيفة (تثبيت PWA؟) — لا يظهر في التنقل الرئيسي | إعادة تسميته `/install` أو ربطه من الفوتر |
| I5 | منخفض | لا breadcrumbs في الداشبورد رغم عمق التنقل | إضافة breadcrumbs بسيطة على `md+` |

### 3.3 الأداء وإمكانية الوصول والاستجابة

| # | الشدة | الوصف | الحل |
|---|---|---|---|
| P1 | عالٍ | استيراد `framer-motion` + `gsap` + `@gsap/react` + `lenis` معاً — تكرار وظيفي وتضخم bundle | اختيار مكتبة حركة واحدة (framer-motion كافية) وإزالة gsap |
| P2 | عالٍ | خطوط `@fontsource-variable/cairo` و`playfair-display` تُحمَّل بدون subset عربي محدد | استخدام `@fontsource-variable/cairo/arabic.css` فقط |
| P3 | متوسط | صورة `heroImg` مستوردة من `@/assets/hero-bride.jpg` بدون `srcset` أو WebP | تحويل إلى `<picture>` مع WebP/AVIF |
| P4 | متوسط | لا `alt` معنوي على الصور المرفوعة (avatar/cover) | إضافة alt من `display_name` |
| P5 | متوسط | تباين ألوان `text-muted-foreground` على `bg-background` قد يفشل WCAG AA على الوضع الفاتح | فحص عبر أداة contrast |
| P6 | منخفض | لا مؤشرات focus مرئية على أزرار مخصصة (`btn-charcoal`) | إضافة `focus-visible:ring` |

### 3.4 المنطق والأمان — **أهم قسم**

#### 3.4.1 أخطاء تمنع البناء (🔴 حرج)

`bun run build` يفشل حالياً بـ 6 أخطاء TypeScript:

```
src/lib/recover.functions.ts:20     — status "pending" غير موجود في enum booking_status
src/lib/recover.functions.ts:57     — sendEmail يتطلب حقل template
src/routes/dashboard.bookings.$id.tsx:62-63  — deposit_proof_url على SelectQueryError (استعلام items مكسور)
src/routes/recover.tsx:40           — استدعاء useServerFn بمعطى غير مغلّف بـ { data: ... }
src/routes/search.tsx:421           — تمرير prop `title` لأيقونة Lucide (غير مدعوم)
```

**السبب الجذري:** جولات الإصلاح السابقة أنشأت `recover.functions.ts` و`recover.tsx` بدون محاذاة مع types المولّدة.

#### 3.4.2 مشاكل RLS/DB (🔴 / 🟠)

| # | الشدة | الوصف |
|---|---|---|
| S1 | 🔴 حرج | `booking_disputes` سياسة INSERT بلا `WITH CHECK` → أي مستخدم مسجّل يستطيع إدخال نزاع باسم booking لا يملكه. **الإصلاح:** `WITH CHECK (EXISTS (SELECT 1 FROM bookings WHERE id = booking_id AND (photographer_id = auth.uid() OR client_user_id = auth.uid())))` |
| S2 | 🟠 عالٍ | `messages` سياسة INSERT بلا `WITH CHECK` → إمكانية انتحال sender أو حقن رسالة في booking أجنبي |
| S3 | 🟠 عالٍ | `photographer_private.INSERT` بلا `WITH CHECK` (رغم أن الجدول تلقائي عبر trigger) |
| S4 | 🟠 عالٍ | 27 دالة `SECURITY DEFINER` قابلة للاستدعاء من `anon` أو `authenticated` بلا REVOKE — بعضها حسّاس (`delete_photographer_cascade` محمي داخلياً لكن `get_photographer_busy_dates` تعرّض تواريخ خاصة) |
| S5 | 🟠 عالٍ | امتداد PostgreSQL مثبّت في schema `public` (WARN من linter) |
| S6 | متوسط | جدول لديه RLS مفعّل بلا أي policy (INFO من linter) — قابل للقراءة/الكتابة صفر → لكن قد يكسر ميزة |

#### 3.4.3 مشاكل Server Functions

| # | الشدة | الوصف |
|---|---|---|
| F1 | 🟠 عالٍ | `recover.functions.ts` يبني `.or()` بـ template literal مع قيمة مستخدم:  \``client_email.eq."${val}",client_phone.eq."${val}"`\` — يسمح بحقن PostgREST filter (مثلاً `"; and false; --`). **الإصلاح:** استخدام `.or()` مع escape أو استعلامين منفصلين |
| F2 | 🟠 عالٍ | `recover.functions.ts` يستخدم `supabaseAdmin` لقراءة عامة → مخالف لقاعدة "لا تستعمل service_role للقراءات العادية" |
| F3 | متوسط | معظم `*.functions.ts` بلا Zod validation — `inputValidator` يتحقق يدوياً فقط |
| F4 | متوسط | `payments.functions.ts` webhook يعتمد على `_serverFn` بدلاً من server route → مخالف للتعليمات (webhooks = server routes) |
| F5 | متوسط | تكرار كتلة `import { supabaseAdmin } = await import(...)` في كل server fn — جيّد بحد ذاته لكن يشير لحاجة helper مركزي |

#### 3.4.4 CSP وHeaders

| # | الشدة | الوصف |
|---|---|---|
| H1 | 🟠 عالٍ | CSP يسمح `'unsafe-inline' 'unsafe-eval'` في script-src — يبطل الحماية من XSS. سببه GA inline snippet. **الإصلاح:** nonce أو hash |
| H2 | متوسط | لا `frame-ancestors 'none'` في CSP (رغم وجود X-Frame-Options) |
| H3 | متوسط | HSTS مشروط على `NODE_ENV=production` قد لا يُعيَّن في Cloudflare Workers → لن يُرسَل HSTS أبداً |
| H4 | منخفض | `Permissions-Policy` يسمح geolocation=(self) — تأكدي أن الميزة مطلوبة فعلاً |

#### 3.4.5 حالات حدّية

- **Double booking:** محميّ عبر `pg_advisory_xact_lock` في `create_booking_guarded` ✅
- **Race على العربون:** `confirm_booking_deposit_paid` يقرأ ثم يكتب بدون قفل صريح → إذا وصل webhookان متزامنان قد يتضاعف — لكن `deposit_confirmed_at` guard يخفف الأثر
- **انتهاء token:** `token_expires_at` محسوب لكن لا cleanup job لإعادة توليد
- **Refund policy:** `cancel_booking` يحسب استرداد لكن لا يُنفَّذ فعلياً — يسجّل `refund_status='pending'` فقط ✅ (متعمّد)

### 3.5 الجاهزية للنشر

| # | الشدة | الوصف | الحل |
|---|---|---|---|
| D1 | 🔴 حرج | البناء يفشل — لا يمكن النشر أصلاً | إصلاح أخطاء §3.4.1 |
| D2 | 🟠 عالٍ | لا `README.md` تشغيلي، `ROADMAP.md` فقط | كتابة README مع خطوات محلية + متغيرات بيئة |
| D3 | 🟠 عالٍ | لا اختبارات (`bunx vitest` غير مُهيَّأ) | إضافة smoke tests للمسارات الحرجة على الأقل |
| D4 | 🟠 عالٍ | لا مراقبة أخطاء (Sentry/PostHog) — `error-capture.ts` يلتقط داخلياً فقط | ربط Sentry أو Cloudflare Workers Analytics |
| D5 | متوسط | GA measurement ID = `G-XXXXXXXXXX` (placeholder) في `__root.tsx` | ضبط `VITE_GA_MEASUREMENT_ID` أو إزالة السكربت |
| D6 | متوسط | `og:image` معرّف على الجذر — يتجاوز og:image خاص بكل صفحة (مخالف صريح لتعليمات المنصة) | نقله إلى leaf routes فقط |
| D7 | متوسط | `sitemap.xml.ts` و`robots.txt.ts` موجودان — تحقّقي من التحديث الديناميكي للمصوّرات الجدد | مراجعة query داخلهما |
| D8 | منخفض | `EMAIL_FROM=noreply@memoria.jo` — تأكدي من إعداد SPF/DKIM/DMARC للنطاق في Resend |

### 3.6 جاهزية PWA

| # | الشدة | الوصف | الحل |
|---|---|---|---|
| W1 | متوسط | `public/sw.js` (193 سطر) يدوي بدل vite-plugin-pwa — عرضة للbugs في تحديث النسخة | مراجعة استراتيجية cache-first vs network-first لكل نوع أصل |
| W2 | متوسط | `manifest.webmanifest` — تحقّقي من `id`, `start_url`, `scope`, `display:standalone` كلّها موجودة وقيمها ثابتة (لا تتغير بعد التثبيت) |
| W3 | منخفض | لا shortcuts في manifest (روابط سريعة: حجوزاتي/إشعارات) — تحسين UX التثبيت |
| W4 | منخفض | `beforeinstallprompt` يُلتقط لكن لا يوجد UI ترويج للتثبيت في الوقت المناسب — فقط `/app` |
| W5 | متوسط | لا استراتيجية push notifications رغم وجود `NotificationPermission.tsx` — الميزة نصف مكتملة |

---

## 4. مصفوفة العيوب مرتّبة بالأولوية

### 🔴 حرج (يمنع الإطلاق) — 3 عيوب

| ID | العنوان | الجهد |
|---|---|---|
| D1 | أخطاء TypeScript تمنع البناء (6 ملفات) | سريع (1-2 ساعة) |
| S1 | `booking_disputes.INSERT` بلا `WITH CHECK` | سريع (هجرة قصيرة) |
| H1 (جزئي) | CSP `unsafe-eval` يفتح XSS كامل | متوسط |

### 🟠 عالٍ (قبل الإطلاق العام) — 12 عيباً

I1, I3, P1, P2, S2, S3, S4, S5, F1, F2, H1, D2, D3, D4

### 🟡 متوسط — 17 عيباً
### ⚪ منخفض — 10 عيوب

---

## 5. خارطة الطريق التنفيذية

### أ. Quick Wins (1-3 أيام) — قبل أي إطلاق

1. **إصلاح أخطاء TypeScript الست** — بدونها لا build.
2. **هجرة أمان:**
   - إضافة `WITH CHECK` لسياسات INSERT على `booking_disputes`, `messages`, `photographer_private`.
   - `REVOKE EXECUTE ... FROM anon` على دوال SECURITY DEFINER الحساسة.
3. **إزالة `unsafe-eval`** من CSP وتحويل GA snippet إلى ملف خارجي أو nonce.
4. **نقل `og:image` من `__root.tsx`** إلى leaf routes.
5. **ضبط `VITE_GA_MEASUREMENT_ID`** أو إزالة سكربت GA.
6. **إصلاح `recover.functions.ts`:** استبدال `supabaseAdmin` بـ publishable client + escape المدخلات.

### ب. قصير المدى (1-2 أسبوع)

1. **layout `_authenticated/`** ونقل مسارات الداشبورد تحته.
2. **layout `_admin/`** بفحص `has_role('admin')` مركزي.
3. **إزالة gsap** والاعتماد على framer-motion فقط.
4. **Subset خط عربي** — تخفيض حجم الحزمة.
5. **إضافة README** ومراقبة أخطاء (Sentry أو ما يعادل).
6. **Zod schemas** لكل server functions.
7. **Empty states** موحّدة.

### ج. هيكلي (قبل التوسّع)

1. **اختبارات E2E** بـ Playwright للمسارات الحرجة (حجز، عربون، تسليم).
2. **مراجعة كل SECURITY DEFINER function** — تحويل ما يمكن إلى INVOKER أو تضييق GRANT.
3. **فصل webhooks عن server functions** — نقل payment/ical webhooks إلى server routes بحسب المعايير.
4. **بناء design tokens** موحّد يسهّل تحويلاً لاحقاً إلى React Native.
5. **تفعيل push notifications** أو إزالة نصف الميزة.

### د. PWA (بديل Native حالياً — كافٍ)

1. مراجعة `sw.js` — تبنّي network-first للـ HTML وcache-first للأصول hashed.
2. إضافة shortcuts للـ manifest.
3. UI مدروس للـ install prompt.

---

## 6. الحكم النهائي

### الجاهزية للنشر: 🔴 **غير جاهز حالياً**

**الشروط الدقيقة للانتقال إلى "جاهز بشروط":**
- ✅ نجاح `bun run build` بلا أخطاء
- ✅ إغلاق S1 (WITH CHECK على booking_disputes)
- ✅ إغلاق F1+F2 (recover injection + admin misuse)
- ✅ إزالة `'unsafe-eval'` من CSP
- ✅ ضبط GA أو إزالته
- ✅ ضبط SPF/DKIM لنطاق البريد

بعد ذلك يمكن اعتباره **"جاهزاً بشروط"** لإطلاق تجريبي مغلق (beta). للإطلاق العام: إغلاق كل عناصر §5.أ + معظم §5.ب.

### جاهزية PWA: 🟡 **جاهز بشروط**

PWA يكفي حالياً كبديل عن تطبيقات هاتف أصلية. لا حاجة لـ React Native في هذه المرحلة. يوصى بتحسينات §5.د خلال الشهر الأول من الإطلاق.

### أعلى 10 إصلاحات مرتبة

1. 🔴 D1 — إصلاح أخطاء TypeScript
2. 🔴 S1 — WITH CHECK على booking_disputes
3. 🔴 H1 — إزالة unsafe-eval من CSP
4. 🟠 F1 — إصلاح حقن PostgREST في recover
5. 🟠 F2 — استبدال supabaseAdmin بـ publishable في recover
6. 🟠 S2/S3 — WITH CHECK على messages + photographer_private
7. 🟠 S4 — REVOKE على دوال SECURITY DEFINER الحساسة
8. 🟠 D6 — نقل og:image من الجذر
9. 🟠 I1 — layout _authenticated/
10. 🟠 P1 — إزالة gsap (تكرار مع framer-motion)

---

**نهاية التقرير.** جاهز لبدء جولة إصلاح فور موافقتك، ويمكن البدء بـ Quick Wins فقط (1-3 أيام) للوصول إلى حالة قابلة للنشر.