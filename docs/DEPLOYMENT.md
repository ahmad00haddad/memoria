# النشر والبيئات (Phase 0)

## الأوامر

| الأمر | ما يفعله |
|---|---|
| `npm run typecheck` / `npm test` | `tsc --noEmit` / `vitest run` (نفس ما يشغّله CI) |
| `npm run bundle:report` | بناء بخرائط مصدر + تقرير الحزمة + ميزانية (`scripts/bundle-budget.json`) |
| `npm run deploy:dev -- --dry-run` | يبني بوضع development ويتحقق ويشغّل `wrangler deploy --dry-run` (لا يرفع شيئاً) |
| `npm run deploy:dev` | ينشر worker **`memoria-dev`** المربوط بقاعدة dev (`ysqp…`) فقط |
| `npm run deploy:prod -- --dry-run` | فحوصات الإنتاج + بناء + dry-run |
| `npm run deploy:prod` | ينشر `memoria-production` بعد الفحوصات (بدل `npx wrangler deploy` المباشر) |

## ضمانات `deploy:prod`
يرفض إن: لم تكن على `main`، أو في ملفات متتبَّعة معدّلة (ما عدا `graphify-out/`)، أو `HEAD` ≠ `origin/main`، أو فشل `tsc`/`vitest`، أو اسم الـ worker المبني ليس `memoria-production`، أو ظهر في `vars` مرجع مشروع غير الإنتاج.
> لا تستعمل `npx wrangler deploy` مباشرة: `.wrangler/deploy/config.json` يوجّهه إلى آخر بناء محلي (قد يكون بناء dev).

## ضمانات `deploy:dev`
- يقرأ `.env.development` ويرفض إن لم يشر لمشروع dev.
- يفحص حزمة العميل ويرفض إن وجد مرجع الإنتاج أو القديم.
- يولّد ملف `.output/server/wrangler.dev.json` بقائمة بيضاء من الـ vars: `EMAIL_FROM`, `PUBLIC_APP_URL` (`https://memoria-dev.<account>.workers.dev`), `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` (dev). **بلا cron، بلا روابط زبوني، بلا VAPID/Telegram.**
- لا ينسخ أي secret.

## أسرار worker الـ dev (مرة واحدة، يدوياً، بقيم dev فقط)
```
npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY --name memoria-dev   # مفتاح مشروع dev فقط
npx wrangler secret put CRON_SECRET --name memoria-dev                 # اختياري
```
أي secret آخر (Resend، Telegram، PayTabs، Google…) لا يُضاف إلا بقيمة اختبار.

## CI (`.github/workflows/ci.yml`)
عند كل push على main وكل PR: `npm ci` ← typecheck ← vitest ← build بخرائط مصدر ← ميزانية الحزمة ← تحقق أن الـ worker المبني يستهدف الإنتاج فقط. لا يستعمل أي secret. **الميزانية الحالية 500,000 B (الأساس 490,965).** تُخفَّض بعد كل مرحلة تحسين.

بعد أول تشغيل: فعّلي في GitHub ← Settings ← Branches حماية `main` واشترطي نجاح `verify` قبل الدمج.

## ما لم يُنفَّذ عمداً
- لم يُنشَر `memoria-dev` فعلياً (يحتاج قرارك لإنشاء worker في حسابك).
- ملفات `.env*` ما زالت متتبَّعة: CI وWorkers Builds يعتمدان على `.env.production` (قيم publishable فقط) لبناء الواجهة. `.env` يشير لمشروع `ukjk…` غير معروف الحالة: يُحصر ثم يُغلق من لوحة Supabase.
