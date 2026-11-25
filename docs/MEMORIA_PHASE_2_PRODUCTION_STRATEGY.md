# MEMORIA — Phase 2: Production Readiness & Engineering Strategy

تاريخ: 2026-11-24 · يبني على `docs/MEMORIA_PRODUCT_INTELLIGENCE_AUDIT.md` ولا يكرره.
القرارات المعتمدة التي التزمت بها: الأسعار كما هي (Basic 15/180، Pro 20/200، Founder 7/70) · Lazy loading مسموح دون إعادة بناء · كل إصلاح واختبار على Dev أولاً · WhatsApp OTP غير إلزامي · لا تغيير بصري دون سبب.

## قواعد القراءة

| الرمز | المعنى |
|---|---|
| ✅ | تحققت منه الآن بأمر أو قياس أو قراءة حية |
| 📖 | قرأته في الكود أو الـ migrations بسطره |
| 📚 | من صفحة رسمية جلبتها اليوم (رابطها مذكور) |
| ❔ | استنتاج أو افتراض. غير مُثبت |

**ما نفّذته في هذه المرحلة (كله قراءة، لا كتابة على أي نظام):**
- `wrangler secret list` و`wrangler deployments list` على worker الإنتاج. أخرجت **أسماء** الـ secrets فقط، لا قيمها.
- بناء محلي ثانٍ مع `--sourcemap` وتحليل مساهمة كل مكتبة وملف في الحزمة الرئيسية (مخرجات `.output/` مُتجاهَلة في git).
- جلب صفحات الأسعار والحدود الرسمية: Cloudflare Workers (limits وpricing)، Supabase pricing، Resend pricing، Meta WhatsApp pricing.
- قراءة الكود والـ migrations. لم أنفّذ migration، لم أنشر، لم أكتب في أي قاعدة بيانات، لم أغيّر إعدادات Cloudflare/Supabase/Meta/Resend.

**ما لا أستطيع الوصول إليه (يجب أن تقرره أنت أو تفتحه لي):**
- خطة Cloudflare الفعلية (Free/Paid). الـ API الذي يجيب عنها يحتاج توكن لا أستخرجه من جهازك.
- خطة Supabase للإنتاج، حجم القاعدة، سجلاتها، وجود نسخ احتياطية.
- سجلات Workers (هل الـ cron ينجح؟ هل توجد أخطاء 1102؟).
- حالة Meta WhatsApp (لا أي secret يخصه على الـ worker، انظر 1.4).

---

## 1. Production Infrastructure Map

### 1.1 المسار من `git push` إلى الإنتاج

```
[محلي] git push origin main  ──►  github.com/ahmad00haddad/memoria  (1,271 commit، فرع main)
                                        │
                                        ├─ GitHub Actions: workflow واحد فقط = supabase-keepalive.yml (كل يومين) ✅
                                        │      لا بناء، لا اختبارات، لا نشر.
                                        │
                                        └─ Workers Builds (تكامل Git في Cloudflare)  ❔ من ذاكرة المشروع "Workers Builds serves stale code"
                                               لا أستطيع تأكيد وجوده أو إعداده. لا ملف في المستودع يصفه.

[محلي] npx vite build           ──►  @lovable.dev/vite-tanstack-config → TanStack Start → Nitro (preset cloudflare)
                                      ينتج .output/public (الأصول) + .output/server (Worker) + .output/server/wrangler.json
                                      ويكتب .wrangler/deploy/config.json = redirect إلى ذلك wrangler.json ✅
[محلي] npx wrangler deploy      ──►  worker "memoria-production" (اسم ثابت في wrangler.jsonc)
```

الدليل على أن النشر اليدوي هو المسار الفعلي: `wrangler deployments list` يُظهر ثلاث نشرات في 2026-11-23 و11-24 (22:38 و11:15 و14:04 UTC) كلها `Author` = حسابك و`Source: Unknown (deployment)` ✅. نشر عبر Git كان سيظهر مصدراً مختلفاً ❔.

**ملاحظات خطرة على هذا المسار:**
1. **`wrangler deploy` ينشر ما في مجلدك المحلي `.output` وقت التنفيذ** (عبر redirect). أي بناء ببيئة خاطئة أو بفرع غير main أو بتعديلات غير مُلتزَم بها يصبح إنتاجاً. لا فحص ولا تأكيد. 📖✅
2. **الـ cron والـ hooks لا تظهر في `wrangler.jsonc`**: الـ `main` فيه "مُهمَل" (Nitro يُنتج wrangler.json خاصاً به، بحسب تحذير البناء `Wrangler config main is overridden`) ✅. الـ cron مربوط عبر Nitro plugin (`src/nitro/cron.ts`) لا عبر `scheduled` في `src/server.ts` (التعليق في `wrangler.jsonc` قديم ومضلل) 📖.
3. **لا توجد سكربتات `test` في `package.json`** (السكربتات: dev, build, build:dev, preview, lint, format) ✅. `vitest` يُشغَّل يدوياً فقط.
4. ملفات `.env` و`.env.development` و`.env.production` **مُتتبَّعة في git** رغم `.gitignore` ✅ (`git ls-files`). تحوي عناوين ومفاتيح publishable فقط (قرأت أسماء المفاتيح لا القيم)، فلا تسريب سرّي، لكنها تكشف عنوان **ثلاثة** مشاريع Supabase (انظر 1.4).

### 1.2 CI/CD والاختبارات قبل النشر

| السؤال | الجواب | دليل |
|---|---|---|
| هل توجد CI/CD؟ | **لا.** | ✅ `.github/workflows/` فيه ملف واحد (keep-alive) |
| ما الذي يعمل قبل النشر؟ | لا شيء تلقائياً. `tsc` و`vitest` و`eslint` يدوية | ✅ |
| هل يُمنع النشر عند فشل الاختبار؟ | لا | ✅ |
| حالة الاختبارات اليوم | `tsc` نظيف، 41 اختباراً ناجحاً (منطق صرف فقط) | ✅ المرحلة 1 |
| أخطر ما فيه | لا شيء يمنع نشر migration/كود يكسر الحجز | 📖 |

### 1.3 هل يمكن نشر Dev دون التأثير على Production؟

**اليوم: لا، ليس بأمان.** الأسباب:
- `wrangler.jsonc` فيه اسم worker واحد (`memoria-production`) وبلا `env.*`. 📖
- كتلة `vars` في `wrangler.jsonc` **تثبّت** `SUPABASE_URL` و`SUPABASE_PUBLISHABLE_KEY` و`PUBLIC_APP_URL` الخاصة بالإنتاج. أي worker ينشأ من هذا الملف يقرأ قاعدة الإنتاج. 📖
- سكربت `build:dev` (`vite build --mode development`) يقرأ `.env.development` فيحمل **الواجهة** إلى قاعدة dev (`ysqp…`) بينما **الخادم** (server functions) يقرأ vars الإنتاج. نتيجة نشر كهذا: واجهة تكتب في dev وخادم يقرأ prod بمفتاح ناقص. مزيج خطر. ❔ (استنتاج من الملفين، لم أنفّذه)
- الـ secrets (`SUPABASE_SERVICE_ROLE_KEY` وغيره) مربوطة باسم الـ worker. worker جديد يبدأ بلا secrets، فلن يكتب شيئاً في الإنتاج، وهذه حماية جيدة بالصدفة. ✅

**التصميم المقترح (دون تنفيذ):** ملف `wrangler.dev.jsonc` باسم `memoria-dev`، بـ `vars` تشير إلى dev فقط (`ysqp…`)، وsecrets منفصلة (`wrangler secret put --name memoria-dev`)، وسكربت `deploy:dev` يمرّ بـ `build:dev` ثم `wrangler deploy -c wrangler.dev.jsonc`. وحارس في السكربت: يرفض إن ظهر `qrpk` في المخرجات.

### 1.4 فصل البيئات

| العنصر | Production | Dev | ملاحظة |
|---|---|---|---|
| مشروع Supabase | `qrpk…` ✅ | `ysqp…` ✅ | منفصلان |
| مشروع Supabase ثالث | `ukjk…` في `.env` ✅ | | غالباً مشروع Lovable Cloud الأصلي. **مجهول الحالة**: هل ما زال حياً؟ هل فيه بيانات؟ يجب إغلاقه أو توثيقه |
| قيم `vars` في Worker | prod مثبّتة في المستودع ✅ | لا يوجد worker dev | |
| Secrets على Worker | موجودة (انظر أسفل) ✅ | لا يوجد | |
| `.dev.vars` | لا يوجد ✅ | | لا يمكن تشغيل server functions محلياً بمفتاح الخادم (وثيقة 11-13 E3) |

**الـ secrets الموجودة على `memoria-production` (أسماء فقط) ✅:** `CRON_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `PAYTABS_PROFILE_ID`, `PAYTABS_SERVER_KEY`, `RESEND_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET`, `VAPID_PRIVATE_KEY`.

**ما هو غائب (وهو اكتشاف مهم) ✅:**
| غائب | الأثر |
|---|---|
| `WHATSAPP_API_TOKEN`, `WHATSAPP_PHONE_ID` | `isWhatsAppConfigured()` = false ← **كل رسائل واتساب no-op الآن**، و`publicWhatsAppNumber()` = null |
| `WHATSAPP_APP_SECRET`, `WHATSAPP_VERIFY_TOKEN` | webhook الواتساب يرفض كل شيء (يرجع 401). لا يعمل أصلاً |
| `TURNSTILE_SECRET_KEY` | لا حماية Turnstile (مذكورة في `.env.example` فقط) |
| `STRIPE_*` | مسار `payment.ts` ميت (يعيد 503) |
| `WHATSAPP_PUBLIC_NUMBER` | لا يظهر ضمن secrets ولا vars (`wrangler.jsonc`) |

**النتيجة المباشرة:** تحقق الرقم عبر واتساب **غير موجود** في الإنتاج اليوم. والإيميل sandbox (`EMAIL_FROM=onboarding@resend.dev`) يفشل مع غير مالك الحساب. لذلك `submitBookingRequest` يسقط في فرع `markBookingVerified(…, "auto")` (`booking.functions.ts:240-264`) في **كل** طلب حجز إنتاج اليوم ✅📖. هذا ينقل ما كتبته في المرحلة 1 كـ"على الأغلب" إلى **مؤكد** من جهة الإعداد (لم أُنشئ طلباً فعلياً لأتأكد من السلوك).

PayTabs: المفتاحان موجودان ✅. لا أعرف إن كان `payTabsConfig()` يحتاج متغيرات أخرى (مثل المنطقة) ❔.

### 1.5 خطة Cloudflare والحدود التي تهم Memoria

**الخطة الفعلية: غير معروفة** ❌. لا أستطيع قراءتها. كيف تتحقق: لوحة Cloudflare ← Workers & Pages ← Plans.
**استدلال (❔) أنها Paid**: صفحات SSR لـ TanStack بحزمة خادم كبيرة تحتاج عادة أكثر من 10ms CPU، ووثيقة Cloudflare نفسها تذكر أن SSR والمصادقة "typically 10-20 ms" (📚). على Free (10ms) كنت سأتوقع أخطاء 1102 متكررة. الموقع يعمل. هذا دليل غير مباشر لا يُعتمد عليه.

الحدود الرسمية (📚 `developers.cloudflare.com/workers/platform/limits` و`/pricing`، جلبتها اليوم):

| الحد | Free | Paid | لماذا يهم Memoria |
|---|---|---|---|
| Requests | 100,000 / يوم | 10M / شهر مشمولة، ثم $0.30 لكل مليون | حركة الموقع |
| CPU time لكل طلب HTTP | 10 ms | 30 ث افتراضياً (حتى 5 د) | SSR + `HTML` rewrite + إرسال إشعارات داخل الطلب |
| CPU لكل Cron Trigger | 10 ms | 30 ث (فترات < ساعة) | `booking-deadlines` كل 30 د |
| **Subrequests لكل طلب/تنفيذ** | **50** | **10,000** | كل استدعاء Supabase/Resend/Telegram/Meta = subrequest. cron التذكيرات يستدعي RPC لكل حجز (N+1) |
| اتصالات مفتوحة متزامنة لكل طلب | 6 | 6 | `Promise.all` بـ 5 مصوّرات في `ical-sync` ضمن الحد |
| الذاكرة لكل isolate | 128 MB | 128 MB | قراءة HTML كاملاً في الذاكرة (R1) |
| Cron Triggers لكل حساب | 5 | 1,000 | عندنا 1 |
| سعر CPU الإضافي | | 30M ms مشمولة شهرياً، ثم $0.02 لكل مليون ms | |
| الحد الأدنى للاشتراك | | $5 / شهر | |

**ما يعنيه هذا إن كانت الخطة Free:** الـ cron `booking-deadlines` (حتى 200 + 200 + 100 صفاً، كل صف 1-4 استدعاءات) سيتجاوز 50 subrequest فيتوقف في منتصف التنفيذ بصمت. يجب التحقق قبل أي إطلاق.

### 1.6 تكاليف التشغيل المتوقعة

**قاعدة صارمة:** الأسعار أدناه من صفحات رسمية (📚). أرقام الحركة **افتراضات** منّي (❔) مكتوبة بوضوح حتى تستبدلها ببياناتك. لا أنسب أي رقم للحركة إلى قياس.

**الافتراضات (قابلة للتعديل):**
- A1: 3,000 طلب HTTP للـ Worker لكل مصوّرة شهرياً (زيارات صفحتها + لوحتها + الـ API + الـ hooks + البوتات).
- A2: متوسط CPU لكل طلب SSR = 15 ms (منتصف مجال 10-20 ms الذي تذكره Cloudflare 📚).
- A3: 30 حجزاً شهرياً لكل مصوّرة نشطة (موسمية الأعراس ستغيّره).
- A4: Pro يخزّن 60 صورة معرض بحجم متوسط 250 KB بعد الضغط = 15 MB لكل مصوّرة. (صور المعرض فقط؛ التسليم منفصل أدناه.)
- A5: كل ذلك على الباقة المدفوعة لكلا الطرفين.

| المقياس | طلبات Worker/شهر | CPU (ms/شهر) | تكلفة Workers التقريبية | تخزين معارض |
|---|---|---|---|---|
| 100 مصوّرة | 0.3M | 4.5M | **$5** (الحد الأدنى؛ ضمن المشمول) | 1.5 GB |
| 500 | 1.5M | 22M | **$5** (ضمن المشمول) | 7.5 GB |
| 2,000 | 6M | 90M | $5 + (90M-30M)×$0.02/M = **≈ $6.2** | 30 GB |
| 10,000 | 30M | 450M | $5 + (30M-10M)×$0.30/M + (450M-30M)×$0.02/M = **≈ $19.4** | 150 GB |

**الخلاصة (مشروطة بالافتراضات):** تكلفة Cloudflare ضئيلة حتى 10,000 مصوّرة. **Supabase والتخزين هما التكلفة الحقيقية.**

Supabase (📚 `supabase.com/pricing`):
- **Free:** 500 MB قاعدة، 1 GB تخزين، 5 GB egress، **يُوقَف بعد أسبوع بلا نشاط، لا نسخ احتياطية تلقائية، لا PITR**.
- **Pro $25/شهر:** 8 GB قرص، 100 GB تخزين، 250 GB egress (ثم $0.09/GB)، **نسخ يومية بالاحتفاظ 7 أيام**، 100K MAU، يشمل رصيد $10 يكفي Micro (اتصالات: مباشرة 60، pooler 200).
- التخزين الزائد $0.0213/GB، القرص الزائد $0.125/GB.

| المقياس | قاعدة (بيانات نصية) | تخزين صور معارض | ملاحظة |
|---|---|---|---|
| 100 | بضع عشرات MB ❔ | 1.5 GB | يكفي Free تقنياً، **لكن لا نسخ احتياطية** |
| 500 | مئات MB ❔ | 7.5 GB | Free لا يكفي (1 GB تخزين). Pro إلزامي |
| 2,000 | أقل من 8 GB ❔ | 30 GB | Pro + ربما رفع Compute |
| 10,000 | قد تقترب من 8 GB أو تتجاوزها ❔ | 150 GB | ≈ $0.0213×50 = $1 زيادة تخزين، لكن **egress** هو الخطر |

**⚠️ أكبر خطر تكلفة غير مفحوص: معارض التسليم.** `delivery_photos` يقبل ملفات حتى 20 MB (الوثائق 11-17). عرس واحد = مئات الصور. مثال افتراضي (❔): 500 صورة × 3 MB = 1.5 GB لكل حجز. عند 500 مصوّرة × 4 أعراس/شهر = **≈ 3 TB تخزين جديد شهرياً**، أي ≈ $60 زيادة تخزين لكل شهر تتراكم (3,000 GB × $0.0213 ≈ $64)، **وتنزيل العروس لها** يستهلك egress ($0.09/GB بعد 250 GB). لهذا يجب قرار: هل التسليم داخل Memoria أم رابط خارجي (`delivery_link` موجود أصلاً)؟ يحدد هذا القرار الجدوى الاقتصادية بأكملها. 

**الإيميل (Resend 📚 `resend.com/pricing`):** Free: 3,000/شهر و**100/يوم**؛ Pro $20/شهر: 50,000/شهر بلا حد يومي، والزائد $0.90 لكل 1,000؛ 10 domains. عدد الإيميلات: ≈ 6-10 رسائل لكل حجز (قوالب 40) ❔. عند 500 مصوّرة × 30 حجزاً × 8 = 120,000/شهر ← Scale ($90) أو زيادات Pro. **Free لا يكفي للإطلاق** (حد يومي 100).

**واتساب (Meta 📚 `developers.facebook.com/docs/whatsapp/pricing`):** منذ 2025-07-01 التسعير **لكل رسالة** حسب الفئة (marketing/utility/authentication) والسوق. الأردن ضمن مجموعة "Rest of Middle East". Meta **لا تحاسب** على الرسائل من المستخدم إلى النشاط. الرسائل النصية الحرة تُرسل **فقط داخل نافذة 24 ساعة** بعد رسالة المستخدم؛ خارجها قوالب معتمدة فقط. **لم أستخرج سعر الرسالة للأردن** من جدول الأسعار (يحتاج صفحة rate card)، فلا أذكر رقماً.

### 1.7 العمليات المستهلكة (CPU / Subrequests / اتصالات DB)

| العملية | الموقع | ما تستهلكه | ملاحظة |
|---|---|---|---|
| قراءة HTML كاملاً + regex لإدخال nonce | `src/server.ts:~90` | CPU + ذاكرة لكل صفحة HTML | يلغي streaming |
| `submitBookingRequest` | `booking.functions.ts` | ~12-15 استدعاء Supabase متسلسل (`is_subscription_active`، 2 فحص rate، 2 عدّ، pricing، visible ids، profile، RPC، applyPackagePromises، تحقق...) + إرسال إيميل | زمن الطلب = مجموع الاستدعاءات |
| `notifyPhotographer` | `notify.server.ts` | 5 قنوات متسلسلة داخل الطلب: in-app، push (+استعلام)، telegram، `getUserById`، إيميل (+ جدولة `email_log` + `genderizeEmail`) | كل واحد subrequest أو أكثر |
| `confirmBookingAfterDeposit` | `booking.functions.ts:621-766` | ≈ 14 استدعاء + عقد + واتساب + إيميل | |
| cron `booking-deadlines` | `hooks/booking-deadlines.ts` | `limit(100/200/200)` صفاً × (RPC `approval_window_hours` + 1-3 إشعارات) | N+1، بلا `ORDER BY`، يتجاوز 50 subrequest على Free |
| cron `ical-sync` | `hooks/ical-sync.ts` | لكل مصوّرة: جلب iCal خارجي + كتابة. 5 بالتوازي. بلا سقف للعدد | يتجاوز زمن/subrequests عند مئات المصوّرات |
| `abuse.allow()` | `abuse.server.ts` | استعلامان DB لكل فحص (عدّ + إدراج) | الحجز وحده يستدعيها 2-3 مرات |
| `listPhotographersAdmin` | `admin.functions.ts:~13` | يجلب كل الحجوزات والتقييمات بلا ترقيم | يُقصّ عند حد PostgREST الأقصى ❔ |
| `searchPhotographers` | `search.functions.ts` | حتى 200 صف ثم تصفية JS | |
| `getBookingByToken` | `booking.functions.ts:276-331` | RPC + 5 استعلامات متسلسلة + `extrasForToken` (4 استعلامات) | صفحة تتبع العروس ثقيلة (≈ 10 استدعاءات) |

**اتصالات قاعدة البيانات:** كل استدعاء Supabase JS هو طلب HTTP إلى PostgREST (مجمَّع خلف Supavisor)، لا اتصال Postgres دائم من Worker. لذلك حد "60 مباشر / 200 pooler" على Micro (📚) يخص PostgREST نفسه، وليس Workers. الخطر ليس عدد الاتصالات بل **زمن كل طلب مضروباً في عدد الاستدعاءات المتسلسلة** وحمل PostgREST على Micro عند الذروة (موسم الأعراس) ❔.

### 1.8 هل Supabase مناسب لحجمنا؟

**نعم من حيث النوع (علائقي، RLS، Auth، Storage في مكان واحد) ولا تحتاجين تغييره.** لكن بشروط:
1. **الإنتاج يجب أن يكون Pro قبل أول عميل.** على Free: لا نسخ احتياطي، يتوقف بعد أسبوع خمول (لهذا وُجد workflow الـ keep-alive ✅ دليل أن المشروع على Free، **لكن لا أعرف أي مشروع يستهدف** سرّ `SUPABASE_URL` في GitHub ❔)، وتخزين 1 GB.
2. Micro (1 GB RAM) كافٍ لمئات المصوّرات ❔. راقبي CPU وذاكرة القاعدة، وارفعي Compute عند الحاجة.
3. استعلامات البحث/الإدارة تحتاج ترقيماً قبل 500 مصوّرة.
4. PITR (استعادة لحظة) **غير مشمول** في Pro الأساسي (من صفحة التسعير: غير مشمول في Free؛ لم أتحقق من إضافته للـ Pro، أضفه لقائمة التحقق ❔).

### 1.9 المراقبة المطلوبة

**يومياً (آلي، تنبيه تيليغرام إن خرج عن الحد):**
| المؤشر | المصدر | حد التنبيه المقترح |
|---|---|---|
| نجاح الـ cron | سجل Worker أو جدول heartbeat | غياب أكثر من 90 دقيقة |
| 5xx / أخطاء 1102 | Cloudflare Metrics | أي قيمة > 0.5% |
| `email_log` بحالة failed/skipped | DB | > 5% خلال 24 ساعة |
| دفعات اشتراك `pending` أقدم من 24 ساعة | DB | أي واحدة |
| حجوزات `pending_deposit` + `deposit_sent_at` ≠ null أقدم من 24 ساعة (إيصال بلا تأكيد) | DB | أي واحدة |
| حجوزات موافَق عليها بلا عربون > 72 ساعة | DB | للعلم |
| فشل webhook (حالة 4xx/5xx) PayTabs/Telegram | سجل Worker | أي |

**أسبوعياً:** حجم DB والتخزين والـ egress، نمو `rate_limits` و`email_log` و`notifications`، أبطأ 10 استعلامات (`pg_stat_statements`)، بطء الصفحات (LCP/INP حقلي)، نسبة تحويل الطلب→موافقة→عربون، مصوّرات انتهت تجربتها دون دفع، تجربة الاستعادة من النسخة الاحتياطية (شهرياً).

---

## 2. Booking Integrity Architecture

### 2.1 خريطة مسارات الكتابة (ما يحميها اليوم)

| المسار | الملف | يفحص التعارض؟ | القفل | الثغرة |
|---|---|---|---|---|
| create | RPC `create_booking_guarded` | نعم (`is_photographer_busy` + `has_booking_conflict`) | advisory (مصوّرة|تاريخ) | لا (جيد) |
| verification | `verification.server.ts:markBookingVerified` | نعم قبل التوثيق | لا | سباق مع create/move |
| approve | `approval.functions.ts:approveBookingRequest` | لا (الطلب يحجز يومه أصلاً) | لا | آمن إن كان الحجز يحتفظ بيومه فعلاً (انظر 2.5) |
| confirm deposit | `booking.functions.ts:confirmBookingAfterDeposit` | نعم (`has_booking_conflict`) ثم UPDATE | لا | TOCTOU |
| manual booking | `manual-booking.functions.ts` | نعم ثم INSERT | لا | TOCTOU، ويتجاوز الأيام المغلقة عمداً |
| reschedule | `extras.functions.ts:respondAddendum` | نعم ثم UPDATE | لا | TOCTOU |
| addendum (مبلغ) | نفس الملف | لا يمس التاريخ | | |
| cancel | RPC `cancel_booking` / `client_cancel_booking` | لا يحتاج | `FOR UPDATE` على الصف | آمن (يحرّر الحجز فقط) |
| status change | `production.functions.ts:updateBookingStatus/updateProductionStage` | لا | `.eq("status", old)` | الإرجاع `delivered→confirmed` يعيد إحياء يوم محجوز دون فحص (انظر 2.5) |
| soft delete | RPC `soft_delete_booking` | لا يحتاج | | |
| auto-cancel | `expire_unpaid_bookings` | لا يحتاج | | |

**الجذر:** الفحص موجود لكن **منطقياً في طبقة التطبيق** (ثلاث نسخ منه)، والقفل في مكان واحد فقط. أي مسار جديد يتجاوزه تلقائياً.

### 2.2 التصميم: قاعدة واحدة في PostgreSQL على جدول `bookings`

**المبدأ:** trigger `BEFORE INSERT OR UPDATE` يأخذ **نفس مفتاح القفل الحالي** (`hashtextextended(pid|date, 0)`) ثم يستدعي **نفس الدالة الحالية** `has_booking_conflict` (فتبقى `allows_multi_bookings` و`buffer_minutes` وسياسة التداخل نصف المفتوح كما هي حرفياً). لا منطق جديد للتداخل. فقط نقل الفحص من التطبيق إلى القاعدة وتغطية كل المسارات دفعة واحدة.

قواعد التصميم:
1. **لا يمنع الحجوزات الصحيحة:** يعمل فقط حين يصير الصف "حاجزاً" (`booking_holds(NEW)`) ولم يكن يحجز نفس الفتحة قبل التعديل.
2. **لا يجمّد البيانات القديمة:** حجزان متعارضان موجودان اليوم لا يمنعان تعديل أي منهما (الشرط 2 أدناه).
3. **لا يمنع الأيام المغلقة يدوياً:** `photographer_unavailability` يبقى خارج الـ trigger (الحجز اليدوي مسموح فوقها عمداً).
4. **بلا deadlocks:** كل معاملة تأخذ **قفلاً استشارياً واحداً** (مصوّرة|تاريخ). لا ترتيب متعدد المفاتيح، فلا دورة انتظار ممكنة بين مفاتيح. والقفل خاص بيوم واحد لمصوّرة واحدة (لا تنافس بين مصوّرات).
5. **أداء:** الفحص يعمل فقط عند تغيير الأعمدة ذات الصلة (`UPDATE OF …`) وبعد الخروج المبكر للحالات غير الحاجزة (إلغاء، تغيير ملاحظات). الاستعلام يمر بفهرس `bookings_photographer_active_idx` ✅📖 على (مصوّرة، تاريخ).
6. **الخطأ:** `SLOT_CONFLICT` بنفس النص الذي يعالجه التطبيق اليوم، فلا تغيير في الواجهة.

### 2.3 SQL المقترح (لا يُنفَّذ الآن)

```sql
-- migration مقترح: 2026XXXXXXXXXX_unified_slot_guard.sql  (DEV أولاً)
BEGIN;

CREATE OR REPLACE FUNCTION public.bookings_slot_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- (1) لا يحجز فتحة؟ لا شيء نفحصه (إلغاء، حذف ناعم، غير موثّق منتهي الحجز المؤقت...)
  IF NEW.deleted_at IS NOT NULL OR NOT public.booking_holds(NEW) THEN
    RETURN NEW;
  END IF;

  -- (2) كان يحجز الفتحة نفسها قبل التعديل؟ لا نعيد الفحص (يحمي الصفوف القديمة المتعارضة من التجميد)
  IF TG_OP = 'UPDATE'
     AND OLD.deleted_at IS NULL
     AND public.booking_holds(OLD)
     AND OLD.photographer_id = NEW.photographer_id
     AND OLD.event_date      = NEW.event_date
     AND OLD.start_time      = NEW.start_time
     AND OLD.end_time        = NEW.end_time THEN
    RETURN NEW;
  END IF;

  -- (3) تسلسل لكل (مصوّرة، تاريخ). نفس المفتاح في create_booking_guarded، والقفل re-entrant داخل المعاملة نفسها.
  PERFORM pg_advisory_xact_lock(
    hashtextextended(NEW.photographer_id::text || '|' || NEW.event_date::text, 0));

  -- (4) نفس دالة التعارض الحالية بكل سياساتها (multi/buffer/نصف مفتوح)
  IF public.has_booking_conflict(
       NEW.photographer_id, NEW.event_date, NEW.start_time, NEW.end_time, NEW.id) THEN
    RAISE EXCEPTION 'SLOT_CONFLICT' USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.bookings_slot_guard() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS zz_bookings_slot_guard ON public.bookings;
CREATE TRIGGER zz_bookings_slot_guard
  BEFORE INSERT OR UPDATE OF photographer_id, event_date, start_time, end_time,
                              status, deleted_at, phone_verified_at, approved_at, needs_approval
  ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.bookings_slot_guard();

COMMIT;
```

**تفاصيل قرار التصميم:**
- **اسم `zz_`**: Postgres يشغّل الـ triggers بالترتيب الأبجدي. نريده **بعد** triggers الحماية (`aa_guard_*`) حتى لا نأخذ القفل لتعديل سيُرفض أصلاً.
- **التطابق مع `create_booking_guarded`:** الـ RPC يأخذ القفل ثم يفحص ثم يُدرج؛ الـ trigger سيأخذ القفل ذاته (re-entrant) ثم يفحص مرة ثانية. فحص مكرر رخيص (مفهرس) وبلا خطر.
- **`booking_holds(NEW)` على صف NEW:** الدالة تقبل `public.bookings` composite ويصح تمرير NEW في BEFORE trigger. تحقق منه على Dev.
- **READ COMMITTED مفترض (الافتراضي في PostgREST):** كل استعلام داخل الدالة يأخذ لقطة جديدة بعد القفل فيرى التزام المعاملة السابقة. لو غُيّر مستوى العزل إلى REPEATABLE READ لما عمل القفل وحده. ❔ لا أرى ما يغيّره.
- **تحويل الأخطاء في التطبيق:** `markBookingVerified` يتعامل اليوم مع نص عربي (`"حُجز قبل تأكيد"`) وليس مع `SLOT_CONFLICT`. يلزم تعديل بسيط يربط `SLOT_CONFLICT` برسائل: التأكيد، نقل الموعد، الحجز اليدوي. (تغيير كود صغير، يُنفَّذ مع الـ migration.)

**اختياري (قرار منك، سلوك جديد):** حالياً الحجز الليلي (نهايته ≤ بدايته) يُعدّ حتى منتصف الليل فقط، فلا يتعارض مع حجز في صباح اليوم التالي. هذا مقصود في الكود (`has_booking_conflict` يعامل النهاية كـ 1440 دقيقة). إن أردتِ منع حجز 20:00-02:00 مع حجز 01:00 غداً يلزم توسيع الدالة والقفل ليغطي يومين (بترتيب تصاعدي للتواريخ لتفادي deadlock). **لا أقترحه الآن**: يغيّر سياسة موجودة.

### 2.4 الحالات والتعامل مع التغييرات القديمة

| الحالة | الفعل |
|---|---|
| صفوف حالية متعارضة (قبل الـ migration) | **قبل التطبيق** نفّذي استعلام كشف (أدناه) على Dev ثم Prod للعرض فقط. لا تُحذف، لا تُغيَّر. الشرط (2) يضمن عدم تجميدها |
| صفوف بحالة غير متسقة (مثلاً `confirmed` و`deleted_at` معاً) | يتجاهلها الـ trigger (`deleted_at` يخرج مبكراً) |
| `pg_advisory` مع `pgbouncer` (transaction pooling) | `pg_advisory_xact_lock` آمن (ينتهي مع المعاملة) خلافاً للـ session locks ✅ |
| كتابات `service_role` | الـ trigger يسري عليها (لا يعتمد على `auth.uid()`) |
| التعديل اليدوي من محرر SQL | يسري أيضاً. للصيانة الطارئة: `SET LOCAL session_replication_role = replica` (يتطلب صلاحيات) |

```sql
-- كشف التعارضات الموجودة (قراءة فقط)
SELECT a.photographer_id, a.event_date, a.id AS a_id, b.id AS b_id, a.start_time, a.end_time, b.start_time, b.end_time
FROM public.bookings a
JOIN public.bookings b
  ON a.photographer_id = b.photographer_id AND a.event_date = b.event_date AND a.id < b.id
WHERE a.deleted_at IS NULL AND b.deleted_at IS NULL
  AND public.booking_holds(a) AND public.booking_holds(b)
  AND ( NOT public.allows_multi_bookings(a.photographer_id)
        OR (a.start_time < CASE WHEN b.end_time <= b.start_time THEN time '23:59:59' ELSE b.end_time END
            AND b.start_time < CASE WHEN a.end_time <= a.start_time THEN time '23:59:59' ELSE a.end_time END) );
```
(تقريب للتحقق البشري؛ الدالة الرسمية تضيف `buffer_minutes`.)

### 2.5 مسارات مرتبطة يجب إدخالها في نفس العمل

1. **حجز مُعتمد بلا فتحة:** `approveBookingRequest` لا يفحص التعارض لأن الطلب "يحجز يومه" عبر `booking_holds` (30 دقيقة قبل التوثيق ثم نافذة الموافقة). قبل توثيق الرقم تنتهي الـ 30 دقيقة فتُحرَّر الفتحة، فقد يحجزها غيره، ثم يصل رمز التوثيق فيُرفض (`markBookingVerified` يفحص). السلوك سليم لكنه سيتحول إلى `SLOT_CONFLICT` من الـ trigger. **يلزم رسالة واضحة للعروس.**
2. **إرجاع مرحلة التسليم** (`delivered → confirmed`) يعيد حالة `confirmed` لصف كان `completed`؛ كلاهما "حاجز" فلا تغيّر في الحجز. آمن.
3. **`updateBookingStatus`**: قائمة `ALLOWED` تسمح `pending_deposit ↔ quote` فقط، و`completed` تُقبل في الـ validator لكنها لا تُنفَّذ من أي حالة (فرع ميت) 📖. يُنظَّف عند بناء آلة الحالة (القسم 5).

### 2.6 سيناريوهات الاختبار (على Dev)

| # | السيناريو | النتيجة المتوقعة |
|---|---|---|
| I1 | 20 طلب `create` متزامن لنفس (مصوّرة، تاريخ، وقت) | واحد ينجح، 19 `SLOT_CONFLICT` |
| I2 | `create` + `reschedule` + `manual` متزامنة على نفس اليوم | واحد فقط يصبح حاجزاً |
| I3 | وضع multi، حجزان متتاليان بـ buffer 30 د: 10:00-12:00 ثم 12:20-14:00 | الثاني مرفوض. 12:30-14:00 مقبول |
| I4 | وضع multi، حجزان متلاصقان بلا buffer (نهاية = بداية) | مقبولان (نصف مفتوح) |
| I5 | وضع single، حجزان في وقتين مختلفين في اليوم نفسه | الثاني مرفوض |
| I6 | حجز ليلي 20:00-02:00 ثم 22:00-23:00 اليوم نفسه (multi) | مرفوض. وحجز 01:00 غداً: مقبول (السلوك الحالي) |
| I7 | تعديل ملاحظات/سعر على صف قديم متعارض | ينجح (الخروج المبكر) |
| I8 | تأكيد عربون على صف قديم متعارض | ينجح (شرط 2: كان يحجز نفس الفتحة) |
| I9 | إلغاء ثم إنشاء حجز جديد على نفس الفتحة بمعاملتين متزامنتين | الجديد ينجح بعد الإلغاء فقط |
| I10 | طلب غير موثّق (30 د) ثم انتهاء المهلة، حجز آخر ينجح، ثم وصول الرمز | `markBookingVerified` يرفض برسالة واضحة |
| I11 | مصوّرتان مختلفتان، نفس التاريخ | لا تنافس (قفلان مختلفان) |
| I12 | 1,000 تحديث متزامن على تواريخ مختلفة | لا deadlock، زمن p95 ضمن حد مقبول (يُقاس) |
| I13 | يوم مغلق يدوياً ثم حجز يدوي فوقه | ينجح (المقصود) |
| I14 | `UPDATE bookings SET status='confirmed'` من محرر SQL على صف يحجز | ينجح إن كان يحجز نفس الفتحة |

أدوات: سكربت Node على Dev يطلق `Promise.all` من N عميل بمفاتيح مستخدمين، أو `pgbench` بسكربت مخصص.

### 2.7 خطة Rollback

```sql
BEGIN;
DROP TRIGGER IF EXISTS zz_bookings_slot_guard ON public.bookings;
DROP FUNCTION IF EXISTS public.bookings_slot_guard();
COMMIT;
```
- لا تعديل بيانات في الـ migration، فلا شيء يُستعاد. الـ rollback فوري ولا يحتاج نسخة احتياطية.
- ترتيب النشر: Dev ← اختبار I1-I14 ← تغيير كود معالجة `SLOT_CONFLICT` على Dev ← **نشر الكود أولاً** (لأنه متوافق مع غياب الـ trigger) ← migration على Prod ← مراقبة 24 ساعة.
- معيار التراجع: أي زيادة في أخطاء `SLOT_CONFLICT` على حجوزات يؤكد المستخدم أنها صحيحة، أو زمن UPDATE على `bookings` p95 > ضعف الأساس.

### 2.8 المخاطر قبل التنفيذ

| الخطر | الاحتمال | التخفيف |
|---|---|---|
| منع حجز صحيح بسبب اختلاف الدالة عن توقع المستخدم | منخفض (الدالة نفسها) | I3-I6 |
| تعارض بين `booking_holds(NEW)` وصف جزئي في INSERT (أعمدة NULL) | متوسط | اختبار INSERT كامل عبر RPC وعبر `manual-booking` |
| قفل طويل إن أُبقيت معاملة مفتوحة | منخفض | معاملات PostgREST قصيرة. أضيفي `lock_timeout = '5s'` للدالة (يُحوّل الانتظار الطويل إلى خطأ) |
| رسالة خطأ جديدة تظهر خاماً للمستخدم | متوسط | ربط `SLOT_CONFLICT` في كل مسار قبل النشر |
| صفوف قديمة تتعارض عند إعادة التفعيل بعد إلغاء | منخفض | شرط (2) |
| سلوك المنطقة الزمنية: `event_date` و`start_time` بلا tz، والتطبيق يستعمل UTC+3 في أماكن و`UTC` في أخرى (مثل `deleteMyAccount`) | موجود أصلاً، لا يتفاقم | يُوحَّد لاحقاً |

---

## 3. Security Testing Matrix

### 3.1 البيئة والقواعد (غير قابلة للتفاوض)
- **Dev فقط** (`ysqp…`). السكربت يرفض العمل إن ظهر `qrpk` أو `ukjk` في الـ URL (حارس أول سطر).
- الحسابات: `photographer_a`, `photographer_b`, `bride_a` (حساب Auth عادي + رابط تتبع)، `bride_b` (لاختبار العزل بين العرائس، رغم أنه لم يُذكر، لا يمكن إثبات العزل بدونه)، `admin`.
- **لا Service Role في أي متصفح أو في الاختبار نفسه.** الاختبارات تسجّل الدخول بـ `anon key + JWT` لكل مستخدم. الـ **Service Role مسموح مرة واحدة فقط في سكربت seed/teardown خادمي** على Dev، يُشغَّل من جهازك (بمتغير بيئة لا يُخزَّن في git).
- العروس لا تملك غالباً حساباً: هويتها = **رمز التتبع**. فاختبار "عروس A لا تصل لبيانات عروس B" هو اختبار **رمز A لا يفتح حجز B** ولا يكشف بيانات أخرى عبر RPC/server function.

### 3.2 مصفوفة الصلاحيات المتوقعة (الهدف الذي نختبره)

الرموز: **R** قراءة · **C** إنشاء · **U** تعديل · **D** حذف · ✅ مسموح · ❌ ممنوع (يجب أن يفشل أو يعيد 0 صف) · 🔑 مسموح بالرمز فقط · ⚙ عبر server function فقط.
الأعمدة: Anon | PhA على بياناتها | PhA على بيانات PhB | عروس برمزها | عروس A على حجز B | Admin.

| الكائن | Anon | PhA own | PhA→PhB | Bride (رمز) | Bride A→B | Admin |
|---|---|---|---|---|---|---|
| `bookings` | ❌RCUD | R ✅ · C ⚙ · U ⚙ (الحقول المحمية ❌ مباشرة) · D ❌ | ❌RCUD | 🔑 عبر RPC فقط | ❌ | R ✅ · U ⚙ |
| `contracts` | ❌ | R ✅ C ✅ (pending فقط) U (غير الحقول المحمية) | ❌ | 🔑 (توقيع عبر رمز العقد) | ❌ | R ✅ |
| `contracts` المُوقَّعة | ❌ | U ❌ (`CONTRACT_SIGNED_LOCKED`) | ❌ | ❌ | ❌ | U ❌ (status → void فقط) |
| `photographer_private` | ❌ | R ✅ U ✅ | ❌ | ❌ مباشرة (CliQ يظهر عبر RPC بعد الموافقة) | ❌ | R ✅ |
| `subscriptions` | ❌ | R ✅ · U ❌ | ❌ | ❌ | ❌ | R ✅ U ⚙ |
| `subscription_payments` | ❌ | R ✅ · C ⚙ | ❌ | ❌ | ❌ | R ✅ U ⚙ |
| `messages` | ❌ | R ✅ (حجوزاتها) · C ✅ | ❌ | 🔑 ⚙ | ❌ | R ✅ |
| `notifications` | ❌ | R/U ✅ (لها فقط) | ❌ | ❌ | ❌ | R ✅ |
| `reviews` | R (المنشور) | R ✅ · C ❌ · رد ⚙ | ❌ كتابة | C 🔑 ⚙ (مرة وبعد الاكتمال) | ❌ | R/U ✅ |
| `profiles` | ❌ مباشر (RPC عام) | R/U لحقولها (غير المحمية) | U ❌ | ❌ | ❌ | R/U ✅ |
| `pricing_rules` | R (عام) | CUD لباقاتها | ❌ CUD | ❌ | ❌ | ✅ |
| `user_roles` | ❌ | R لنفسها | ❌ | ❌ | ❌ | CUD ✅ |
| `audit_logs`, `email_log`, `rate_limits` | ❌ | ❌ (audit: R لما يخصها؟ يُحدَّد) | ❌ | ❌ | ❌ | R ✅ |
| `bride_action_codes`, `payment_events` | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ (خادم فقط) |
| **Storage** `deposit-proofs` | ❌ | R (إيصالات حجوزاتها) | ❌ | C فقط تحت `public-tokens/<رمزها>/` | ❌ R/C تحت رمز آخر | R ✅ |
| Storage `delivery-photos` | ❌ | CRUD لمعارضها | ❌ | R 🔑 | ❌ | R ✅ |
| Storage `avatars`/portfolio | R (عام) | CUD لملفاتها | ❌ CUD | ❌ | ❌ | ✅ |
| RPC `create_booking_guarded`, `client_mark_deposit_sent`, `apply_subscription_payment` | ❌ EXECUTE | ❌ | ❌ | ❌ | ❌ | ❌ (service_role فقط) |
| RPC `get_booking_by_token`, `client_*` | 🔑 | 🔑 | 🔑 | 🔑 | ❌ رمز آخر يعيد null | 🔑 |
| RPC `cancel_booking`, `soft_delete_booking` | ❌ | ✅ لحجوزاتها فقط | ❌ `forbidden` | ❌ | ❌ | ✅ |
| Server fn `listPhotographersAdmin` وكل `admin.*` | ❌ 401 | ❌ `forbidden` | ❌ | ❌ | ❌ | ✅ |
| Server fn بمعرّف حجز (مثل `confirmBookingAfterDeposit`) | ❌ 401 | ✅ لحجزها | ❌ `forbidden` | ❌ | ❌ | ❓ (يحدَّد: هل الأدمن مسموح؟) |
| Hooks `/api/public/hooks/*` | ❌ بلا سرّ | ❌ | ❌ | ❌ | ❌ | ❌ (سرّ cron/webhook فقط) |

### 3.3 قائمة الاختبارات التنفيذية (مختصرة، كل بند = اختبار مؤتمت)

**أ. قراءة (عزل):**
- S-R1: PhA تستعلم `bookings?select=*` ← يجب ألا تظهر أي صفوف لـ PhB (عدّ الصفوف بمعرّف PhB = 0).
- S-R2: PhA تطلب `bookings?id=eq.<حجز B>` ← 0 صف.
- S-R3: نفس الأمر لـ `contracts`, `messages`, `photographer_private`, `subscription_payments`, `delivery_*`, `booking_addenda`, `shot_list_items`.
- S-R4: رابط تتبع A على `get_booking_by_token(token_B)` ← null. وعلى معرّف حجز B مباشرة ← 0.
- S-R5: PhA تطلب `profiles?select=income_goal,notification_preferences,verified_by` ← خطأ/غائبة (إصلاح 11-16).
- S-R6: anon: `photographer_private` = 0، `profiles` = 401.

**ب. إنشاء:**
- S-C1: PhA تُدرج `bookings` مباشرة بـ `photographer_id` = B ← مرفوض.
- S-C2: PhA تُدرج عقداً بـ `status='signed'` أو بتوقيع ← `PROTECTED_CONTRACT_FIELD`.
- S-C3: PhA تُدرج `subscription_payments` بـ status approved ← مرفوض (لا سياسة إدراج).
- S-C4: عروس A ترفع ملفاً إلى `public-tokens/<token_B>/` ← مرفوض. وإلى مسار مع `..` ← مرفوض.
- S-C5: رفع `.svg`/`.exe`/ملف > الحد ← مرفوض.

**ج. تعديل:**
- S-U1: PhA تحدّث `bookings.status`/`total_price`/`deposit_confirmed_at` على حجز لها مباشرة ← `PROTECTED_BOOKING_FIELD`.
- S-U2: PhA تحدّث حجز B ← 0 صف أو خطأ.
- S-U3: PhA تحدّث `profiles.verified_by`/`referred_by`/`deleted_at` ← مرفوض.
- S-U4: PhA تحدّث `subscriptions` ← مرفوض.
- S-U5: تعديل عقد موقّع (النص، التوقيع) ← `CONTRACT_SIGNED_LOCKED`.
- S-U6: تغيير `client_tracking_token` مباشرة ← مرفوض (يتم عبر RPC).

**د. حذف:**
- S-D1: PhA `DELETE bookings` مباشرة ← مرفوض (الحذف ناعم عبر RPC).
- S-D2: `soft_delete_booking` على حجز B ← `forbidden`. وعلى حجز لها فيه عربون ← `BOOKING_HAS_ACTIVE_DEPOSIT`.
- S-D3: حذف ملف من `delivery-photos` لحجز B ← مرفوض.

**هـ. RPC (جدول من `information_schema`):** سكربت يعدّ كل `public` functions ويستدعي كل واحدة بالأدوار الخمسة ببيانات تجريبية، ويقارن بقائمة EXECUTE المتوقعة في المصفوفة. **أي دالة قابلة للاستدعاء خارج القائمة = فشل.** هذه هي الطريقة الوحيدة لتغطية ما لا أستطيع فحصه الآن (لا قائمة دوال متاحة لـ `anon` من الخارج).

**و. Server functions:** سكربت يستدعي كل `createServerFn` (35 ملفاً) عبر HTTP بنفس الرؤوس: بلا `Authorization` ← 401؛ بتوكن PhA على موارد B ← `forbidden`؛ توكن غير أدمن على `admin.*` ← `forbidden`.

**ز. حدود المعدّل (كاختبار أمان):** 15 طلب حجز متتالٍ من نفس IP/إيميل ← يُحظر بعد الحد (10/ساعة IP، 6/ساعة إيميل) ❔ سلوك fail-open عند تعطيل الجدول يجب أن يُوثَّق كخطر مقبول أو يُصلَح.

### 3.4 التحويل إلى اختبارات آلية (Security Regression Suite)

1. **مجلد وإعداد منفصلان:** `tests/security/*.test.ts` + `vitest.security.config.ts` (بيئة node، `include: tests/security/**`، مهلة طويلة، تشغيل متسلسل). **لا يدخل في `vitest run` العادي** حتى لا يُشغَّل بالخطأ بلا بيئة.
2. **حارس بيئة:** في `setup` يقرأ `SECURITY_TEST_SUPABASE_URL`؛ يرمي إن لم يحوِ `ysqp`، ويرمي إن حوى `qrpk` أو `ukjk`.
3. **Seed/Teardown:** سكربت خادمي واحد (service role لمرة، من جهازك أو من GitHub Actions عبر secret يخص dev فقط) ينشئ 5 مستخدمين وحجزاً لكل مصوّرة وعقداً وإيصالاً ويُنظّفهم بعد التشغيل. يعيد `JWT` لكل مستخدم.
4. **عملاء:** `createClient(url, anonKey)` ثم `signInWithPassword` لكل دور. لا مفتاح خدمة في ملف الاختبار.
5. **الإخراج:** جدول (كائن × دور × عملية = متوقع/فعلي). أي فرق = فشل. تُحفظ المصفوفة في `docs/` تلقائياً كمرجع.
6. **التشغيل:** (أ) يدوياً قبل كل migration، (ب) في CI (انظر القسم 9، المرحلة 0) على كل PR يلمس `supabase/migrations/**` أو `*.functions.ts`، (ج) ليلياً.
7. **ما يمنع الخداع:** كل اختبار "ممنوع" يجب أن يُقرن باختبار "مسموح" على البيانات نفسها (حتى لا يعود 0 صف لأن الجدول فارغ). هذا ما كان ينقص فحصي بـ `anon` في المرحلة 1.

---

## 4. Communication Infrastructure

### 4.1 الإيميل

**الرسائل (📖 40 قالباً حسب `template:` في الكود):**

| المجموعة | القوالب |
|---|---|
| الحجز: العروس | `booking_received_client`, `booking_verify_code`, `booking_approved_client`, `booking_rejected_client`, `approval_timeout_client`, `deposit_confirmed`, `deposit_reminder_client`, `deposit_overdue_client`, `deposit_refunded`, `booking_cancelled`, `booking_cancelled_by_client`, `event_reminder_24h`, `ready_check`, `balance_due`, `balance_due_7d`, `contract_signed_client`, `contract_sign_reminder`, `gallery_delivered`, `gallery_expiring`, `addendum_new`, `price_offer_client`, `question_answered`, `recover_tracking_links`, `bride_step_up` |
| الحجز: المصوّرة | `new_booking_photographer`, `deposit_sent_photographer`, `approval_reminder_photographer`, `approval_timeout_photographer`, `deposit_overdue_photographer`, `balance_due_7d_photographer`, `event_brief_photographer`, `price_offer_photographer`, `question_photographer`, `unanswered_message_photographer`, `payment_methods_changed`, `booking_cancelled_admin` |
| اشتراك/إدارة | `subscription_expired_today`, `admin_subscription_payment`, `admin_chat_report`, `admin_profile_report` |

**العمليات التي تعتمد على الإيميل (ما سيتعطل إن لم يصل):**

| العملية | بدون إيميل |
|---|---|
| تأكيد طلب العروس | يسقط إلى `auto` (لا تحقق) — أمني |
| إلغاء العروس بعد العربون / قبول ملحق بمبلغ | **يتعطل** (رمز step-up) ⚠️ |
| استرجاع رابط التتبع | **يتعطل** |
| إشعار المصوّرة | يبقى عبر in-app/push/telegram إن فُعّلت |
| تذكيرات العربون/الرصيد/الحدث | تتعطل للعروس (لا بديل إن كان واتساب غير مفعل) |
| تأكيد العربون للعروس | يتعطل إن لم يكن لها حساب أو واتساب |
| تفعيل تجربة المصوّرة/Auth (إعادة كلمة المرور؟) | ❔ الإيميل هنا تتولاه Supabase Auth لا Resend. لم أفحص قوالب Auth |

**SPF/DKIM/DMARC (خطة، دون تنفيذ):**
1. دومين مملوك لك (المهمة التي ما زالت معلّقة).
2. في Resend: Domains ← Add ← ينتج سجلات DNS: **DKIM** (CNAME/TXT)، و**SPF** (TXT على subdomain الإرسال `send.` عادة). تُضاف في DNS (Cloudflare إن كان الدومين عندها).
3. **DMARC:** سجل TXT على `_dmarc.<domain>`: ابدئي بـ `v=DMARC1; p=none; rua=mailto:<عنوان لاستلام التقارير>` لمدة 2-4 أسابيع، ثم `p=quarantine`، ثم `p=reject` حين تثبت أن كل المصادر المشروعة موقّعة. 
4. استخدمي **subdomain للمعاملات** (`mail.domain`) لعزل سمعة الإرسال عن الدومين الرئيسي.
5. تحققي بـ: إرسال إلى Gmail/Outlook/Hotmail وفحص رؤوس `Authentication-Results: spf=pass dkim=pass dmarc=pass`.
6. Resend يتتبع bounces/complaints عبر webhook: يجب ربطه (غير موجود اليوم ✅ لا مسار `hooks/resend`).

**الفشل وإعادة المحاولة (الحال):** `sendEmail` يحاول مرة واحدة، يسجّل `email_log` (sent/failed/skipped)، **لا يعيد المحاولة، لا طابور، لا idempotency، لا يربط بـ bounce** 📖. أخطاء 429 (حد Resend اليومي 100 على Free ✅📚) تُسجَّل failed وتضيع.

**هل نحتاج Email Queue؟ نعم، لكن بسيطاً وداخل Postgres** (لا خدمة جديدة): انظر 4.4. الأسباب: (1) حد Resend، (2) فشل مؤقت، (3) فصل الإرسال عن زمن الطلب (R7)، (4) dedupe.

### 4.2 WhatsApp

| الوظيفة | تعمل بالكود؟ | تتطلب إعداد Meta | الحالة الإنتاجية |
|---|---|---|---|
| إرسال نص حر (`sendWhatsAppText`) | ✅ كود كامل (Graph v21.0) | `WHATSAPP_API_TOKEN` + `WHATSAPP_PHONE_ID` + رقم أعمال مفعّل | **غير مُهيّأ** ✅ (لا secrets) |
| إشعارات مخصصة بقوالب المصوّرة (`sendWhatsAppNotification` + `whatsapp_templates`) | ✅ كود | نفسه. وهذه "قوالب" **داخلية** وليست قوالب Meta المعتمدة | نفس الحالة |
| OTP للحجز (العروس تُرسل الرمز إلى رقم المنصة) | ✅ تصميم ذكي: رسالة **واردة** من العروس تفتح نافذة 24 ساعة، فالرد مجاني ونصّي | `WHATSAPP_PUBLIC_NUMBER` + webhook + `WHATSAPP_APP_SECRET` + `WHATSAPP_VERIFY_TOKEN` | **غير مُهيّأ** ✅ |
| Webhook الوارد | محمي: `X-Hub-Signature-256` (HMAC) + `hub.verify_token` 📖 | secrets أعلاه | يرفض كل شيء الآن (لا secret) ✅ |
| قوالب Meta المعتمدة | ❌ **لا يوجد كود لإرسال `type:"template"`** (بحثت) 📖 | موافقة قوالب في Meta | غير موجود |

**فجوة جوهرية:** كل الرسائل الصادرة نصوص حرة. حسب Meta (📚) النصوص الحرة **تُرسل فقط داخل نافذة 24 ساعة** بعد رسالة من المستخدم؛ خارجها القوالب فقط. لذلك تذكيرات "ادفعي العربون" أو "موعدك غداً" **ستفشل** مع العروس التي لم تراسلنا خلال 24 ساعة، حتى بعد ضبط Meta. نصف قنوات التذكير الحالية لن تعمل بلا قوالب معتمدة ومسارها في الكود.

**التكلفة (📚):** تسعير لكل رسالة منذ 2025-07-01؛ فئات utility/authentication/marketing/service؛ **الرسائل من المستخدم إلى المنصة مجانية**؛ سعر الأردن في جدول rate card (لم أستخرجه، لا أذكر رقماً). 

**البديل إن لم يصل OTP واتساب (دون تفعيله إلزامياً، كما قررتِ):** طبقات متدرجة، لا اعتماد على قناة واحدة:
1. **إيميل OTP** بعد توثيق الدومين.
2. **رابط واتساب مُعبَّأ** (`wa.me/<رقم>?text=<رمز>`): العروس تضغط وترسل. لا يتطلب Cloud API للإرسال، لكن **الاستقبال** يتطلب webhook. بدون Cloud API يمكن فتح الرقم يدوياً (مصوّرة ترى الرسالة): غير مؤتمت.
3. **عدم التوثيق كحاجز، بل كإشارة:** الطلب غير الموثّق يُوسَم "رقم غير مؤكد"، يظهر للمصوّرة بتمييز، **ولا يحجز اليوم** (أو يحجزه لـ 30 دقيقة فقط) حتى تردّ المصوّرة بالموافقة. هذا يعالج date-squatting دون قناة ثالثة.
4. **Turnstile** (مجاني) على نموذج الطلب.
5. **حد طلبات غير موثّقة لكل مصوّرة** (مثلاً 3 معلّقة).
6. مزوّد SMS/OTP محلي: **خارج نطاق ما أستطيع تسعيره**، قرار تجاري لاحق.

### 4.3 Push & In-App

| الجانب | الحال 📖 |
|---|---|
| In-app | جدول `notifications` يُدرَج مباشرة بـ `supabaseAdmin` من عشرات الأماكن (بلا مركز) |
| Push | `push.server.ts`: VAPID، TTL 24 ساعة، urgency high، حذف الاشتراكات الميتة (404/410) ✅ جيد. بلا إعادة محاولة. لم تُختبر من جهاز حقيقي |
| Telegram | `telegram.server.ts`، يعمل عند الربط |
| منع التكرار | **لا آلية موحدة.** التذكيرات تستعمل `reminders_sent` (مصفوفة على الحجز) وتُعلَّم **قبل** الإرسال (`mark` ثم `notify`)، أي "على الأكثر مرة" لا "مرة بالضبط": فشل الإرسال بعد الوسم = إشعار ضائع إلى الأبد. أما الإشعارات غير التذكيرية فلا dedupe: إعادة محاولة العروس أو تكرار webhook قد يكرر الإشعار |
| ضياع الإشعارات | ممكن: قنوات متسلسلة داخل الطلب، كل فشل يُبتلع (`console.error`)، لا سجل إرسال موحد (يوجد `email_log` فقط و`whatsapp_log` معزول) |

### 4.4 Architecture مقترحة موحّدة: Outbox داخل Postgres

```
حدث (حالة تغيّرت)
   │   مصدر الحدث: دالة SQL/trigger (الأفضل) أو server function
   ▼
notify(event_kind, entity_id, recipient)  ─── INSERT ─►  notification_outbox
                                                          (في نفس معاملة تغيير الحالة)
   • dedupe_key UNIQUE = kind|entity_id|recipient|version   ← يمنع التكرار
   • channels[]  = مشتقة من (نوع الحدث + تفضيلات المستلم + ما هو مُهيّأ)
   • status, attempts, next_attempt_at, last_error
   ▼
Worker الصرف (cron كل دقيقة + عند الطلب):  SELECT … FOR UPDATE SKIP LOCKED LIMIT n
   ├─ in-app    : فوري (نفس المعاملة، لا يفشل)
   ├─ push      : مع حذف الاشتراكات الميتة
   ├─ telegram
   ├─ email     : Resend + تتبع bounces
   └─ whatsapp  : نص حر داخل النافذة، وإلا قالب معتمد
   ▼
delivery_log (لكل قناة: sent / failed / bounced / delivered، provider_id)
   ▼
سياسة fallback مرتّبة لكل نوع حدث (مثلاً: ما يتعلق بمال = in-app + push + email + whatsapp؛ تذكير = قناة واحدة مفضّلة)
```

مبادئ:
1. **الكتابة في الـ outbox ضمن معاملة تغيير الحالة** (يحل "فشل الإشعار بعد نجاح الحجز": الحدث لا يضيع، وإن فشل الإرسال يُعاد).
2. **`dedupe_key` فريد** يحل التكرار (لا حاجة لـ `reminders_sent`، وتُبقى للتوافق).
3. **قنوات معرّفة بسجل (registry)**: نوع الحدث ← القالب ← القنوات ← الأولوية. إضافة حدث = سطر واحد بدل 5 `try/catch`.
4. **Backoff:** 1د، 5د، 30د، 3س، ثم `dead` + تنبيه أدمن.
5. **تفضيلات:** `profiles.notification_preferences` موجود 📖؛ يُوحَّد استعماله.
6. **Notification Center موحد (واجهة):** نعم، لكن **ثانياً**. الأولوية للـ outbox (موثوقية)، ثم تجميع الواجهة فوق جدول `notifications` الموجود.
7. **Cloudflare Queues** بديل لاحق عند ضغط (يتطلب Paid)؛ Postgres-outbox يكفي حتى آلاف الرسائل في اليوم ويبقي كل شيء قابلاً للتدقيق بـ SQL.

---

## 5. Booking State Machine

### 5.1 المحاور (الواقع الحالي مفرّق على أعمدة، وليس حالة واحدة)

الحالة الفعلية = **تركيبة** من:
- `status` (enum): `quote` (قديم/عرض سعر)، `pending_deposit`، `confirmed`، `completed`، `cancelled` 📖
- أعلام: `deleted_at`، `phone_verified_at`، `needs_approval`، `approved_at`، `deposit_sent_at`، `deposit_proof_url`، `deposit_confirmed_at`
- `production_stage`: `awaiting → shooting → selecting → editing → ready → delivered` 📖 (CHECK)
- ختم: `client_received_at`، `final_paid_at`، `refund_status`

**التوصية:** لا نغيّر الـ schema. نعرّف **حالة منطقية مشتقة** `booking_phase` بدالة SQL (VIEW)، تقرأها الواجهتان (مصوّرة وعروس) فتتطابق الرؤية (يحل التباين المذكور في المرحلة 1).

### 5.2 الحالات المنطقية المقترحة (مشتقة)

| الرمز | الشرط (مبسّط) | من يتحرك | الخطوة التالية |
|---|---|---|---|
| `DRAFT_UNVERIFIED` | `pending_deposit` + `phone_verified_at IS NULL` | العروس | توثيق، أو حذف ناعم بعد ساعتين |
| `AWAITING_APPROVAL` | verified + `needs_approval` + `approved_at IS NULL` | المصوّرة | موافقة/رفض، أو إلغاء تلقائي بعد 24/48/72 س |
| `AWAITING_DEPOSIT` | `pending_deposit` + approved (أو لا يحتاج) + `deposit_sent_at IS NULL` | العروس | تحويل CliQ وإيصال. **لا مهلة** |
| `DEPOSIT_PROOF_SENT` | `deposit_sent_at` موجود + لم يُؤكَّد | المصوّرة | تأكيد/رفض. **لا مهلة ولا تذكير** ⚠️ |
| `CONFIRMED` | `confirmed` | الطرفان | توقيع عقد، تصوير |
| `IN_PRODUCTION` | `confirmed` + `production_stage ∈ {shooting…ready}` | المصوّرة | تسليم |
| `DELIVERED` | `completed` + `delivered` | العروس | تأكيد استلام + تقييم |
| `CLOSED` | `client_received_at` | — | نهائي |
| `CANCELLED_*` | `cancelled` + (`cancelled_by`/`auto_cancel_kind`) | — | نهائي، مع `refund_status` |
| `DELETED` | `deleted_at` | — | نهائي |

### 5.3 الانتقالات (مسموح / ممنوع) مع التنفيذ الحالي

| من → إلى | مسموح؟ | من ينفّذ | أين يُفرض اليوم |
|---|---|---|---|
| (جديد) → DRAFT_UNVERIFIED | ✅ | العروس | RPC `create_booking_guarded` |
| DRAFT → AWAITING_APPROVAL | ✅ | العروس (رمز) أو `auto` | `markBookingVerified` |
| DRAFT → DELETED | ✅ | cron | `expire_unpaid_bookings` (بعد ساعتين) |
| AWAITING_APPROVAL → AWAITING_DEPOSIT | ✅ | المصوّرة | `approveBookingRequest` (JS: `.is("approved_at", null)`) |
| AWAITING_APPROVAL → CANCELLED | ✅ | المصوّرة (رفض) / cron (مهلة) | JS + SQL |
| AWAITING_DEPOSIT → DEPOSIT_PROOF_SENT | ✅ | العروس | RPC `client_mark_deposit_sent` |
| DEPOSIT_PROOF_SENT → CONFIRMED | ✅ | المصوّرة | JS `confirmBookingAfterDeposit` (يتحقق من الحالة بشرط `.in(...)` في UPDATE) |
| AWAITING_* → CANCELLED | ✅ | العروس (`client_cancel_booking`) أو المصوّرة | RPC |
| CONFIRMED → CANCELLED | ✅ | الطرفان | `cancel_booking` / `client_cancel_booking` (يتطلب step-up بريد للعروس) |
| CONFIRMED → CONFIRMED (نقل موعد) | ✅ | العروس توافق على ملحق المصوّرة | `respondAddendum` |
| CONFIRMED → DELIVERED | ✅ | المصوّرة (مرحلة `delivered` + شرط رابط/صور) | `updateProductionStage` ← يضع `completed` |
| DELIVERED → CONFIRMED (رجوع) | ✅ إن لم تؤكد العروس الاستلام | المصوّرة | `updateProductionStage` |
| DELIVERED → CLOSED | ✅ | العروس | RPC `client_mark_received` |
| CANCELLED → أي شيء | ❌ يُفترض | — | **لا حارس DB**. JS فقط (`.in("status",…)`) |
| COMPLETED → CANCELLED | ❌ | — | `cancel_booking` يمنعها 📖، `admin.functions.ts:499` أيضاً |
| `pending_deposit → quote` | ⚠️ مسموح في JS (`ALLOWED`) | المصوّرة | `updateBookingStatus`. معنى `quote` في النظام الحالي غير واضح (حالة قديمة) |
| DEPOSIT_PROOF_SENT → AWAITING_DEPOSIT (رفض الإيصال) | ❓ **لا مسار صريح** | المصوّرة | لا أرى دالة ترفض الإيصال وتطلب إعادة رفعه ❔ (بحثت `deposit_proof` فقط في مسارات التأكيد) |
| أي → حالة بكتابة مباشرة من المتصفح | ❌ | | trigger `guard_booking_direct_updates` ✅ |

**الفجوة:** آلة الحالة منفّذة في **ثلاثة أماكن** (JS، RPCs، trigger الحماية) بلا تعريف واحد ولا حارس انتقال في DB. الـ trigger الحالي يمنع تغيير الحقول من **المتصفح** فقط (`current_user <> 'authenticated'` يتخطاه)، فالحماية لا تغطي أخطاء الخادم نفسه.

### 5.4 حالات قد تعلق فيها المعاملة (Stuck) أو يتعارض فيها الطرفان

| # | الحالة | ماذا يراه كل طرف | الخطورة | الإصلاح |
|---|---|---|---|---|
| ST1 | `DEPOSIT_PROOF_SENT` بلا رد المصوّرة | العروس: "أرسلتُ الإيصال، بانتظار التأكيد". المصوّرة: لا تذكير آلي ✅ (الـ cron لا يلتقط هذه الحالة: السطر 134 يستبعد `deposit_sent_at IS NOT NULL`) | **عالية** (مال العروس معلّق، والتاريخ محجوز) | تذكير 12 س/48 س للمصوّرة، ثم تنبيه للأدمن/دعم عند 72 س |
| ST2 | `AWAITING_DEPOSIT` أبدية | العروس ترى "الموعد النهائي 48 س" تنتهي بلا حدث؛ المصوّرة لا تعلم | متوسطة (B-2) | نص صادق + بطاقة للمصوّرة + "مدّدي/ألغي" |
| ST3 | إيصال خاطئ/غير مقروء | لا مسار "ارفعي إيصالاً جديداً" ❔ | متوسطة | حالة `DEPOSIT_PROOF_REJECTED` مع سبب |
| ST4 | العروس لا تستلم وتؤكد (`DELIVERED` بلا `client_received_at`) | التقييم لا يُفتح؛ المصوّرة لا تُغلق | منخفضة | تأكيد تلقائي بعد X يوماً (قرار) |
| ST5 | المصوّرة لا تسلّم بعد `delivery_due_at` | العروس ترى "متأخر"؟ ❔ لم أتحقق من التصعيد | متوسطة | تذكير ثم تنبيه دعم |
| ST6 | انتهاء الاشتراك مع حجوزات مؤكدة | الصفحة العامة تختفي؛ الحجوزات تعمل (✅ مقصود) | منخفضة، لكن المصوّرة قد لا تعلم أنها تدير حجوزات بلا اشتراك | رسالة واضحة |
| ST7 | المصوّرة تحذف حسابها: ترفض إن وُجدت حجوزات قادمة مؤكدة/معلّقة | الحجوزات `completed` السابقة والمدفوعة... تبقى؟ | منخفضة | سياسة احتفاظ وخصوصية موثّقة |
| ST8 | مصوّرة محظورة/محذوفة والعروس لديها رابط تتبع | `get_booking_by_token` يعتمد على join مع profiles؛ إن أُخفي الملف ❔ | متوسطة | اختبار |
| ST9 | استرداد `refund_status='pending'` بلا إغلاق | لا مسار تأكيد "تم الاسترداد" واضح ❔ (يوجد `admin.refunds`) | متوسطة | حالة `refunded` + دليل |
| ST10 | الطلب غير الموثّق في وضع `auto` | المصوّرة ترى طلباً بلا تحقق، العروس تظن أنها وُثّقت | متوسطة | وسم صريح |

### 5.5 توثيق كل انتقال (من، متى، لماذا)

**الوضع الحالي ✅📖:**
- trigger `log_booking_changes` يكتب في `audit_logs` عند تغيير (status, total_price, deposit_confirmed_at, deleted_at) **لكن `actor_id = auth.uid()`**. وكل الكتابات المهمة تمر عبر `supabaseAdmin` (service role) ← `auth.uid()` = **NULL**. أي أن سجل التدقيق التلقائي لا يعرف **من** فعل في معظم الحالات.
- لا يسجل `event_date/start_time/end_time` (نقل الموعد)، ولا `approved_at`، ولا `deposit_sent_at`، ولا **السبب**.
- ثم تُدرج server functions سجلاتها الخاصة بعد الكتابة (`audit_logs.insert` بلا معاملة، وتُبتلع أخطاؤها: `booking.functions.ts:679-688`). فالسجل **قد يفقد** حدثاً ولا يمكن إثبات عدم فقدانه.

**المقترح: جدول `booking_events` (append-only) + trigger + سياق الفاعل:**

```sql
CREATE TABLE public.booking_events (
  id          bigserial PRIMARY KEY,
  booking_id  uuid        NOT NULL,                 -- بلا FK cascade: السجل يبقى
  at          timestamptz NOT NULL DEFAULT now(),
  kind        text        NOT NULL,                 -- 'status','reschedule','approve','deposit_sent','deposit_confirmed','delete','price'...
  from_status public.booking_status,
  to_status   public.booking_status,
  actor_id    uuid,                                  -- null = نظام
  actor_role  text,                                  -- 'photographer'|'bride'|'admin'|'system'|'webhook'
  reason      text,
  meta        jsonb NOT NULL DEFAULT '{}'
);
ALTER TABLE public.booking_events ENABLE ROW LEVEL SECURITY;
-- قراءة: صاحبة الحجز والأدمن. لا INSERT/UPDATE/DELETE لأي دور مستخدم.
```

**سياق الفاعل (المشكلة التقنية):** استدعاءات supabase-js المنفصلة ليست معاملة واحدة، فلا يمكن `set_config` ثم UPDATE في استدعاءين. الحل: **كل تغيير حالة يمر بدالة SQL واحدة** `transition_booking(_id, _action, _actor, _actor_role, _reason, _meta)` تضبط `set_config('app.actor', …, true)` ثم تنفّذ التحديث ضمن معاملة واحدة، وtrigger `AFTER UPDATE` يقرأ `current_setting('app.actor', true)`. 

**مراحل التبنّي بلا كسر:**
1. **A (أمن للغاية):** أضيفي الجدول و`AFTER` trigger يسجّل التغييرات **بفاعل مجهول** إن لم يوجد سياق. لا يمنع شيئاً. يعطي سجلاً كاملاً للتغيير فوراً، ويكشف أي مسار كتابة لم يمر بالدالة.
2. **B:** حوّلي المسارات واحداً واحداً إلى `transition_booking` (الأخطر أولاً: confirm, cancel, reschedule).
3. **C:** حين لا يبقى مسار بلا فاعل، فعّلي **حارس الانتقال**: trigger يرفض أي تغيير `status` لا يمر عبر الدالة (`current_setting('app.in_transition')`) أو لا يقع ضمن جدول الانتقالات المسموحة المخزَّن في جدول `booking_transitions(from,to,allowed_roles)`.
4. تُشتق من `booking_events` شاشة "سجل الحجز" لكل من المصوّرة والأدمن (ويحل نزاعات "من فعل ماذا").

---

## 6. Performance Optimization Plan

### 6.1 Baseline المُقاس ✅ (بناء 2026-11-24 مع sourcemap)

الحزمة الرئيسية (تُحمَّل في **كل** صفحة): `index-D3gJVBxl.js` = **1,640,510 B خام / 490,965 B gzip**. مساهمة كل مصدر داخلها (بايت **مُصغَّرة قبل الضغط**، حُسبت بتجميع خريطة المصدر؛ المجموع المُسنَد 1,463,240):

| الملف / المكتبة | الحجم في المدخل | النسبة | ما هو |
|---|---|---|---|
| **`src/i18n/en.json`** (ظهر في الخريطة تحت `sonner.tsx` لاندماج الوحدات؛ الملف الفعلي `sonner.tsx` = 757 B فقط) | **≈ 394,700 B** | **27%** | قاموس الإنجليزية: 4,489 مفتاحاً، 545,589 B خاماً، 153,785 B gzip منفرداً ✅. مُستورد **ثابتاً** في `src/i18n/index.ts:3` ويُرسَل لكل زائر عربي، وهو غير مستعمل في الواجهة العربية |
| `react-dom` | 209,930 | 14% | لا بديل |
| `framer-motion` | 115,622 (+ `motion-dom` 4,778) | 8% | `__root.tsx` يستورد `motion, AnimatePresence, LazyMotion, MotionConfig` |
| `@supabase/*` (auth-js 104,596، realtime 32,767، phoenix 25,853، storage 22,995، postgrest 17,484، supabase-js 11,240، iceberg 5,400) | ≈ 220,000 | 15% | `__root.tsx` يستورد عميل Supabase ثابتاً. `realtime-js`+`phoenix` (≈ 58 KB) مرجّح عدم استعمالها في الصفحات العامة ❔ |
| `@tanstack/router-core` + `react-router` + `query-core` + `seroval` + `start-client-core` + history/store | ≈ 150,000 | 10% | أساس |
| `tailwind-merge` | 27,866 | 2% | |
| `sonner` | 34,749 | 2% | Toaster موجود في الجذر |
| `lenis` | 18,735 | 1% | تمرير ناعم |
| `src/content/blog.ts` + `seo.ts` | 18,371 + 13,292 | 2% | نص محتوى يُحمَّل دائماً |
| `cmdk` + `CommandPalette` | 11,864 + 4,508 | 1% | لوحة أوامر للمصوّرات |
| `PhotographerTour` / `ClientTour` / `BrideGame` / `FirstVisitIntro` / `ManualBookingSheet` | 10,498 / 4,923 / 5,942 / 6,578 / 8,925 | 2% | كلها في المدخل |
| `lucide-react` | 10,580 | 1% | |
| أخرى (radix، react-remove-scroll…) | الباقي | | |

أحجام أخرى ✅:
- `index-BEUtK68J.js` 482,705 B (gz 159,775) — لم أحلل محتواه (يُحمَّل في صفحات معينة؛ **يحتاج تحليلاً** بالسكربت نفسه).
- أكبر chunks المسارات: `_username` 94 KB، `dashboard.bookings._id` 91 KB، `search` 84 KB، `calendar` 81 KB (`react-day-picker`)، `track._token` 56 KB، `browser-image-compression` 53 KB.
- CSS: `styles-CDESOvFk.css` 244,967 B (gz **43,368 B**). `styles.css` يستورد **20 عائلة خطوط** (@import لـ fontsource: Amiri, Aref Ruqaa, Cairo, Alexandria, Reem Kufi, Readex Pro, Noto Naskh, Jost, Geist, Playfair, Cormorant, Fraunces, EB Garamond, Newsreader, Bodoni, DM Serif, Instrument Serif, El Messiri…) ✅. ملفات الخطوط في البناء: **63 woff2 (1.73 MB) + 9 woff (0.46 MB)**.
- الصورة الرئيسية: `hero-bride-*.jpg` = 110,216 B، `fetchPriority=high` ✅. صور الديمو في `public/demo` ≈ 2.1 MB (أكبرها ~254 KB). `og-default.png` 216 KB.
- الصفحة الرئيسية الحية تُنزّل المدخل (≈ 498 KB على السلك ✅) + chunk صغير ≈ 10 KB + 4 صغيرة. أي أن المدخل ≈ 98% من JS الصفحة الرئيسية.

**كيف تُعاد القياسات (لتتبع التقدّم، قابلة للتكرار):** `npx vite build --sourcemap` ثم سكربت Node (ملحق A في نهاية القسم) يجمّع بايتات الخريطة حسب الحزمة. أقترح تثبيته كـ `scripts/bundle-report.mjs` ويُشغَّل في CI مع ميزانية تفشل البناء إن تجاوزها المدخل.

### 6.2 ما يجب أن يبقى في Initial Bundle (الحد الأدنى للتفاعل الأول)
`react`, `react-dom`, TanStack router/start/query core، `tailwind-merge`، الجذر (Header/Footer/Theme)، `sonner` (يمكن تأجيله لأول toast)، **عميل Supabase مصغّر للصفحات العامة؟** (قرار مرحلة 2، انظر أدناه)، وCSS الحرج.

### 6.3 الخطة على مراحل، بجدول (الأحجام "بعد" تقديرية ❔ ما لم يُقَس لاحقاً)

الأحجام تقريب من البايتات المُصغَّرة أعلاه ونسبة ضغط 0.28-0.35 (النسبة المُقاسة لكامل المدخل 0.30؛ لـ `en.json` وحده 0.28 ✅).

**المرحلة 0 — Baseline وبوابة:** سكربت التقرير، ميزانية، لقطة بداية. (لا مخاطرة.)

**المرحلة 1 — الأعلى عائداً، أقل مخاطرة**

| الملف / المكتبة | الحجم الحالي (مُصغّر) | طريقة التحسين | بعد التحسين (تقدير) | المخاطر | الاختبار |
|---|---|---|---|---|---|
| `en.json` | ≈ 395 KB (≈ 110-130 KB gz ❔) | لا يُستورد ثابتاً. **عربي (الافتراضي):** `t()` يعيد المفتاح ولا يحتاج القاموس. **إنجليزي:** الخادم يستورده ويُدرجه في HTML كـ JSON فقط حين `lang=en` (`getLang()` يعرف ذلك في SSR)، أو `dynamic import()` قبل أول رسم. التبديل يعمل أصلاً بإعادة تحميل كاملة (`setLang` → `location.replace`) فلا حاجة لتحديث حي | **−395 KB للعرب** (يبقى للإنجليزية كما هو) | متوسط-منخفض: `t()` تستدعى في طور الاستيراد (ثوابت على مستوى الوحدة؟ يجب فحص كل استدعاء خارج الدوال)، وSSR hydration mismatch إن اختلف القاموس بين الخادم والعميل | نفس الصفحات بـ `?lang=en` و`ar`: لقطات نصية متطابقة قبل/بعد؛ اختبار hydration بلا تحذيرات؛ `grep` لاستدعاءات `t(` على مستوى الوحدة |
| `src/content/blog.ts`, `seo.ts` | 31.6 KB | `import()` داخل مسارات `blog.*` و`SeoLanding`/صفحات المدن | −30 KB | منخفض | زيارة `/blog`, `/blog/<slug>`, `/wedding-photographer/amman` وفحص المحتوى وSEO (HTML الخادم يجب أن يبقى مكتملاً) |
| `PhotographerTour`, `ClientTour`, `BrideGame`, `GameHint`, `FirstVisitIntro`, `CommandPalette`+`cmdk`, `PwaInstallPrompt` | ≈ 45 KB | `React.lazy` + `Suspense` بـ `fallback={null}`، وتحميلها بعد `requestIdleCallback`/عند الحاجة (الجولة تظهر لمن لم يرها، اللعبة عند فتحها، اللوحة عند Ctrl+K) | −45 KB | منخفض: تغيّر توقيت الظهور ملحوظ لـ `FirstVisitIntro` (يجب أن يبقى بلا وميض). **لا تغيير بصري** | لقطات الشاشة قبل/بعد على أول زيارة وزيارة عائدة؛ مسار الجولة يعمل |
| `ManualBookingSheet` (في المدخل!) | 8.9 KB | lazy داخل لوحة المصوّرة | −9 KB | منخفض | فتح الورقة وإنشاء حجز يدوي على Dev |

**المرحلة 2 — أثر كبير، يحتاج حذراً**

| الملف / المكتبة | الحالي | طريقة التحسين | بعد (تقدير) | المخاطر | الاختبار |
|---|---|---|---|---|---|
| `framer-motion` | 116 KB (+5) | الجذر يستخدم `LazyMotion` أصلاً: تأكدي أن كل الاستخدامات `m.*` لا `motion.*` (الأخير يفرض الحزمة الكاملة)، وأن `domAnimation` تُحمَّل `async`. نقل `AnimatePresence`/الانتقالات المعقّدة إلى مسارات لوحة التحكم | −40 إلى −60 KB ❔ | **متوسط**: يمسّ Elastic motion (هوية المالك). لا حذف حركة | مقارنة بصرية للحركات الـ 12، ولقطات فيديو قصيرة؛ `prefers-reduced-motion` |
| عميل Supabase (`auth-js`, `realtime-js`, `phoenix`, `storage-js`, `postgrest`) | ≈ 220 KB | الصفحات العامة (رئيسية، بحث، مصوّرة، تتبع) تعمل عبر server functions. إن أمكن: تحميل العميل `import()` عند أول حاجة لجلسة (لوحة، تسجيل دخول). **`realtime-js`+`phoenix`** يُستبعدان إن لم يُستخدم Realtime (`createClient` مع `realtime: {…}` لا يمنع التضمين؛ الحل بحزمة `@supabase/*` الفرعية أو alias) | −100 إلى −200 KB ❔ | **مرتفع**: `__root.tsx` يربط حالة الجلسة والتنقل. فشل = مستخدمة تُخرَج أو تفقد جلستها | اختبار تسجيل الدخول/الخروج/تجديد الجلسة/إعادة التحميل على Dev بمصوّرة وعروس؛ حالة SSR المحمية |
| `lenis` | 18.7 KB | import ديناميكي بعد أول تفاعل/إيقاف على الأجهزة اللمسية | −18 KB | منخفض-متوسط (يؤثر على سلاسة التمرير = تجربة) | قياس INP قبل/بعد على جهاز حقيقي |
| `sonner` | 34.7 KB | `Toaster` يُحمَّل عند أول `toast()` (واجهة وسيطة) | −35 KB | متوسط: `installFriendlyToasts` في الجذر يلتقط الأخطاء ويعرض toasts؛ يجب ألا يضيع أول خطأ | اختبار أول toast بعد التحميل |
| `tailwind-merge` | 27.9 KB | غالباً داخل `cn()`. يبقى. تقليل بالتفريع صعب | 0 | — | — |

**المرحلة 3 — بنيوية (بعد الاستقرار):** تقسيم المدخل بـ `manualChunks` حسب (react)، (tanstack)، (supabase)، (ui) لتحسين التخزين المؤقت عبر النشرات (تغيير كود تطبيقي لا يبطل `react-dom`). ميزانية CI.

### 6.4 توقعات الحجم بعد المراحل (تقدير، لا قياس)

| بعد | JS للمدخل (مُصغّر ❔) | gzip تقريبي ❔ |
|---|---|---|
| الآن ✅ | 1,640 KB | **491 KB** |
| المرحلة 1 | ≈ 1,160 KB | ≈ 330-350 KB |
| + المرحلة 2 | ≈ 880-980 KB | ≈ 250-290 KB |
| **أرضية واقعية** (react-dom + router + query + seroval + تطبيق) | ≈ 600-700 KB | ≈ 190-220 KB |

**هدف الميزانية المقترح:** المدخل ≤ 300 KB gzip بعد المرحلة 2 (يحل الجزء الأكبر)، وهدف مرحلة لاحقة ≤ 220 KB. هذه **أهداف**، وستُراجَع بعد القياس الفعلي. 

### 6.5 الخطوط والصور

- **20 عائلة خطوط** مستوردة، منها عائلات لا يستعملها أي نص على الأرجح (لم أمسح الاستخدام الفعلي) ❔. ما يحدث: ملف CSS يعرّف `@font-face` لكل subsets (63 woff2)، والمتصفح **لا ينزّل إلا ما يلزم** بفضل `unicode-range`. فالمشكلة الأساسية ليست التنزيل بل **CSS (43 KB gz) يحجب الرسم** + تنزيل الخط الأول (Arabic) عند أول نص.
- اقتراح مرحلة 1ب: (أ) قياس أي خط يُنزَّل فعلاً لكل صفحة (Network panel) لتحديد الخطوط الميتة، (ب) حذف import غير المستعمل (آمن)، (ج) `font-display: swap` + `preload` لخطّ العنوان العربي فقط، (د) `Amiri`/`Aref Ruqaa` ثقيلة (عربية كاملة)؛ تحميلها فقط حيث تُستخدم (شعار/عناوين).
- **ملاحظة قرار المالك:** لا تغيير بصري. حذف خط غير مستعمل لا يغيّر شيئاً؛ استبدال خط مستعمل **ممنوع**.
- الصور: الـ hero 110 KB مقبولة. صور المصوّرات تأتي من Supabase Storage (غير مقاسة). المطلوب: `srcset` + WebP/AVIF عبر ضغط عند الرفع (`browser-image-compression` موجود ✅)، وإبعاد `og-default.png` (216 KB) إلى JPEG/WebP ≈ 60 KB.

### 6.6 SSR وتخزين HTML

- 📖 `src/server.ts` يقرأ كل HTML (`response.clone().text()`) ثم يحقن nonce وhreflang ثم يعيد سلسلة كاملة. نتائج: يُلغي البث، يضيف لحظة توقف قبل أول بايت، يحجز ذاكرة (128 MB للـ isolate 📚)، ويزيد CPU (regex على كامل الصفحة). الصفحات الحالية صغيرة (7-12 KB ✅) فالأثر اليوم محدود، لكنه سيكبر مع صفحات أغنى.
- **الحل المقترح:** `HTMLRewriter` (مدمج في Workers): `.on("script", {element(e){e.setAttribute("nonce", n)}})` و`.on("style", …)` و`.on('link[rel="canonical"]', {element(e){ e.after(hreflangTags, {html:true}) }})`. يعمل بثّاً بلا تخزين. أدق من regex (لا يمس نص يحوي `<script`).
- **ملاحظة:** هل `TanStack Start` يبث أصلاً؟ لا أعرف إن كان الرد ينتج بثاً فعلياً أم نصاً كاملاً (h3). اختبار: قياس TTFB مع صفحة تحوي تأخيراً في loader قبل/بعد. ❔
- الكاش: صفحات عامة (`/pricing`, `/faq`, `/for-*`, مدونة) يمكن تخزينها على الحافة بـ `Cache-Control: s-maxage` — لكن **nonce في CSP فريد لكل رد**، فتخزين HTML يتعارض معه. الحل: الصفحات العامة بلا nonce (`'sha256-…'` للنصوص المضمّنة) أو لا تخزين HTML وتخزين البيانات فقط. قرار تصميم يُحسم لاحقاً.

### 6.7 أهداف أداء واقعية للموبايل

(عتبات "Good" المنشورة من web.dev: LCP ≤ 2.5 s، INP ≤ 200 ms، CLS ≤ 0.1، عند الشريحة 75% من المستخدمين الحقليين.)

| المقياس | هدف الإطلاق | هدف لاحق | ملاحظة |
|---|---|---|---|
| LCP (الرئيسية، 4G، هاتف متوسط) | ≤ 3.0 s | ≤ 2.5 s | لم يُقَس. الأساس غير معروف ❌ |
| INP | ≤ 200 ms | ≤ 150 ms | يحتاج جهازاً حقيقياً |
| CLS | ≤ 0.1 | ≤ 0.05 | ✅ الصفحة تحجز مساحات؟ ❔ |
| JS للمدخل gzip | ≤ 300 KB | ≤ 220 KB | من 491 KB |
| JS الكلي للصفحة العامة | ≤ 450 KB gz | ≤ 350 KB | |
| HTML TTFB (حافة) | ≤ 600 ms | ≤ 300 ms | ✅ القياسات الأولية: 60-560 ms (عيّنة واحدة) |

**قياس بالفعل (يتطلب بيئة لا أملكها):** Lighthouse CI على `vite preview`، وWebPageTest على Moto G-class بـ 4G محاكى، وبيانات حقلية عبر Web Vitals → Sentry/GA (لا `onLCP`/`web-vitals` في الكود ❔ لم أبحث).

### ملحق A — سكربت تحليل الحزمة (قابل لإعادة الاستعمال)
```js
// scripts/bundle-report.mjs (مقترح): node scripts/bundle-report.mjs .output/public/assets/index-*.js
// يستخدم source-map-js (موجود في node_modules) ويجمّع طول كل mapping حسب node_modules/<pkg> أو مسار src.
```
(النسخة التي شغّلتها محفوظة في مجلد جلستي المؤقت؛ أعيد كتابتها في المستودع بطلبك.)

---

## 7. Launch Simulation (يوم عمل بعد 30 يوماً)

الافتراض: Dev/Prod كما هو اليوم + إصلاحات المرحلة 1 المعتمدة، دون دومين ما لم يُذكر. ❌ = يتعطل اليوم، ⚠ = هش، ✅ = يعمل كما فهمتُ من الكود.
**المفتاح:** [آلي] يحدث تلقائياً · [م] تتدخل المصوّرة · [أ] الأدمن · [د] فريق الدعم/أنتِ.

| # | الخطوة | ما يجب أن يحدث | أين قد يتعطل | الجهة |
|---|---|---|---|---|
| 1 | تسجيل مصوّرة جديدة | Google One Tap أو إيميل/كلمة مرور، تُنشأ `profiles` + `subscriptions` تجربة 14 يوماً (trigger `handle_new_user`) | ⚠ إيميل Supabase Auth (تأكيد/إعادة كلمة المرور) يمر بمزوّد Supabase الافتراضي (محدود ويُصنَّف spam). ❔ لم أفحصه. Google One Tap لا يظهر على Brave (موثّق) | [آلي] + [د] |
| 2 | إنشاء الصفحة | onboarding: اسم، `username`، حد أدنى من الصور لتصبح علنية (`enforce_min_photos_to_publish`) | ⚠ ضغط الصور من هاتف قديم، ربط الاسم المستخدم المتكرر | [م] |
| 3 | الباقات والصور | `dashboard.pricing`، إفصاح إلزامي بكل باقة، حد Basic 3 باقات/20 صورة | ⚠ نموذج طويل على الموبايل. رفع صور بحجم كبير على شبكة ضعيفة | [م] |
| 4 | استقبال طلب عروس | `submitBookingRequest` | ❌ تحقق الرقم غير موجود (auto) ← طلب غير موثّق يصل المصوّرة. ❌ لا Turnstile. إشعار المصوّرة: in-app ✅، push ❔ لم يُختبر، إيميل لها: يصل **لأن إيميل المصوّرة يجب أن يكون صاحب حساب Resend** ❌ ← **إيميلات المصوّرات الأخريات لا تصل** (sandbox)، Telegram ✅ إن ربطته | [آلي] |
| 5 | الموافقة | `approveBookingRequest` | ✅ منطق سليم. ⚠ إشعار العروس بالموافقة: إيميل ❌ (sandbox)، واتساب ❌ (غير مُهيّأ)، in-app لا حساب لها ← **العروس لا تعلم بالموافقة إلا إن فتحت رابط التتبع بنفسها** ❌ | [م] + [آلي]✗ |
| 6 | دفع العربون | CliQ يدوي + إيصال + مرجع + اسم ✅ | ⚠ العروس تحتاج الرابط (محفوظ؟ ضاع؟ استرجاعه بالإيميل ❌). المصوّرة لا تُذكَّر بتأكيد التحويل (ST1) | [م] |
| 7 | توقيع العقد | عقد من القالب تلقائياً عند التأكيد، رابط توقيع، قفل SHA-256 | ⚠ العروس تحتاج إخطاراً برابط التوقيع (إيميل ❌، واتساب ❌) ← تعتمد على رسالة المصوّرة اليدوية. تذكير `contract_sign_reminder` يعتمد الإيميل ❌ | [م] |
| 8 | الإشعارات | outbox غير موجود؛ قنوات متسلسلة | ❌ كما ذُكر. لا قياس لمعدل الوصول | [آلي]✗ |
| 9 | تغيير موعد الحجز | المصوّرة تقترح ملحق `reschedule`، العروس توافق (بكود step-up من الإيميل) | ❌ الرمز لا يصل ← العروس لا تستطيع الموافقة؛ ⚠ سباق التاريخ (B-1). العروس لا تبدأ الطلب | [م]+[د] |
| 10 | إكمال الخدمة | مراحل الإنتاج، رابط/معرض تسليم، `completed` | ⚠ تكلفة التخزين (1.6). ⚠ المصوّرة تنسى تحديث المرحلة (لا تذكير تصعيدي ❔) | [م] |
| 11 | طلب التقييم | بعد `completed` يُرسل رابط تقييم؟ | ❔ الإرسال تلقائي أم يدوي: الرابط موجود، **لم أجد مرسلاً تلقائياً** (لا قالب `review_request` بين الـ 40). التقييم بعد ذلك يحتاج اعتماد الأدمن (`is_published=false`) | [م]/[أ] |
| 12 | تجديد الاشتراك | الصفحة تعرض الأسعار؛ الدفع عبر **PayTabs** (جاهز بالكود، مفاتيحه موجودة ✅) أو زبوني (يدوي). `apply_subscription_payment` ذرّي ✅ | ⚠ زبوني: انتظار الأدمن (SLA غير معرّف). PayTabs: لم يُختبر بدفعة حقيقية ❔، `PAYTABS_*` موجودان لكن لا أعرف إن كان `isPayTabsConfigured()` يتحقق من أكثر من ذلك. انتهاء الاشتراك يُخفي الصفحة فوراً (U-1) | [م]+[أ] |

**ما يجب أن يحدث تلقائياً (وليس اليوم):** إشعار العروس بالموافقة والخطوات التالية بقناة تصل فعلاً؛ تذكير المصوّرة بتأكيد إيصال وصل؛ رسالة طلب التقييم؛ إنذار انتهاء التجربة؛ تنبيه الأدمن بدفعة زبوني؛ كشف الطلبات غير الموثّقة.
**ما يحتاج المصوّرة:** الموافقة، تأكيد العربون، التسليم، رد على الأسئلة، ضبط الباقات.
**ما يحتاج الأدمن:** اعتماد زبوني، اعتماد التقييمات، الاسترداد/النزاعات، الإبلاغات.
**ما يحتاج الدعم (أنتِ/فريق Memoria):** عروس فقدت رابطها ولا إيميل لها، رمز لا يصل، نزاع إيصال، مصوّرة تريد حذف حساب، استرداد.

---

## 8. Newly Discovered Risks

(لم تُذكر في تقرير المرحلة 1، أو تُوسَّع هنا.)

| # | الخطر | الدليل | الشدة | المعالجة |
|---|---|---|---|---|
| N1 | **قاموس الإنجليزية 395 KB في كل صفحة عربية** | ✅ تحليل الخريطة | عالية (أداء) | 6.3 مرحلة 1 |
| N2 | **واتساب غير مُهيّأ كلياً** في الإنتاج، فتحقق الرقم + إشعارات العروس عبره غير موجودة | ✅ secrets | عالية | قرار قناة (4.2) |
| N3 | **نصوص واتساب الحرة لن تصل خارج 24 ساعة** حتى بعد الإعداد، ولا يوجد كود قوالب Meta | 📖📚 | عالية | قوالب معتمدة + مسار `type:template` |
| N4 | **`sendEmail` بلا retry ولا طابور ولا ربط bounces**، حد Resend Free 100/يوم | 📖📚 | عالية | outbox + خطة مدفوعة |
| N5 | **سجل التدقيق لا يعرف الفاعل** (`auth.uid()` = NULL لكتابات service-role) ولا يغطي نقل الموعد/الموافقة/السبب، ومُدرَجات JS خارج المعاملة وتُبتلع أخطاؤها | 📖 | عالية (نزاعات) | `booking_events` (5.5) |
| N6 | **`DEPOSIT_PROOF_SENT` بلا مهلة ولا تذكير** | ✅ الاستعلام يستثنيه | عالية (مال معلّق) | ST1 |
| N7 | **تكلفة معارض التسليم غير محدودة**: ملفات حتى 20 MB × مئات الصور | 📖 الحدود + حساب ❔ | عالية (اقتصادية) | قرار: خارجي مقابل داخلي + حصص |
| N8 | **لا نسخ احتياطية مضمونة**: دليل `keepalive` يشير لمشروع Free، ولا PITR مذكور | ✅📚 ❔ | عالية | Pro + اختبار استعادة |
| N9 | **مشروع Supabase ثالث `ukjk…`** في `.env`، حالته مجهولة | ✅ | متوسطة | حصر وإغلاق |
| N10 | **نشر يدوي من مجلد محلي بلا فحص**: أي بناء محلي يصبح إنتاجاً | ✅ | عالية | CI + نشر من الفرع |
| N11 | **لا اختبارات في النشر**، ولا سكربت `test` | ✅ | عالية | CI |
| N12 | **cron يعتمد على Nitro hook غير موثّق** وتعليقات الكود مضللة، لا heartbeat | 📖 | عالية | مراقبة |
| N13 | **N+1 و`limit` بلا ترتيب** في cron يُسقط التذكيرات بعد الصف 200، وقد يتجاوز 50 subrequest على Free | 📖📚 | متوسطة (تتفاقم) | 8.3 |
| N14 | **`expire_unpaid_bookings` يعمل من مكانين** (pg_cron ساعي في DB + Worker cron كل 30 د) | 📖 | منخفضة | توحيد مصدر واحد |
| N15 | **انتهاء الاشتراك يُخفي الصفحة فوراً**، وروابط البايو تتحول إلى 404 | 📖 | متوسطة | سماح 7 أيام |
| N16 | **المنطقة الزمنية**: تواريخ "اليوم" تُحسب بثلاث طرق (UTC+3 يدوي في معظم الأماكن، `new Date()` UTC في `deleteMyAccount`، `CURRENT_DATE` في SQL حسب إعداد DB) | 📖 | متوسطة (حدود منتصف الليل) | دالة `jordan_today()` واحدة |
| N17 | **`email_log` يخزّن بريد المستلمين بلا سياسة احتفاظ**، و`rate_limits`/`notifications` بلا تنظيف | 📖 | متوسطة (خصوصية + حجم) | retention |
| N18 | **تحديث نشر أثناء استعمال التطبيق:** جذر الصفحة يعالج `vite:preloadError` و`dynamically imported module` بإعادة تحميل ✅📖 (جيد). لكن **SW يخزّن HTML** قد يشير لـ chunks محذوفة؛ و`CACHE_NAME` يدوي (`memoria-v8`) | 📖 | منخفضة-متوسطة | نسخة من hash البناء |
| N19 | **توقف Supabase مؤقتاً:** `abuse.allow()` يفتح (fail-open) ← لا حد معدّل أثناء العطل؛ باقي الطلبات تفشل بصفحة خطأ. صفحة offline تعمل فقط عند انقطاع الشبكة لا عند 5xx | 📖 | متوسطة | صفحة "صيانة" + fail-closed للمسارات الحساسة |
| N20 | **Webhook مكرر من مزوّد دفع:** PayTabs محمي (idempotent بحالة `pending` + `apply_subscription_payment`). Stripe `payment.ts` غير آمن (يُسجّل الحدث قبل المعالجة ويعيد 200 عند الفشل) لكنه **ميت** | 📖 | منخفضة الآن | حذف الملف أو إصلاحه |
| N21 | **المصوّرة تعدّل عقداً موقّعاً:** محمي بـ trigger (`CONTRACT_SIGNED_LOCKED`) ✅ لكنه مغطّى باختبار؟ لا | 📖 | منخفضة | اختبار S-U5 |
| N22 | **المصوّرة تحذف حسابها بحجوزات مستقبلية:** تُرفض إن وُجدت حجوزات قادمة (`confirmed`/`pending_deposit`) ✅. لكن حجوزات `quote` غير مشمولة بالفحص ❔، وحجوزات لها عربون لم يُسلَّم؟ ويتبقى: **لا مسار تصدير بيانات/حذف نهائي** لحقوق الخصوصية | 📖 | متوسطة | سياسة وتصدير |
| N23 | **فقد العروس للرابط:** مسار الاسترجاع بالإيميل/الهاتف (`recoverTrackingLinks`) يعتمد الإيميل ❌ | 📖 | عالية الآن | واتساب/دعم + سياسة تحقق |
| N24 | **أي عملية تعتمد على شخص واحد:** (أ) النشر (حسابك على Cloudflare)، (ب) اعتماد زبوني + التقييمات + الاسترداد (الأدمن)، (ج) الـ secrets والمفاتيح كلها في حساب واحد، (د) DNS/دومين مستقبلاً، (هـ) فهم الكود (Lovable + جلسات Claude) | ✅📖 | عالية | وثّقي runbooks، ثاني أدمن، نسخة من أسرار في مدير كلمات مرور |
| N25 | **`.env*` مُتتبَّعة في git** وتكشف أرقام مشاريع Supabase (بلا أسرار) | ✅ | منخفضة | `git rm --cached` + مراجعة |
| N26 | **اسم الـ Worker `memoria-production` وكائن `workers.dev` للإنتاج:** أي رابط مشارك سيحمل هذا الاسم؛ تغيير الدومين لاحقاً يكسر الروابط المرسلة (روابط التتبع في رسائل سابقة تحوي `PUBLIC_APP_URL` القديم) | 📖 | متوسطة | إبقاء الدومين القديم يُعيد التوجيه 301 |
| N27 | **`get_booking_by_token` يُظهر `cliq_alias` و`payment_methods` و`bank_info` لكل من يحمل الرمز** بعد الموافقة | 📖 | منخفضة (مقصود) | لا تعديل. فقط تأكد من عدم تسرب الروابط (مثلاً بالـ Referer) |
| N28 | **قفل الحجز الواحد = 30 دقيقة للطلب غير الموثّق، ثم 24-72 س للموثّق**، أي أن `auto` الحالي يمنح كل طلب مجهول حجزاً حتى 72 ساعة | 📖 | عالية | 4.2 (3) |

---

## 9. Recommended Implementation Sequence

مبدأ الترتيب: **(1) أمان التسليم أولاً (CI، بيئة Dev)، (2) ما يحمي المال والتواريخ، (3) ما يجعل الرسائل تصل، (4) ما يجعل التشغيل مراقَباً، (5) الأداء، (6) النمو.** كل مرحلة تنتهي بشرط خروج قابل للقياس. كله على Dev أولاً.

| المرحلة | المهام | تعتمد على | معيار الخروج |
|---|---|---|---|
| **0 — أرضية التسليم** (أسبوع 1) | (أ) `wrangler.dev.jsonc` + worker `memoria-dev` + secrets منفصلة (1.3). (ب) GitHub Actions: `tsc` + `vitest` + `build` على كل push/PR. (ج) سكربت `deploy:prod` يرفض إن لم يكن الفرع main نظيفاً وبلا تعديلات. (د) تثبيت سكربت `bundle-report` وميزانية. (هـ) حصر مشروع `ukjk` وإغلاقه. (و) `git rm --cached` للـ `.env*` | — | تُنشر Dev بأمر واحد بلا أثر على Prod؛ PR لا يُدمج إن فشل البناء |
| **1 — حقيقة الإنتاج** (أسبوع 1) | افتحي: خطة Cloudflare، خطة Supabase وبقاء المشروع على Free، سجلات الـ cron، `cron.job`، `max_rows`، `VITE_SENTRY_DSN`، حالة PayTabs. **Supabase Pro + نسخ احتياطية + اختبار استعادة على Dev** | — | كل "❔" في القسم 1 تحوّل إلى ✅ أو ❌ |
| **2 — اختبارات الأمان** (أسبوع 1-2) | تنفيذ القسم 3.4: seed/teardown، عملاء الأدوار الخمسة، المصفوفة، فحص كل RPC بالأدوار | 0 | مصفوفة كاملة خضراء، وأي فجوة تُصلَح قبل المتابعة |
| **3 — سلامة الحجز** (أسبوع 2) | trigger الحارس (2.3) على Dev، اختبارات I1-I14، تعديل معالجة `SLOT_CONFLICT`، ثم Prod | 0، 2 | I1-I14 خضراء، لا تراجع في أزمنة الكتابة |
| **4 — الاتصال** (أسبوع 2-3) | الدومين + Resend (SPF/DKIM/DMARC) ← **outbox** (4.4) ← ربط Resend webhook (bounces) ← قنوات العروس البديلة (4.2) | دومين، 0 | رسالة تأكيد تصل Gmail/Outlook بـ pass/pass/pass؛ فشل مؤقت يعيد المحاولة؛ لا إشعار مكرر |
| **5 — آلة الحالة والتدقيق** (أسبوع 3) | `booking_events` (مرحلة A) ← ST1/ST2/ST3 (التذكيرات، حالة رفض الإيصال) ← `transition_booking` للمسارات الحرجة | 3 | كل انتقال بفاعل وسبب؛ لا حالة عالقة بلا تنبيه |
| **6 — التحقق والإساءة** (أسبوع 3) | Turnstile + وسم "رقم غير مؤكد" بلا حجز طويل + حد طلبات غير موثّقة لكل مصوّرة (4.2 البدائل) | 4 | محاكاة 50 طلباً وهمياً لا تحجز أياماً |
| **7 — الأداء** (أسبوع 3-4) | المرحلة 1 من 6.3 (en.json وغيره)، ثم HTMLRewriter، ثم المرحلة 2 بموافقة على كل بند | 0 | المدخل ≤ 300 KB gz، قياس LCP حقلي |
| **8 — المراقبة** (يتوازى من أسبوع 1) | heartbeat، تنبيهات تيليغرام، لوحة أسبوعية (1.9) | 0 | أي عطل يظهر تنبيهاً قبل شكوى |
| **9 — النمو** (بعد الإطلاق) | G1-G4 من المرحلة 1 | الإطلاق | بيانات حقيقية |

---

## 10. Definition of Done for Commercial Launch

لا إطلاق قبل أن تتحقق **كلها** (كل بند له دليل قابل للفحص، لا رأي):

**التسليم والبيئات**
- [ ] نشر Dev مستقل يعمل بأمر واحد، ولا يستطيع الوصول إلى `qrpk` (مُثبت بحارس).
- [ ] CI: لا دمج ولا نشر بلا `tsc` + `vitest` + `build` + اختبارات الأمان خضراء.
- [ ] نشر الإنتاج من فرع main النظيف فقط، وكل نشر يُسجَّل برقم commit.

**الأمان**
- [ ] مصفوفة الصلاحيات (3.2) تعمل آلياً على Dev وكلها مطابقة، بما فيها عزل مصوّرة/مصوّرة وعروس/عروس والملفات والـ RPC.
- [ ] لا RPC قابلة للاستدعاء من دور غير مخوّل.
- [ ] سجل الحجز يعرف الفاعل والسبب لكل انتقال.

**سلامة الحجز والمال**
- [ ] حارس DB للتعارض فعّال، واختبارات I1-I14 خضراء، ولا حجز مزدوج في 1,000 محاولة متزامنة.
- [ ] لا حالة عالقة بلا تنبيه (ST1-ST3 مغطّاة).
- [ ] دفعات الاشتراك: PayTabs يعمل بدفعة حقيقية، أو اعتماد زبوني بـ SLA معلن وتنبيه فوري.

**الاتصال**
- [ ] دومين + SPF/DKIM/DMARC بنتيجة pass في Gmail وOutlook.
- [ ] outbox يعيد المحاولة، لا يكرّر، ويسجّل كل قناة؛ عروس بلا أي قناة تصل = تُعلَّم للدعم تلقائياً.
- [ ] قناة بديلة للتحقق من الرقم موثوقة، وWhatsApp إما مُهيّأ بقوالب معتمدة أو مُعطَّل صراحةً بلا اعتماد عليه.
- [ ] أي عروس تستطيع إلغاء حجز وقبول ملحق واسترجاع رابطها **فعلاً** (اختبار بإيميل خارجي).

**الأداء**
- [ ] المدخل ≤ 300 KB gzip، وLCP الحقلي ≤ 3.0 s على هاتف متوسط بـ 4G (يُقاس بجهاز حقيقي لا بمحاكاة فقط).
- [ ] خطوط ميتة مُزالة، وصور مضغوطة بصيغ حديثة.

**التشغيل**
- [ ] Supabase Pro، نسخ يومية، **واستعادة مُجرَّبة على Dev**.
- [ ] مراقبة وتنبيهات (1.9) مفعّلة، وheartbeat للـ cron.
- [ ] runbooks: نشر، تراجع، استعادة، حادث دفع، حادث رسائل، فقدان وصول.
- [ ] ثاني شخص يملك وصولاً (أدمن/نشر) ومخزن أسرار منظم.
- [ ] سياسة احتفاظ وحذف بيانات موثّقة (خصوصية).

**التجربة**
- [ ] بروفة كاملة بـ 12 سيناريو (القسم 5 من المرحلة 1) و12 خطوة (القسم 7) على Dev بحسابات حقيقية وهواتف حقيقية، كلها ✅ بلا تدخل يدوي من المطوّر.

---

## الجواب النهائي

> **ما الذي يجب أن نفعله حتى تصبح Memoria منصة نطلقها ونتركها تعمل بثقة، دون مراقبة كل عملية يدوياً؟**

لا يكفي إصلاح أخطاء. المطلوب خمس أنظمة **تعمل وحدها** لتحلّ محلّ عينيك:

1. **نظام تسليم** (CI + Dev مستقل + نشر محكوم): كي لا يصل إلى الإنتاج شيء لم يُختبر، وكي لا تعتمد النشرات على جهاز واحد. *اليوم لا يوجد.*
2. **نظام نزاهة** (حارس DB للتواريخ + آلة حالة موحّدة + سجل أحداث بفاعل وسبب): كي تُحمى الحقيقة في **قاعدة البيانات** لا في ذاكرة التطبيق، وكي لا يعلق حجز ولا يختلف ما تراه العروس عمّا تراه المصوّرة.
3. **نظام اتصال موثوق** (دومين موثّق + outbox فيه إعادة محاولة ومنع تكرار + قناة بديلة): كي لا يضيع إشعار ولا تعلق عروس خارج النظام. *اليوم أغلب رسائل العروس لا تصل.*
4. **نظام مراقبة وتنبيه** (heartbeat، دفعات عالقة، فشل رسائل، 5xx): كي يأتيك العطل قبل الشكوى.
5. **نظام أمان مؤتمت** (اختبارات الأدوار على كل تغيير): كي لا يعيد أي تعديل مستقبلي فتح ثغرة أُغلقت.

وفوقها ثلاث قرارات تجارية لا تقدر الهندسة على حسمها: **أين تُخزَّن صور التسليم** (تحدد الجدوى الاقتصادية)، **أي قناة تحقق للرقم** (بدل واتساب الإلزامي)، و**من الشخص الثاني** الذي يستطيع إنقاذ الإنتاج في غيابك.

**أول ما أفعله فور موافقتك:** المرحلة 0 (Dev مستقل + CI)، ثم المرحلة 1 (فتح ما لم أستطع رؤيته)، لأن كل ما بعدهما يُبنى ويُختبر فوقهما، وأي "❔" في هذا التقرير قد يتبدّل بعدهما.

---
*انتهى. لم يُعدَّل أي كود، ولم تُنفَّذ migration، ولم يُكتب على أي قاعدة بيانات، ولم تُغيَّر إعدادات أي خدمة خارجية، ولم يُنشَر إصدار.*
