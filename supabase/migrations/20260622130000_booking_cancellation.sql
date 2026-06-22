-- =====================================================================
-- Priority 2 — Booking cancellation & deposit refund flow
-- =====================================================================
-- يضيف:
--   1) أعمدة الإلغاء على bookings: cancelled_at, cancellation_reason, cancelled_by
--      + أعمدة الاسترداد: refund_amount, refund_status.
--   2) سياسة استرداد العربون على profiles (قابلة للضبط من المصوّرة):
--      deposit_refund_policy ('full'|'partial'|'none') + deposit_refund_percent.
--   3) cancel_booking()        — المصوّرة/الأدمن، أي حالة غير completed/cancelled.
--   4) client_cancel_booking() — العميل عبر الرمز، فقط قبل التأكيد (quote/pending_deposit).
--   كلاهما يسجّل العملية في audit_logs ويُشعر الطرف الآخر.
--
-- ملاحظة على تحرير الموعد: has_booking_conflict() يحسب فقط
--   ('pending_deposit','confirmed','completed') — لذا حالة 'cancelled' تُحرّر
--   الموعد تلقائياً (تم التحقّق). لا حاجة لتعديل دالة التعارض.
-- =====================================================================

-- 1) أعمدة الإلغاء/الاسترداد على الحجوزات -------------------------------
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS cancelled_at        timestamptz,
  ADD COLUMN IF NOT EXISTS cancellation_reason text,
  ADD COLUMN IF NOT EXISTS cancelled_by        uuid,
  ADD COLUMN IF NOT EXISTS refund_amount       numeric,
  ADD COLUMN IF NOT EXISTS refund_status       text;

-- 2) سياسة استرداد العربون على ملف المصوّرة ----------------------------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS deposit_refund_policy  text NOT NULL DEFAULT 'full',
  ADD COLUMN IF NOT EXISTS deposit_refund_percent int;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_deposit_refund_policy_check') THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_deposit_refund_policy_check
      CHECK (deposit_refund_policy IN ('full', 'partial', 'none'));
  END IF;
END $$;

-- 3) إلغاء من المصوّرة/الأدمن (أي حالة غير completed/cancelled) ---------
CREATE OR REPLACE FUNCTION public.cancel_booking(_booking_id uuid, _reason text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_bk        public.bookings%ROWTYPE;
  v_policy    text;
  v_percent   int;
  v_refund    numeric := 0;
  v_refund_st text := 'none';
BEGIN
  SELECT * INTO v_bk FROM public.bookings
  WHERE id = _booking_id AND deleted_at IS NULL
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'BOOKING_NOT_FOUND'; END IF;

  -- صلاحية: صاحبة الحجز أو أدمن.
  IF v_bk.photographer_id != auth.uid() AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  IF v_bk.status = 'completed' THEN RAISE EXCEPTION 'CANNOT_CANCEL_COMPLETED'; END IF;
  IF v_bk.status = 'cancelled' THEN RAISE EXCEPTION 'ALREADY_CANCELLED'; END IF;

  -- حساب الاسترداد إن كان العربون مؤكّداً، حسب سياسة المصوّرة.
  IF v_bk.deposit_confirmed_at IS NOT NULL AND COALESCE(v_bk.deposit_amount, 0) > 0 THEN
    SELECT deposit_refund_policy, deposit_refund_percent INTO v_policy, v_percent
    FROM public.profiles WHERE id = v_bk.photographer_id;

    v_policy := COALESCE(v_policy, 'full');
    IF v_policy = 'full' THEN
      v_refund := v_bk.deposit_amount;
    ELSIF v_policy = 'partial' THEN
      v_refund := round(v_bk.deposit_amount * (COALESCE(v_percent, 0)::numeric / 100), 2);
    ELSE
      v_refund := 0;
    END IF;
    v_refund_st := CASE WHEN v_refund > 0 THEN 'pending' ELSE 'none' END;
  END IF;

  UPDATE public.bookings SET
    status              = 'cancelled',
    cancelled_at        = now(),
    cancellation_reason = LEFT(COALESCE(_reason, ''), 2000),
    cancelled_by        = auth.uid(),
    refund_amount       = v_refund,
    refund_status       = v_refund_st,
    updated_at          = now()
  WHERE id = _booking_id;

  -- سجلّ تدقيق.
  INSERT INTO public.audit_logs (action, actor_id, entity_type, entity_id, before_data, after_data)
  VALUES ('booking.cancel', auth.uid(), 'booking', _booking_id::text,
          jsonb_build_object('status', v_bk.status),
          jsonb_build_object('status', 'cancelled', 'refund_amount', v_refund, 'refund_status', v_refund_st, 'reason', _reason));

  -- إشعار العميل (إن كان مرتبطاً بحساب).
  IF v_bk.client_user_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, title, body, link)
    VALUES (v_bk.client_user_id, 'تم إلغاء الحجز',
            'تم إلغاء حجزك من قبل المصوّرة' ||
            CASE WHEN v_refund > 0 THEN '. سيتم رد عربون بقيمة ' || v_refund::text ELSE '' END,
            '/track/' || v_bk.client_tracking_token);
  END IF;

  RETURN jsonb_build_object(
    'booking_id',      v_bk.id,
    'cancelled_by',    'photographer',
    'client_email',    v_bk.client_email,
    'client_name',     v_bk.client_name,
    'client_phone',    v_bk.client_phone,
    'photographer_id', v_bk.photographer_id,
    'event_date',      v_bk.event_date,
    'tracking_token',  v_bk.client_tracking_token,
    'refund_amount',   v_refund,
    'refund_status',   v_refund_st
  );
END;
$$;

REVOKE ALL ON FUNCTION public.cancel_booking(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cancel_booking(uuid, text) TO authenticated;

-- 4) إلغاء من العميل عبر الرمز — فقط قبل التأكيد ------------------------
CREATE OR REPLACE FUNCTION public.client_cancel_booking(_token text, _reason text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_bk public.bookings%ROWTYPE;
BEGIN
  SELECT * INTO v_bk FROM public.bookings
  WHERE client_tracking_token = _token AND deleted_at IS NULL
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'invalid token'; END IF;

  -- العميل يلغي فقط قبل التأكيد (لم تؤكّد المصوّرة بعد).
  IF v_bk.status NOT IN ('quote', 'pending_deposit') THEN
    RAISE EXCEPTION 'CLIENT_CANCEL_NOT_ALLOWED';
  END IF;

  UPDATE public.bookings SET
    status              = 'cancelled',
    cancelled_at        = now(),
    cancellation_reason = LEFT(COALESCE(_reason, ''), 2000),
    cancelled_by        = v_bk.client_user_id,
    refund_amount       = 0,
    refund_status       = 'none',
    updated_at          = now()
  WHERE id = v_bk.id;

  INSERT INTO public.audit_logs (action, actor_id, entity_type, entity_id, before_data, after_data)
  VALUES ('booking.client_cancel', v_bk.client_user_id, 'booking', v_bk.id::text,
          jsonb_build_object('status', v_bk.status),
          jsonb_build_object('status', 'cancelled', 'reason', _reason));

  -- إشعار المصوّرة.
  INSERT INTO public.notifications (user_id, title, body, link)
  VALUES (v_bk.photographer_id, 'ألغى العميل الحجز',
          COALESCE(v_bk.client_name, 'العميل') || ' ألغى طلب الحجز بتاريخ ' || v_bk.event_date::text,
          '/dashboard/bookings/' || v_bk.id);

  RETURN jsonb_build_object(
    'booking_id',      v_bk.id,
    'cancelled_by',    'client',
    'photographer_id', v_bk.photographer_id,
    'client_name',     v_bk.client_name,
    'event_date',      v_bk.event_date
  );
END;
$$;

-- تُستدعى عبر service-role من server fn عامة (token-based)؛ نحجبها عن الأدوار العامة.
REVOKE ALL ON FUNCTION public.client_cancel_booking(text, text) FROM PUBLIC, anon, authenticated;
