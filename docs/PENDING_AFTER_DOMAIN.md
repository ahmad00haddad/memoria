# معلّق لحد شراء الدومين (آخر تحديث 2026-11-04)

## المشكلة
- الإنتاج: `EMAIL_FROM=onboarding@resend.dev` (مرسل تجريبي من Resend، بيوصل فقط لصاحب حساب Resend، مش لأي عروس). مكانه `wrangler.jsonc` سطر 14.
- ما في أي متغير `WHATSAPP_*` بالإنتاج (`npx wrangler secret list` + `wrangler.jsonc`). المطلوب لو بدنا واتساب: `WHATSAPP_PUBLIC_NUMBER`, `WHATSAPP_API_TOKEN`, `WHATSAPP_PHONE_ID`, `WHATSAPP_APP_SECRET`.
- النتيجة: رموز التأكيد ما بتوصل، فـ `submitBookingRequest` (src/lib/booking.functions.ts) بيستدعي `markBookingVerified(id, "auto")` = **الطلب يتأكد تلقائياً بدون أي تحقق**. وكمان رمز الـ OTP تبع الإلغاء/الملاحق (src/lib/stepup.server.ts) ما بيوصل، فالعروس بتشوف "راسلي فريق ميموريا".
- قرار أحمد: المشروع تجريبي (prototype)، الاسم ممكن يتغير، الدومين بينشترى قبل جلب المصوّرات فعلياً.

## الحل لما يتوفر دومين
1. وثّق الدومين بـ Resend (سجلات DNS) وغيّر `EMAIL_FROM` بـ wrangler.jsonc، ثم `npx vite build` + `git push` + `npx wrangler deploy` (حسب ذاكرة push-after-work).
2. جرّب: حجز جديد ← وصول رمز الإيميل؛ إلغاء بعد عربون ← وصول OTP (`StepUpBox`).
3. (اختياري) واتساب: اضبط المتغيرات أعلاه.
4. ابنِ **كلمة سر رابط المتابعة** (اتفقنا على التصميم):
   - أول دخول للعروس: شاشة "اختاري كلمة سر سهلة، ولا تخبري المصوّرة". إذا المصوّرة فتحت أول مرة بتظهر لها رسالة إنها للعروس.
   - الكلمة تتخزن **مشفّرة (PBKDF2+salt) بجدول منفصل `booking_track_auth`** (RLS بدون policies)، **مش على جدول bookings** (المصوّرة بتقرأ bookings وممكن تكسرها offline).
   - البوابة على مستوى الخادم: كوكي httpOnly موقّع (HMAC بمفتاح `SUPABASE_SERVICE_ROLE_KEY`) بعد التحقق؛ دالة `assertTrackAccess(token)` تُستدعى بكل دوال الرابط: getBookingByToken (ترجع `locked` + وضع set/enter)، clientCancelBooking، respondAddendum، clientMarkReceived، clientMarkDepositSent، clientAddNote، submitReviewByToken، saveEventDayInfo، clientEditDetails، sendMessageByToken/getMessagesByToken، getGalleryByToken. حدّ محاولات 8/ساعة.
   - نسيان/تغيير الكلمة: رمز على **إيميل العروس** (استعمل `issueStepUpCode` بغرض جديد `reset`)، مش إرسال الكلمة نفسها. بنفس الطريقة تسترجع العروس لو المصوّرة سبقتها وحطت كلمة.
   - تنطبق فقط حيث `stepUpApplies(bk)` (حجز غير يدوي وفيه إيميل).
   - **رمز الإيميل للإلغاء/الملاحق بيضل** كطبقة ثانية (الحجوزات القديمة + لو العروس شاركت الكلمة).
   - بديل بدون دومين: ربط تيليغرام للعروس (البوت موجود، `TELEGRAM_BOT_TOKEN`) — أصعب على العروس.

## اللي انعمل بتدقيق الإساءة (2026-11-04) — مرجع
- التفاصيل والجداول: `docs/bride-photographer-scenarios.md` القسم 20.
- migration مطبّقة على الإنتاج: `supabase/migrations/20261104140000_abuse_hardening.sql` (ملاحظة: نسخة الإنتاج بدون حقل `policy_source` بالـ audit، لا يؤثر).
- ملفات: `src/lib/abuse.server.ts` (حدود معدّل + IP)، `stepup.server.ts`/`stepup.functions.ts`، `src/components/StepUpBox.tsx`، trigger `aa_guard_booking_direct_updates` (36 عمود محمي)، لقطة سياسة الاسترداد، منع تقييم الحجز اليدوي.
- مفتوح بقرار: إخفاء `client_tracking_token` عن المصوّرة (الجذر)؛ تقييم الحجز اليدوي ممنوع (فقط عروسات حقيقيات عبر المنصة، قرار أحمد).
- جلسة ثانية كانت تعمل على: reports الصفحات، الإلغاء التلقائي بدون إيصال؛ تأكّد إن migrations `20261104120000_profile_reports.sql` و`20261104130000_no_deposit_autocancel.sql` مطبّقة بالإنتاج.
