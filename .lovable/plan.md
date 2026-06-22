# الخطة القادمة — إغلاق ما بدأه Claude وتشغيله فعلياً

## المرحلة 1 — تشغيل ما تم بناؤه (أولوية قصوى)
الـ backend مكتوب لكن غير مُفعَّل بالكامل على قاعدة البيانات، والـ frontend لا يستخدم نصف الميزات الجديدة.

### 1.1 تطبيق الـ migrations الأربع
- `20260621120000_phase0_booking_integrity.sql`
- `20260622120000_payments_integration.sql`
- `20260622130000_booking_cancellation.sql`
- `20260622140000_review_moderation_and_audit.sql`

تشغيل واحد عبر `supabase--migration`، ثم تحديث `types.ts`.

### 1.2 واجهات Priority 2 (الإلغاء + الاسترداد) — `frontend فقط`
- `/track/$token`: زر "إلغاء الطلب" يظهر فقط إذا `status ∈ {quote, pending_deposit}` → يستدعي `clientCancelBooking`.
- `/dashboard/bookings/$id`: زر "إلغاء الحجز" + حقل سبب → `cancelBooking` + عرض `refund_amount/status` بعد الإلغاء.
- `/dashboard/profile`: قسم "سياسة استرداد العربون" (full/partial/none + نسبة) → `updateRefundPolicy`.

### 1.3 واجهات Priority 1 (دفع العربون أونلاين) — `frontend فقط`
- `/track/$token`: زر "ادفع العربون أونلاين" بجانب مسار CliQ اليدوي، يظهر فقط لو `isPaymentConfigured` (نمرر العلَم من server fn).
- معالجة `?payment=success` / `?payment=cancelled` على نفس الصفحة (toast فقط — التأكيد يأتي من webhook).

### 1.4 شارة "بانتظار المراجعة" للتقييمات
- في `/dashboard/reports` أو صفحة جديدة `/dashboard/reviews`: عرض التقييمات الواردة وحالتها (pending/published).
- يُكمل ما هو موجود في `/admin/reviews`.

---

## المرحلة 2 — إغلاق الفجوات الفنية في طبقة Claude

### 2.1 تنفيذ الاسترداد الفعلي
- `payments.server.ts`: إضافة `refundPayment(intentId, amount)` في واجهة `PaymentProvider` + تنفيذ Stripe.
- في `cancel_booking` أو server fn جديدة `processRefund(bookingId)`: استدعاء الـ refund إذا `refund_status='pending'`، ثم تحديث الحالة عبر webhook `charge.refunded`.

### 2.2 تجديد اشتراك ذاتي (للمصوّرة، بلا أدمن)
- إضافة `createSubscriptionCheckout(months)` في `payments.functions.ts` (مُصادَق).
- صفحة `/dashboard/subscription`: زر "جدّدي الآن" يفتح Checkout.
- Webhook الدفع: ربط `subscription_payment` بـ `renew_subscription_paid` (قائم) — التأكد فقط من mapping `client_reference_id`.

### 2.3 WhatsApp في كل نقاط التحوّل
حالياً مُستخدم في الإلغاء فقط. إضافته إلى:
- `submitBookingRequest` → إشعار المصوّرة برسالة جديدة.
- `confirm_booking_deposit_paid` (داخل webhook) → إشعار العميل بتأكيد الحجز.
- `email-reminders` → نسخة WhatsApp للتذكير 24h.

كلها env-gated (`isWhatsAppConfigured()` موجود).

---

## المرحلة 3 — Phase 3.6/3.7 من ROADMAP (قابلة للتأجيل)
- **Analytics للمصوّرة**: توسيع `/dashboard/reports` بـ conversion rate، monthly revenue، lead source.
- **HyperPay (دينار أردني)**: تنفيذ الـ provider لإطلاق فعلي محلياً.
- **Cloudflare Images / WebP** للمعارض.
- **Audit RLS**: مراجعة كاملة لسياسات `contracts` و`notifications` (مذكور في "Standing security checklist").

---

## الترتيب المقترح
أقترح البدء بـ **المرحلة 1 كاملة دفعة واحدة** (تطبيق migrations + كل الواجهات الناقصة)، لأنها تجعل ما بناه Claude يعمل فعلاً للمستخدمات. ثم نقرّر بين 2.1 (refund فعلي) أو 2.2 (تجديد ذاتي) أو 2.3 (WhatsApp) حسب الأولوية لديك.

أي مرحلة نبدأ بها؟
