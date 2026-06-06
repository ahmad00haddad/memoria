
سأنفذ كل ميزة في طبقة قاعدة بيانات + واجهة. سأبدأ بالأبسط أثراً وأنتهي بمزامنة Google.

## 1) حجز بالساعات (Hour-based slots)

الحجوزات الحالية فيها `start_time` و `end_time` لكن التقويم يحجب اليوم كاملاً.

**التغييرات:**
- في `dashboard.calendar.tsx`: عرض الحجوزات بالساعة (مثلاً "10:00–14:00 — مريم")، مع إمكانية وجود عدة حجوزات في نفس اليوم.
- في `photographers/$username.tsx` (تقويم الزبون): اليوم يصبح "مزدحم" بدل "محجوب" لو فيه فراغ كافٍ. عرض شريط Time-slots للساعات المحجوزة، والسماح باختيار وقت متاح.
- التحقق من التعارض بين `start_time/end_time` المطلوب وأي حجز موجود قبل الإرسال (وإلا خطأ "هذا الوقت محجوز").
- إضافة حقل `min_session_minutes` في `profiles` (افتراضي 60) كحد أدنى لكل جلسة.

## 2) نظام رسائل منظم + سجل كامل

**قاعدة البيانات:**
- إضافة `read_at timestamptz` و `attachment_url text` لجدول `messages`.
- realtime publication على `messages` (موجودة جزئياً).

**الواجهة:**
- في صفحة الحجز (`dashboard.bookings.$id.tsx` وللزبون): محادثة حية مع scroll تلقائي، شارة "غير مقروء"، طابع زمني، تمييز رسائلي/رسائله.
- شارة العدّاد في الـ Header لإجمالي الرسائل غير المقروءة.
- إنشاء إشعار تلقائي (`notifications` insert) للطرف الآخر عند كل رسالة جديدة عبر trigger.

## 3) لوحة متابعة الإنتاج

**قاعدة البيانات على جدول `bookings`:**
- `production_stage text default 'awaiting'` — قيم: `awaiting` (قبل التصوير) / `shooting` (يوم الجلسة) / `selecting` (اختيار الصور) / `editing` (تحرير) / `ready` (جاهز للتسليم) / `delivered`.
- `editing_started_at`, `editing_completed_at`, `selection_link text` (رابط Pixieset/Drive).

**الواجهة:**
- صفحة جديدة `dashboard.production.tsx`: Kanban بأعمدة المراحل، مع سحب البطاقة بين المراحل (أو أزرار Next/Back).
- على بطاقة الحجز: شريط تقدم + ETA حسب `delivery_due_at`.
- شاشة الزبون في صفحة الحجز: شريط تقدم مبسط ("قيد التحرير - متبقي 12 يوم").

## 4) مزامنة Google Calendar (طريقة عملية بلا OAuth)

OAuth لكل مصورة معقد ويحتاج إعداد Google Cloud Console. أقترح طريقة ثنائية الاتجاه أبسط بكثير:

**اتجاه أ — مواعيدنا تظهر في Google:**
- الكود يدعمها فعلاً: ملف `/api/public/ical/$token` يصدّر iCal feed لكل مصورة.
- نضيف في `dashboard.calendar.tsx` زر "إضافة إلى Google Calendar" مع رابط `https://calendar.google.com/calendar/r?cid=webcal://...` + تعليمات بالعربي.
- Google يحدّث كل ~12 ساعة تلقائياً، فأي حجز جديد يظهر عندها.

**اتجاه ب — مواعيد Google تحجب عندنا:**
- نضيف حقل `external_ical_url text` في `profiles`.
- المصورة تنسخ "Secret iCal URL" من إعدادات Google Calendar وتلصقه عندنا.
- Server function تجلب الـ iCal كل ساعة (أو on-demand عند تحميل التقويم) وتُدرج الفعاليات كـ `photographer_unavailability` مع `reason = 'Google: <اسم الحدث>'`.

هذا حل مجاني، خصوصي، ولا يحتاج موافقة المستخدم على scopes حساسة. إن أصرّت على OAuth كامل لاحقاً نضيفه.

## ملفات ستتعدل/تُضاف

- migration: أعمدة جديدة على `bookings`, `messages`, `profiles` + trigger للإشعارات + realtime على messages.
- `src/routes/dashboard.calendar.tsx`: عرض بالساعة + زر Google sync + حقل iCal خارجي.
- `src/routes/dashboard.production.tsx` (جديد): لوحة Kanban.
- `src/routes/dashboard.bookings.$id.tsx`: شريط مراحل الإنتاج + محادثة محسّنة + أزرار تغيير المرحلة.
- `src/routes/photographers/$username.tsx`: time slots بدل اليوم الكامل + تحقق تعارض.
- `src/components/site/Header.tsx`: شارة الرسائل غير المقروءة.
- `src/lib/ical-sync.functions.ts` (جديد): جلب iCal الخارجي ومزامنته.

أبدأ بالـ migration ثم الواجهات. سأمضي إذا وافقت.
