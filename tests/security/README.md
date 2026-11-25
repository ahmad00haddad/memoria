# Security regression tests

**تعمل على قاعدة dev فقط.** `setup.ts` يرفض العمل إذا كان العنوان للإنتاج (`qrpk…`) أو القديم (`ukjk…`) أو أي مشروع غير `ysqp…`.
لا يوجد مفتاح Service Role في أي ملف هنا، والاختبارات تدخل بحسابات مستخدمين فقط.

## التشغيل
```
npm run test:security
```
بدون متغيرات البيئة تُتخطّى كل الاختبارات (لا فشل).

## ما تحتاجه (مرة واحدة، على dev)
أنشئي من لوحة Supabase الخاصة بـ dev (أو من تطبيق dev):
- حساب مصوّرة A وحساب مصوّرة B، لكل واحدة حجز واحد على الأقل (يلزم `id` الحجز).
- رمز تتبع لحجز كل منهما (عمود `client_tracking_token`).
- (اختياري) حساب أدمن.

ثم عيّني المتغيرات في طرفيتك (لا تُحفظ في git):
```
SECURITY_TEST_SUPABASE_URL=https://ysqpmqulbeawzcatauqq.supabase.co
SECURITY_TEST_ANON_KEY=<مفتاح anon/publishable لمشروع dev>
SECURITY_TEST_PHOTOGRAPHER_A_EMAIL / _PASSWORD
SECURITY_TEST_PHOTOGRAPHER_B_EMAIL / _PASSWORD
SECURITY_TEST_BOOKING_A_ID / SECURITY_TEST_BOOKING_B_ID
SECURITY_TEST_BRIDE_A_TOKEN / SECURITY_TEST_BRIDE_B_TOKEN
```

## ملاحظات
- كل اختبار "ممنوع" يقابله اختبار "مسموح" (control) على نفس البيانات، حتى لا يعني "0 صف" أن الجدول فارغ.
- `anon.test.ts` يعمل بمفتاح anon فقط. على قاعدة dev الفارغة يثبت الحظر على الدوال لكن لا يثبت العزل على الجداول (تحتاج بيانات).
- المصفوفة الكاملة المخطط لها: `docs/MEMORIA_PHASE_2_PRODUCTION_STRATEGY.md` القسم 3. هذه نواة أولى (A/B/عروس/anon). الأدمن والملفات (Storage) والـ server functions تُضاف لاحقاً.
