# خطة التدقيق الشامل لمشروع Memoria

**المخرج الوحيد:** تقرير Markdown مفصّل يُحفظ في `AUDIT_REPORT.md` بجذر المشروع. **لن يتم تعديل أي ملف مصدري أو تشغيل أي هجرة.**

---

## 1. نطاق التدقيق

- **الموقع الحي:** `https://memoria-jo.lovable.app` والمعاينة.
- **الكود:** كل ما في `src/` و `supabase/migrations/` و `public/`.
- **قاعدة البيانات:** فحص RLS، السياسات، والصلاحيات عبر أدوات القراءة فقط.
- **الاستبعاد:** لا فحص لكود خارجي، لا اختبارات تحميل مكثفة، لا اختراق فعلي.

---

## 2. منهجية التنفيذ (7 مراحل متتابعة)

### المرحلة أ — استكشاف بنية المشروع (قراءة فقط)
- قراءة `package.json`, `vite.config.ts`, `tsconfig.json`, `src/router.tsx`, `src/routes/__root.tsx`, `src/start.ts`, `src/server.ts`.
- استخراج قائمة كل المسارات من `src/routes/` وربطها بالرحلات.
- قراءة كل ملفات `src/lib/*.functions.ts` لفهم منطق الأعمال في server functions.

### المرحلة ب — تدقيق UX/UI مباشرة على الموقع
- تشغيل Playwright headless ضد `http://localhost:8080` لالتقاط لقطات لـ:
  - الصفحة الرئيسية `/`
  - `/search`, `/for-clients`, `/for-photographers`, `/pricing`, `/faq`
  - `/login`, `/photographers/join`, `/onboarding`
  - `/dashboard`, `/dashboard/bookings`, `/dashboard/calendar`, `/dashboard/profile`
  - صفحة تتبع عميل `/track/$token` (بأي token موجود)
  - `/photographers/$username` عيّنة
- التقاط لقطات بمقاسين: `375x812` (هاتف) و `1280x900` (ديسكتوب).
- فحص: CTA، الوضوح، التسلسل البصري، الحالات الفارغة، RTL.

### المرحلة ج — تدقيق بنية المعلومات والتنقل
- رسم شجرة المسارات فعلياً من `routeTree.gen.ts`.
- تقييم `MobileBottomNav`, `Header`, `Footer` للاتساق والاكتمال.
- كشف الصفحات اليتيمة أو المكررة أو الروابط المكسورة.

### المرحلة د — تدقيق الأداء والاستجابة وإمكانية الوصول
- فحص `Network` عبر Playwright: حجم الحزم، طلبات مبدئية، صور غير محسّنة.
- فحص Lighthouse-like يدوي: `Largest Contentful Paint`، خطوط `@fontsource`، `lazy loading`.
- فحص a11y أساسي: contrast، `alt`، `aria-label`، بنية العناوين.
- اختبار عيّنة صفحات على 3 مقاسات (`375`, `768`, `1280`).

### المرحلة هـ — تدقيق المنطق الوظيفي والأمان
- **قاعدة البيانات:** تشغيل `supabase--linter` و `security--get_scan_results` و `supabase--read_query` لفحص:
  - جداول بلا RLS.
  - سياسات مفرطة الصلاحية (خصوصاً `bookings`, `profiles`, `photographer_private`, `payment_events`, `subscription_payments`).
  - `GRANT` مفقودة على جداول public.
  - أعمدة حساسة معرّضة (bank_info, cliq_alias, phone).
- **Server Functions:** مراجعة كل `*.functions.ts` بحثاً عن:
  - غياب `requireSupabaseAuth` على عمليات كتابة.
  - غياب Zod validation.
  - استخدام `supabaseAdmin` دون فحص صلاحية.
- **Webhooks:** فحص `src/routes/api/public/hooks/*` لسلامة التحقق من التوقيع (payment, ical, email-reminders).
- **حالات حدّية:** double booking، race conditions في الحجز، انتهاء token، refund policy.
- **CSP و Headers:** مراجعة `src/server.ts` والتأكد من صرامتها الفعلية.

### المرحلة و — تدقيق الجاهزية للنشر
- فحص متغيرات البيئة، إعدادات `wrangler.jsonc`، `supabase/config.toml`.
- فحص `public/sw.js`, `manifest.webmanifest`, `robots.txt`, `sitemap.xml`.
- فحص SEO لكل route: `head()`, `og:image`, JSON-LD.
- فحص وجود اختبارات ومراقبة أخطاء (Sentry/analytics).
- فحص `email.server.ts` و `whatsapp.server.ts` لتحمّل الفشل.

### المرحلة ز — تدقيق جاهزية PWA (بدل تطبيقات أصلية)
- فحص `sw.js`: استراتيجية الكاش، offline fallback، تحديث النسخة.
- فحص `manifest.webmanifest`: أيقونات، shortcuts، display mode.
- تقييم قابلية التثبيت (`beforeinstallprompt` مدار في `__root.tsx`).
- توصيات لتحسين تجربة PWA بدل الانتقال إلى Native.

---

## 3. هيكل التقرير النهائي `AUDIT_REPORT.md`

```text
1. ملخص تنفيذي
   - حالة المشروع
   - أهم 5 مخاطر
   - قرار الجاهزية للنشر: جاهز / جاهز بشروط / غير جاهز
   - قرار جاهزية PWA
2. فهم المنتج والسياق
3. نتائج التدقيق حسب المحاور الستة
   3.1 UX/UI          — عيوب + أدلة (لقطات) + حلول
   3.2 IA والتنقل     — عيوب + خرائط + حلول
   3.3 الأداء/a11y/الاستجابة
   3.4 المنطق والأمان — أخطر قسم
   3.5 الجاهزية للنشر
   3.6 جاهزية PWA
4. جدول بطاقات العيوب (مصفوفة كاملة)
5. خارطة طريق مرحلية
   - Quick Wins (1-3 أيام)
   - قصير المدى (1-2 أسبوع)
   - هيكلي
6. الملاحق: لقطات الشاشة تحت /tmp/browser/audit/
```

### صيغة بطاقة العيب الواحدة
```text
[#ID] [المحور] [الشدة: حرج/عالٍ/متوسط/منخفض]
العنوان: ...
المكان: مسار/ملف:سطر
الوصف: ...
الدليل: لقطة أو مقتطف كود
الأثر: ...
السبب المرجح: ...
الحل المقترح: خطوات ملموسة
الجهد التقديري: سريع/متوسط/هيكلي
```

---

## 4. الأدوات المستخدمة (قراءة فقط)

- `code--view`, `code--list_dir`, `rg` عبر `code--exec` (بدون تعديل).
- Playwright headless للقطات وقياس الأداء.
- `supabase--read_query`, `supabase--linter`.
- `security--get_scan_results`, `security--run_security_scan`.
- `seo_chat--trigger_scan` ثم `seo_chat--list_findings`.

---

## 5. التسليم

- ملف واحد: `AUDIT_REPORT.md` بجذر المشروع.
- مجلد لقطات: `/tmp/browser/audit/*.png` (مرجعية داخلية، غير مضمومة للريبو).
- في نهاية التقرير: **حكم صريح** على الجاهزية للنشر وجاهزية PWA، مع قائمة أعلى 10 إصلاحات مرتبة بالأولوية.

**لن يتم أي تعديل على الكود، الهجرات، الأسرار، أو الإعدادات في هذه الجولة.** إذا رغبت لاحقاً بتنفيذ الإصلاحات، نبدأ جولة بناء منفصلة بعد اعتمادك للتقرير.
