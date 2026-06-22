-- =====================================================================
-- Priority 1 — Payments integration: online deposit checkout + auto subscription billing
-- =====================================================================
-- يضيف:
--   1) أعمدة ربط الدفع على bookings (provider/session/intent) — لا تعدّل الموجود.
--   2) جدول payment_events لمنع المعالجة المكرّرة لأحداث الـ webhook (idempotency).
--   3) confirm_booking_deposit_paid() — تأكيد ذرّي وآمن من التكرار للعربون.
--   4) renew_subscription_paid() — تجديد اشتراك تلقائي (خادمي) عبر الـ webhook،
--      نظير admin_renew_subscription لكن بلا فحص دور الأدمن (يُستدعى بمفتاح service-role).
--
-- ملاحظات أمان:
--   * كل الدوال SECURITY DEFINER + search_path = public.
--   * الدوال الخادمية البحتة محجوبة عن anon/authenticated (تُستدعى عبر service-role
--     الذي يتجاوز RLS والصلاحيات).
-- =====================================================================

-- 1) أعمدة ربط الدفع على الحجوزات (كلها NULLable، provider-agnostic) ----
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS deposit_payment_provider    text,
  ADD COLUMN IF NOT EXISTS deposit_checkout_session_id text,
  ADD COLUMN IF NOT EXISTS deposit_payment_intent_id   text;

CREATE INDEX IF NOT EXISTS idx_bookings_deposit_session
  ON public.bookings (deposit_checkout_session_id)
  WHERE deposit_checkout_session_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_bookings_deposit_intent
  ON public.bookings (deposit_payment_intent_id)
  WHERE deposit_payment_intent_id IS NOT NULL;

-- 2) مخزن أحداث الدفع (سطر واحد لكل event id من المزوّد) -----------------
CREATE TABLE IF NOT EXISTS public.payment_events (
  id                 text PRIMARY KEY,         -- معرّف الحدث لدى المزوّد (مثل Stripe evt_...)
  provider           text NOT NULL,
  event_type         text,
  related_booking_id uuid REFERENCES public.bookings(id) ON DELETE SET NULL,
  related_user_id    uuid,
  processed_at       timestamptz NOT NULL DEFAULT now(),
  created_at         timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.payment_events ENABLE ROW LEVEL SECURITY;
-- بلا سياسات: هذا الجدول يُكتب/يُقرأ حصراً عبر عميل service-role (supabaseAdmin)
-- داخل webhook الدفع، وهو يتجاوز RLS. تفعيل RLS بلا سياسات يضمن عدم وصول
-- anon/authenticated إليه إطلاقاً.
REVOKE ALL ON public.payment_events FROM anon, authenticated;

-- 3) تأكيد العربون: ذرّي + آمن من التكرار (idempotent) -------------------
CREATE OR REPLACE FUNCTION public.confirm_booking_deposit_paid(
  _booking_id uuid,
  _provider   text,
  _session    text DEFAULT NULL,
  _intent     text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_bk      public.bookings%ROWTYPE;
  v_already boolean := false;
BEGIN
  -- قفل صف الحجز لمنع سباقات التأكيد المتزامنة من أحداث webhook مكرّرة.
  SELECT * INTO v_bk
  FROM public.bookings
  WHERE id = _booking_id AND deleted_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'BOOKING_NOT_FOUND';
  END IF;

  IF v_bk.deposit_confirmed_at IS NOT NULL AND v_bk.status = 'confirmed' THEN
    -- سبق تأكيده: لا تكرّر التحديث (ولا الإشعارات في الطبقة الأعلى).
    v_already := true;
  ELSE
    UPDATE public.bookings SET
      status = CASE
                 WHEN status IN ('quote', 'pending_deposit') THEN 'confirmed'::public.booking_status
                 ELSE status
               END,
      deposit_confirmed_at        = COALESCE(deposit_confirmed_at, now()),
      deposit_payment_provider    = COALESCE(_provider, deposit_payment_provider),
      deposit_checkout_session_id = COALESCE(_session, deposit_checkout_session_id),
      deposit_payment_intent_id   = COALESCE(_intent, deposit_payment_intent_id),
      updated_at                  = now()
    WHERE id = _booking_id;
  END IF;

  -- تُعاد قيم ما قبل التحديث (وهي ثابتة: البريد/الاسم/التاريخ) لاستخدامها في الإشعارات.
  RETURN jsonb_build_object(
    'booking_id',      v_bk.id,
    'already_confirmed', v_already,
    'status',          v_bk.status,
    'client_email',    v_bk.client_email,
    'client_name',     v_bk.client_name,
    'client_phone',    v_bk.client_phone,
    'client_user_id',  v_bk.client_user_id,
    'photographer_id', v_bk.photographer_id,
    'event_date',      v_bk.event_date,
    'tracking_token',  v_bk.client_tracking_token
  );
END;
$$;

REVOKE ALL ON FUNCTION public.confirm_booking_deposit_paid(uuid, text, text, text) FROM anon, authenticated, PUBLIC;

-- 4) تجديد الاشتراك تلقائياً (خادمي، بلا فحص أدمن) ----------------------
CREATE OR REPLACE FUNCTION public.renew_subscription_paid(
  _photographer_id uuid,
  _months          int,
  _provider        text    DEFAULT 'stripe',
  _intent          text    DEFAULT NULL,
  _amount          numeric DEFAULT NULL,
  _currency        text    DEFAULT 'JOD'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_start timestamptz;
  v_end   timestamptz;
BEGIN
  IF _months IS NULL OR _months <= 0 THEN
    RAISE EXCEPTION 'INVALID_MONTHS';
  END IF;

  -- التمديد يبدأ من نهاية الفترة الحالية إن كانت مستقبلية، وإلا من الآن.
  SELECT GREATEST(COALESCE(current_period_end, now()), now()) INTO v_start
  FROM public.subscriptions
  WHERE photographer_id = _photographer_id;

  IF v_start IS NULL THEN
    v_start := now();
  END IF;
  v_end := v_start + (_months || ' months')::interval;

  INSERT INTO public.subscriptions
    (photographer_id, status, current_period_start, current_period_end, trial_ends_at)
  VALUES
    (_photographer_id, 'active', now(), v_end, now())
  ON CONFLICT (photographer_id) DO UPDATE
    SET status               = 'active',
        current_period_start = COALESCE(public.subscriptions.current_period_start, now()),
        current_period_end   = v_end,
        updated_at           = now();

  -- توثيق الدفعة (معتمَدة) في سجلّ المدفوعات.
  INSERT INTO public.subscription_payments
    (photographer_id, amount, currency, method, period_months, status, stripe_payment_intent_id)
  VALUES
    (_photographer_id, COALESCE(_amount, 0), COALESCE(_currency, 'JOD'),
     'stripe'::public.payment_method, _months, 'approved'::public.payment_status, _intent);

  RETURN jsonb_build_object(
    'photographer_id',    _photographer_id,
    'current_period_end', v_end
  );
END;
$$;

REVOKE ALL ON FUNCTION public.renew_subscription_paid(uuid, int, text, text, numeric, text) FROM anon, authenticated, PUBLIC;
