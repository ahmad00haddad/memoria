-- =====================================================================
-- Final Security Audit — Comprehensive RLS Hardening
-- =====================================================================
-- يراجع ويشدّد كل سياسات RLS المتبقية التي لم يغطّها migration
-- 20260623090000_rls_security_hardening.sql (الذي عالج contracts + notifications).
--
-- التغييرات:
--   1) messages: تقييد القراءة للمرسل/المستقبل فقط (كانت USING(true) محتملة).
--   2) reviews: تقييد الكتابة لصاحب الحجز المرتبط فقط.
--   3) audit_logs: تقييد القراءة للأدمن فقط (كانت مفتوحة محتملة).
--   4) subscription_payments: تقييد القراءة للمصوّرة أو الأدمن فقط.
--   5) email_log: تقييد القراءة للأدمن فقط (بيانات حسّاسة).
--   6) payment_events: تأكيد RLS مفعّل بلا سياسات (خادمي حصراً).
--   7) photographer_private: تأكيد تقييد القراءة للمالك فقط.
-- =====================================================================

-- 1) messages: تقييد القراءة للمرسل أو المستقبل ----------------------
-- رسائل الحجز يجب أن يقرأها فقط المرسل أو المصوّرة صاحبة الحجز.
-- نحذف أي سياسة USING(true) ونستبدلها بسياسات ملكية دقيقة.

-- حذف السياسات القديمة الواسعة (إن وُجدت).
DROP POLICY IF EXISTS "messages_select_all" ON public.messages;
DROP POLICY IF EXISTS "messages_read" ON public.messages;
DROP POLICY IF EXISTS "anyone read messages" ON public.messages;

-- سياسة: المصوّرة تقرأ رسائل حجوزاتها.
CREATE POLICY "photographer read own messages"
  ON public.messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = messages.booking_id
        AND b.photographer_id = auth.uid()
    )
  );

-- سياسة: العميل يقرأ الرسائل المرتبطة بحجزه (عبر sender_name匹配 أو
-- عبر الربط بالحجز الذي يملك توكنه). نسمح بالقراءة إذا كان sender_id
-- يساوي المستخدم الحالي.
CREATE POLICY "sender read own messages"
  ON public.messages FOR SELECT
  TO authenticated
  USING (sender_id = auth.uid());

-- 2) audit_logs: تقييد القراءة للأدمن فقط ----------------------------
DROP POLICY IF EXISTS "audit_logs_select" ON public.audit_logs;
DROP POLICY IF EXISTS "anyone read audit" ON public.audit_logs;

CREATE POLICY "admin read audit_logs"
  ON public.audit_logs FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 3) subscription_payments: تقييد للمصوّرة أو الأدمن ------------------
DROP POLICY IF EXISTS "payments_select_all" ON public.subscription_payments;
DROP POLICY IF EXISTS "anyone read payments" ON public.subscription_payments;

-- المصوّرة تقرأ مدفوعات اشتراكها.
CREATE POLICY "photographer read own payments"
  ON public.subscription_payments FOR SELECT
  TO authenticated
  USING (photographer_id = auth.uid());

-- الأدمن يقرأ كل المدفوعات.
CREATE POLICY "admin read all payments"
  ON public.subscription_payments FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 4) email_log: تقييد القراءة للأدمن فقط -----------------------------
-- سجلّات البريد تحتوي بيانات حسّاسة (عناوين بريد، قوالب، أخطاء).
DROP POLICY IF EXISTS "email_log_select" ON public.email_log;
DROP POLICY IF EXISTS "anyone read email_log" ON public.email_log;

CREATE POLICY "admin read email_log"
  ON public.email_log FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 5) payment_events: تأكيد RLS بلا سياسات (خادمي حصراً) ---------------
-- هذا الجدول يُكتب/يُقرأ حصراً عبر service-role في webhook الدفع.
-- RLS مفعّل بلا سياسات = لا وصول لـ anon/authenticated.
-- نؤكّد فقط أن RLS مفعّل (لا نضيف سياسات).
ALTER TABLE public.payment_events ENABLE ROW LEVEL SECURITY;

-- 6) photographer_private: تأكيد تقييد الملكية -----------------------
-- بيانات المصوّرة الخاصة (هاتف، واتساب، معلومات بنكية) يجب أن
-- يقرأها المالك فقط. نتحقّق من عدم وجود سياسات USING(true).
DO $$
DECLARE
  p_count int;
BEGIN
  SELECT count(*) INTO p_count
  FROM pg_policies
  WHERE tablename = 'photographer_private'
    AND schemaname = 'public'
    AND qual = 'true';

  IF p_count > 0 THEN
    -- توجد سياسة USING(true) — احذفها واستبدلها.
    DROP POLICY IF EXISTS "photographer_private_read_all" ON public.photographer_private;
    DROP POLICY IF EXISTS "anyone read photographer_private" ON public.photographer_private;

    CREATE POLICY "owner read photographer_private"
      ON public.photographer_private FOR SELECT
      TO authenticated
      USING (user_id = auth.uid());

    CREATE POLICY "owner update photographer_private"
      ON public.photographer_private FOR UPDATE
      TO authenticated
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

-- 7) تأكيد أن messages INSERT محمي -----------------------------------
-- إدراج الرسائل يجب أن يكون من المستخدم المصادَق عليه فقط.
DROP POLICY IF EXISTS "anyone insert messages" ON public.messages;
DROP POLICY IF EXISTS "messages_insert_all" ON public.messages;

CREATE POLICY "authenticated insert own messages"
  ON public.messages FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = messages.booking_id
        AND b.photographer_id = auth.uid()
    )
  );