# بعد شراء الدومين: مشكلة الإيميلات وكل ما يتغيّر معها

> **الحالة (2026-11-04):** ميموريا نسخة تجريبية (prototype) على
> `https://memoria-production.ahmad000haddad.workers.dev`. ما في دومين بعد، واسم البزنس ممكن يتغيّر.
> هالملف يشرح المشكلة وكيف تنحل خطوة خطوة لما ينشرى الدومين. **لازم ينحل قبل ما نجيب مصوّرات أو عرايس حقيقيات.**

---

## 1. المشكلة

الإيميلات بتنبعت عن طريق **Resend** من العنوان التجريبي `onboarding@resend.dev`
(المتغيّر `EMAIL_FROM` في `wrangler.jsonc`).

عنوان Resend التجريبي **بيوصل بس لإيميل صاحب حساب Resend** (`ahmad000haddad@gmail.com`).
أي إيميل لغيره بيفشل بالخطأ:

```
You can only send testing emails to your own email address (ahmad000haddad@gmail.com).
```

بآخر أسبوعين (لحد 2026-11-04): 11 إيميل فشل و 6 وصلوا (اللي وصلوا كانوا لأحمد نفسه).
للتأكد بأي وقت (Supabase SQL editor، مشروع الإنتاج `qrpkfanblpjiqgkufnrb`):

```sql
select status, left(coalesce(error,''),90) as err, count(*)
from email_log where created_at > now() - interval '14 days'
group by 1,2 order by 3 desc;
```

### شو بيتعطّل بسببها (لأي عروس أو مصوّرة غير أحمد)

| المكان | شو بيصير هلأ | الكود |
|---|---|---|
| رمز تأكيد طلب الحجز | ما بيوصل. ولأن الواتساب كمان مش مضبوط، الطلب **بيتأكد تلقائياً** (`verified_via = 'auto'`) بدون أي تحقق | `src/lib/booking.functions.ts` (`markBookingVerified(row.id, "auto")`) |
| رموز الأمان للعروس (step-up OTP) | ما بتوصل ← العروس **ما بتقدر تلغي حجز فيه عربون، ولا توافق على ملحق فيه مبلغ**. بتشوف "تعذّر إرسال الرمز… راسلي فريق ميموريا" | `src/lib/stepup.server.ts` |
| إيميلات العروس كلها | موافقة المصوّرة، تذكيرات العربون، تذكير قبل العرس، المتبقي، التسليم، الملاحق، الإلغاء | `src/lib/notify.server.ts`، `src/lib/email.server.ts`، `src/routes/api/public/hooks/*` |
| إيميلات المصوّرة | طلب جديد، "جاهزة للموعد؟"، "مرّت 48 ساعة بدون إيصال"، **تنبيه تغيّر طرق الدفع** (حماية الحساب المخترق) | `booking-deadlines.ts`، `email-reminders.ts` |
| تنبيهات الإدارة | بلاغات الصفحات ودفعات الاشتراك بتوصل لأن الأدمن = أحمد (ما بتتأثر) | `profile-reports.functions.ts`، `admin-alerts.functions.ts` |

> الإشعارات داخل الموقع (notifications) وتيليجرام للمصوّرات **شغّالين**. المشكلة بالإيميل بس.

---

## 2. الحل (بالترتيب)

### أ) شراء الدومين
- لما يتثبّت اسم البزنس. أمثلة: `memoria.jo` أو `getmemoria.com`.
- أي مزوّد (Namecheap، Cloudflare Registrar، GoDaddy…). **Cloudflare Registrar أسهل** لأن الموقع أصلاً على Cloudflare Workers.

### ب) توثيق الدومين بـ Resend (هاد اللي بيحل الإيميلات)
1. ادخل https://resend.com/domains ← **Add Domain** ← اكتب الدومين (أو subdomain متل `mail.memoria.jo`).
2. Resend بيعطيك 3–4 سجلات DNS (SPF من نوع `TXT`، وDKIM من نوع `TXT`/`CNAME`، و`MX` اختياري للـ bounce).
3. ضيفهم عند مزوّد الدومين (Cloudflare → DNS → Add record). **خلّي الـ CNAME بدون Proxy (رمادي).**
4. ارجع لـ Resend واضغط **Verify**. ممكن ياخد من دقائق لساعات.
5. (مستحسن) ضيف سجل DMARC: `TXT` على `_dmarc` بقيمة `v=DMARC1; p=none;`، حتى ما تروح الإيميلات للسبام.

### ج) تغيير عنوان الإرسال بالكود
في `wrangler.jsonc` → `vars`:

```jsonc
"EMAIL_FROM": "Memoria <noreply@الدومين>",
```

(احذف التعليق اللي فوقه عن العنوان التجريبي.) بعدها: build ← commit ← push ← `npx wrangler deploy`.

`RESEND_API_KEY` موجود أصلاً كـ secret بالـ Worker، وما بيتغيّر.

### د) التأكد إنه انحل
1. اعمل حجز تجريبي بإيميل **غير** إيميل أحمد، ولازم يوصل رمز التأكيد.
2. شغّل الاستعلام بالقسم 1، ولازم ما يطلع فشل جديد.
3. جرّب من صفحة متابعة الحجز "إلغاء حجز فيه عربون"، ولازم يوصل رمز الأمان للعروس.
4. افحص إنه الحجوزات الجديدة ما عاد تتأكد `auto`:
   ```sql
   select verified_via, count(*) from bookings where created_at > now() - interval '3 days' group by 1;
   ```

---

## 3. إذا الدومين صار رابط الموقع كمان (مش بس للإيميل)

إذا بدنا الموقع نفسه يصير على الدومين بدل `workers.dev`:

1. **Cloudflare:** Workers & Pages ← `memoria-production` ← Settings ← Domains & Routes ← Add custom domain.
2. **`wrangler.jsonc`:** `PUBLIC_APP_URL` = `https://الدومين`. أغلب الكود بيقرأه (27 مكان، وفيهم الـ fallback القديم `|| "https://memoria-production…"`، وما بيضر).
3. **روابط مكتوبة مباشرة بالكود (لازم تتغيّر يدوياً):**
   - `src/content/seo.ts` ← `SITE_URL`
   - canonical و`og:url` و`og:image` بالصفحات: `src/routes/index.tsx`، `about.tsx`، `app.tsx`، `contact.tsx`، `faq.tsx`، `for-clients.tsx`، `for-photographers.tsx`، `guide.tsx`، `photographers/$username.tsx`، `photographers/join.tsx`
   - للبحث عنهم كلهم: `grep -rn "ahmad000haddad.workers.dev" src`
4. **Supabase Auth** (Dashboard ← Authentication ← URL Configuration): غيّر **Site URL** وضيف الدومين لـ **Redirect URLs**، وإلا تسجيل الدخول ورابط استعادة كلمة المرور بيرجعوا على الرابط القديم.
5. **Google Calendar OAuth** (Google Cloud Console ← Credentials ← OAuth client): ضيف redirect URI جديد
   `https://الدومين/api/public/google/callback` (الكود بيبنيه من `PUBLIC_APP_URL` في `src/lib/google-calendar.server.ts`).
   وإذا بدك، ضيف الدومين بـ Authorized JavaScript origins كمان.
6. **Telegram webhook:** بيتسجّل تلقائياً من `ensureTelegramWebhook()` على `PUBLIC_APP_URL`. تأكد إنه رجع اشتغل بعد التغيير.
7. **Zbooni و PayTabs (روابط الرجوع والـ webhook)** إذا مضبوطين على الرابط القديم: حدّثهم من لوحاتهم.
8. **روابط العرايس القديمة** (`/track/...`) على `workers.dev` بتضل شغّالة لأنه نفس الـ Worker. ما في داعي لـ redirect.

---

## 4. إذا تغيّر اسم البزنس

- الاسم موجود بالعربي والإنجليزي ("ميموريا" / "Memoria") بحوالي 73 ملف تحت `src`، بالترجمات `src/i18n/en.json`، وبـ `public/manifest.webmanifest`.
- قوالب الإيميل: `src/lib/email.server.ts` (`layout`) و`src/lib/verification.server.ts`.
- الإيميلات بتطلع باسم `EMAIL_FROM` (الجزء قبل `<…>`).
- بوت تيليجرام اسمه `MemoriaJoBot` (`TELEGRAM_BOT_USERNAME`)، ومتجر Zbooni `memoriaa.zbooni.com`.
- إيميل الدعم الظاهر للناس `ahmad000haddad@gmail.com`: بالفوتر (`src/components/site/Footer.tsx`)، و`about.tsx`، و`contact.tsx`. بعد الدومين، الأفضل يصير `support@الدومين`.
- **نصيحة:** ثبّت الاسم أولاً، بعدين اشتري الدومين، بعدين اعمل الخطوات 2 و 3 مرة وحدة.

---

## 5. أشياء مرتبطة (اختيارية بس مهمّة)

- **واتساب كقناة تأكيد تانية:** محتاج `WHATSAPP_PUBLIC_NUMBER` و`WHATSAPP_API_TOKEN` و`WHATSAPP_PHONE_ID` و`WHATSAPP_APP_SECRET` (WhatsApp Cloud API). هلأ ولا واحد منهم موجود بالإنتاج (`npx wrangler secret list`). بدونه الإيميل هو القناة الوحيدة، وإذا فشل الإيميل والواتساب مش مضبوط بيصير التأكيد التلقائي (`auto`). القرار: الإيميل لحاله بيكفي بعد التوثيق، والواتساب تحسين لاحق.
- **التأكيد التلقائي `auto`:** بعد التوثيق، فكّر تمنعه (بدل ما يتأكد لحاله، العروس تشوف "أعيدي الإرسال"). المكان: `src/lib/booking.functions.ts` (فرعين فيهم `markBookingVerified(row.id, "auto")`).
- **Supabase Auth SMTP:** إيميلات تسجيل المصوّرات واستعادة كلمة المرور بتطلع من مرسل Supabase الافتراضي، وهو محدود جداً (بضع إيميلات بالساعة). بعد الدومين: Authentication ← SMTP Settings ← ضيف Resend SMTP (`smtp.resend.com`، المنفذ 465، المستخدم `resend`، كلمة المرور = RESEND API key).

---

## 6. بعد الدومين: كلمة سر لرابط المتابعة (التصميم متّفق عليه)

المشكلة الجذرية: المصوّرة بتشوف رابط متابعة العروس (`client_tracking_token`)، فبتقدر تتصرف كأنها العروس. رمز الإيميل (step-up) بيحمي الإلغاء والملاحق، بس محتاج إيميلات شغّالة. الخطة:

- **أول دخول للعروس:** شاشة "اختاري كلمة سر سهلة، ولا تخبري المصوّرة". إذا المصوّرة فتحت الرابط أول مرة، بتظهرلها رسالة إنه هاد للعروس.
- **التخزين:** الكلمة مشفّرة (PBKDF2 + salt) بجدول منفصل `booking_track_auth` (RLS بدون policies)، **مش** على جدول `bookings`، لأن المصوّرة بتقرأ `bookings` وممكن تكسرها offline.
- **البوابة على مستوى الخادم:** كوكي httpOnly موقّع (HMAC بمفتاح `SUPABASE_SERVICE_ROLE_KEY`) بعد التحقق. دالة `assertTrackAccess(token)` بتنستدعى بكل دوال الرابط:
  - `getBookingByToken` (بترجع `locked` + وضع set/enter)
  - `clientCancelBooking`، `respondAddendum`، `clientMarkReceived`، `clientMarkDepositSent`، `clientAddNote`
  - `submitReviewByToken`، `saveEventDayInfo`، `clientEditDetails`
  - `sendMessageByToken` و`getMessagesByToken`، `getGalleryByToken`

  وحد 8 محاولات بالساعة.
- **نسيان أو تغيير الكلمة:** رمز على **إيميل العروس** (`issueStepUpCode` بغرض جديد `reset`)، مش إرسال الكلمة نفسها. بنفس الطريقة بتسترجع العروس الوصول إذا المصوّرة سبقتها وحطّت كلمة.
- بتنطبق بس حيث `stepUpApplies(bk)` (حجز مش يدوي وفيه إيميل).
- **رمز الإيميل للإلغاء والملاحق بيضل** كطبقة تانية (للحجوزات القديمة، وإذا العروس شاركت الكلمة).
- **بديل بدون دومين:** ربط تيليجرام للعروس (البوت موجود، `TELEGRAM_BOT_TOKEN`)، بس أصعب على العروس.

## 7. مرجع: تدقيق الإساءة (2026-11-04)

- التفاصيل والجداول: `docs/bride-photographer-scenarios.md` القسم 20.
- migrations مطبّقة على الإنتاج (تأكّدت منها): `20261104120000_profile_reports.sql`، `20261104130000_no_deposit_autocancel.sql`، `20261104140000_abuse_hardening.sql` (نسخة الإنتاج من الأخيرة بدون حقل `policy_source` بالـ audit، ما بيأثر)، `20261104160000_payment_change_alerts.sql`.
- ملفات الحماية: `src/lib/abuse.server.ts` (حدود معدّل + IP)، `stepup.server.ts` و`stepup.functions.ts`، `src/components/StepUpBox.tsx`، trigger `aa_guard_booking_direct_updates` (36 عمود محمي)، لقطة سياسة الاسترداد، منع تقييم الحجز اليدوي.
- قرارات أحمد: تقييم الحجز اليدوي ممنوع (بس عرايس حقيقيات عبر المنصّة). إخفاء `client_tracking_token` عن المصوّرة لسا مفتوح، والحل هو القسم 6.

## 8. قائمة تحقق سريعة

- [ ] اسم البزنس ثابت
- [ ] شراء الدومين
- [ ] Resend: إضافة الدومين + DNS + Verify
- [ ] `EMAIL_FROM` في `wrangler.jsonc` + deploy
- [ ] حجز تجريبي بإيميل غريب ← وصل الرمز
- [ ] (اختياري) الموقع على الدومين: Cloudflare custom domain + `PUBLIC_APP_URL` + الروابط المكتوبة مباشرة + Supabase URLs + Google redirect
- [ ] Supabase Auth SMTP على Resend
- [ ] إيميل الدعم `support@الدومين`
- [ ] منع `auto` verify (اختياري)
- [ ] كلمة سر رابط المتابعة (القسم 6)
