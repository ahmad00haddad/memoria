-- 2026-11-04 — إغلاق ثغرات الإساءة من العروس ومن المصوّرة (تدقيق "ماذا لو حاول أحدهم...")
--
--  1) المصوّرة كانت تقدر تعدّل أي عمود في حجزها مباشرة بتوكن الجلسة (RLS يفحص الصف فقط):
--     تغيّر السعر، تحذف لقطة الباقة، تضع client_received_at، تلغي بدون سجل استرداد، تبدّل
--     رمز التتبّع، أو تقلب خصوصية العروس إلى "نشر". الآن عمود محمي = لا يتغيّر إلا عبر دوال الخادم.
--  2) سياسة الاسترداد كانت تُقرأ "حيّة" عند إلغاء العروس، فتقدر المصوّرة تبدّلها بعد موافقة العروس.
--     الآن تُحفظ لقطة بالحجز لحظة الموافقة على الشروط.
--  3) client_mark_received كانت تقبل أي رمز في أي حالة: تحوّل حجزاً مؤكداً (أو ملغى!) إلى "مكتمل"
--     قبل المناسبة، فيُفتح التاريخ ويُفتح المعرض الأصلي. الآن لا إلا بعد أن تضع المصوّرة "تم التسليم".
--  4) soft_delete_booking: المصوّرة كانت تحذف حجزاً فيه عربون فتموت صفحة المتابعة عند العروس.
--  5) رموز تأكيد (OTP) على إيميل العروس للإجراءات المالية بالرابط: إلغاء بعد العربون، وموافقة على ملحق بمبلغ.
--     رابط المتابعة تعرفه المصوّرة أيضاً، أما صندوق بريد العروس فلا.

-- ---------------------------------------------------------------------------
-- 2) لقطة سياسة الاسترداد
-- ---------------------------------------------------------------------------
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS refund_policy_agreed text,
  ADD COLUMN IF NOT EXISTS refund_percent_agreed integer;

-- ---------------------------------------------------------------------------
-- 5) رموز تأكيد العروس (service role فقط: RLS مفعّل بدون أي policy)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.bride_action_codes (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id  uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  purpose     text NOT NULL,
  code_hash   text NOT NULL,
  attempts    integer NOT NULL DEFAULT 0,
  expires_at  timestamptz NOT NULL,
  used_at     timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS bride_action_codes_lookup_idx
  ON public.bride_action_codes (booking_id, purpose, created_at DESC);
ALTER TABLE public.bride_action_codes ENABLE ROW LEVEL SECURITY;

-- فهرس لعدّ محاولات الحدّ من المعدّل بسرعة
CREATE INDEX IF NOT EXISTS rate_limits_token_action_time_idx
  ON public.rate_limits (token, action, created_at DESC);

-- ---------------------------------------------------------------------------
-- 1) حراسة التعديل المباشر على الحجوزات
--    current_user = 'authenticated' يعني طلب مباشر من متصفح المصوّرة (PostgREST).
--    دوال SECURITY DEFINER تشتغل بصلاحية مالكها، وservice_role له دور مختلف، فلا يتأثران.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.guard_booking_direct_updates()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF current_user <> 'authenticated' THEN RETURN NEW; END IF;
  IF public.has_role(auth.uid(), 'admin') THEN RETURN NEW; END IF;

  IF NEW.client_tracking_token  IS DISTINCT FROM OLD.client_tracking_token
  OR NEW.client_received_at     IS DISTINCT FROM OLD.client_received_at
  OR NEW.package_snapshot       IS DISTINCT FROM OLD.package_snapshot
  OR NEW.privacy_level          IS DISTINCT FROM OLD.privacy_level
  OR NEW.photographer_can_publish IS DISTINCT FROM OLD.photographer_can_publish
  OR NEW.phone_verified_at      IS DISTINCT FROM OLD.phone_verified_at
  OR NEW.verified_via           IS DISTINCT FROM OLD.verified_via
  OR NEW.needs_approval         IS DISTINCT FROM OLD.needs_approval
  OR NEW.approved_at            IS DISTINCT FROM OLD.approved_at
  OR NEW.deposit_terms_accepted_at IS DISTINCT FROM OLD.deposit_terms_accepted_at
  OR NEW.refund_policy_agreed   IS DISTINCT FROM OLD.refund_policy_agreed
  OR NEW.refund_percent_agreed  IS DISTINCT FROM OLD.refund_percent_agreed
  OR NEW.refund_amount          IS DISTINCT FROM OLD.refund_amount
  OR NEW.refund_status          IS DISTINCT FROM OLD.refund_status
  OR NEW.cancelled_by           IS DISTINCT FROM OLD.cancelled_by
  OR NEW.cancelled_at           IS DISTINCT FROM OLD.cancelled_at
  OR NEW.cancellation_reason    IS DISTINCT FROM OLD.cancellation_reason
  OR NEW.deleted_at             IS DISTINCT FROM OLD.deleted_at
  OR NEW.photographer_id        IS DISTINCT FROM OLD.photographer_id
  OR NEW.client_name            IS DISTINCT FROM OLD.client_name
  OR NEW.client_email           IS DISTINCT FROM OLD.client_email
  OR NEW.client_phone           IS DISTINCT FROM OLD.client_phone
  OR NEW.event_date             IS DISTINCT FROM OLD.event_date
  OR NEW.start_time             IS DISTINCT FROM OLD.start_time
  OR NEW.end_time               IS DISTINCT FROM OLD.end_time
  OR NEW.base_price             IS DISTINCT FROM OLD.base_price
  OR NEW.total_price            IS DISTINCT FROM OLD.total_price
  OR NEW.deposit_amount         IS DISTINCT FROM OLD.deposit_amount
  OR NEW.addons                 IS DISTINCT FROM OLD.addons
  OR NEW.photos_promised        IS DISTINCT FROM OLD.photos_promised
  OR NEW.delivery_days_promised IS DISTINCT FROM OLD.delivery_days_promised
  OR NEW.delivery_due_at        IS DISTINCT FROM OLD.delivery_due_at
  OR NEW.overtime_fee_per_hour  IS DISTINCT FROM OLD.overtime_fee_per_hour
  OR NEW.deposit_sent_at        IS DISTINCT FROM OLD.deposit_sent_at
  OR NEW.deposit_proof_url      IS DISTINCT FROM OLD.deposit_proof_url
  THEN
    RAISE EXCEPTION 'PROTECTED_BOOKING_FIELD' USING ERRCODE = '42501';
  END IF;

  -- الإلغاء له مسار واحد (cancel_booking) حتى يُسجَّل الاسترداد والإشعار للعروس
  IF NEW.status = 'cancelled' AND OLD.status IS DISTINCT FROM 'cancelled' THEN
    RAISE EXCEPTION 'USE_CANCEL_BOOKING' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

-- الاسم يبدأ بـ aa_ ليعمل قبل باقي الـ triggers (الترتيب أبجدي) فلا يرى تعديلاتها كأنها من المصوّرة
DROP TRIGGER IF EXISTS aa_guard_booking_direct_updates ON public.bookings;
CREATE TRIGGER aa_guard_booking_direct_updates
  BEFORE UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.guard_booking_direct_updates();

-- ---------------------------------------------------------------------------
-- 2) إلغاء العروس يستعمل السياسة التي وافقت عليها (لقطة)، لا السياسة الحالية
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.client_cancel_booking(_token text, _reason text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_bk        public.bookings%ROWTYPE;
  v_policy    text;
  v_percent   int;
  v_paid      boolean;
  v_refund    numeric := 0;
  v_refund_st text := 'none';
BEGIN
  SELECT * INTO v_bk FROM public.bookings
  WHERE client_tracking_token = _token AND deleted_at IS NULL
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'invalid token'; END IF;

  IF v_bk.status NOT IN ('quote', 'pending_deposit', 'confirmed') OR v_bk.event_date < CURRENT_DATE THEN
    RAISE EXCEPTION 'CLIENT_CANCEL_NOT_ALLOWED';
  END IF;

  v_paid := (v_bk.deposit_sent_at IS NOT NULL OR v_bk.deposit_confirmed_at IS NOT NULL)
            AND COALESCE(v_bk.deposit_amount, 0) > 0;
  IF v_paid THEN
    IF v_bk.deposit_terms_accepted_at IS NOT NULL AND v_bk.refund_policy_agreed IS NOT NULL THEN
      v_policy  := v_bk.refund_policy_agreed;
      v_percent := v_bk.refund_percent_agreed;
    ELSE
      SELECT deposit_refund_policy, deposit_refund_percent INTO v_policy, v_percent
      FROM public.profiles WHERE id = v_bk.photographer_id;
    END IF;
    v_policy := COALESCE(v_policy, 'none');
    IF v_policy = 'full' THEN
      v_refund := v_bk.deposit_amount;
    ELSIF v_policy = 'partial' THEN
      v_refund := round(v_bk.deposit_amount * (COALESCE(v_percent, 0)::numeric / 100), 2);
    END IF;
    v_refund_st := CASE WHEN v_refund > 0 THEN 'pending' ELSE 'none' END;
  END IF;

  UPDATE public.bookings SET
    status              = 'cancelled',
    cancelled_at        = now(),
    cancellation_reason = LEFT(COALESCE(_reason, ''), 2000),
    cancelled_by        = v_bk.client_user_id,
    refund_amount       = v_refund,
    refund_status       = v_refund_st,
    updated_at          = now()
  WHERE id = v_bk.id;

  INSERT INTO public.audit_logs (action, actor_id, entity_type, entity_id, before_data, after_data)
  VALUES ('booking.client_cancel', v_bk.client_user_id, 'booking', v_bk.id,
          jsonb_build_object('status', v_bk.status, 'deposit_paid', v_paid),
          jsonb_build_object('status', 'cancelled', 'reason', _reason, 'refund_amount', v_refund,
                             'policy', v_policy, 'policy_source',
                             CASE WHEN v_bk.refund_policy_agreed IS NOT NULL AND v_bk.deposit_terms_accepted_at IS NOT NULL
                                  THEN 'agreed_snapshot' ELSE 'live' END));

  INSERT INTO public.notifications (user_id, title, body, link)
  VALUES (v_bk.photographer_id, 'ألغت العروس الحجز',
          COALESCE(v_bk.client_name, 'العروس') || ' ألغت الحجز بتاريخ ' || v_bk.event_date::text ||
          CASE WHEN v_refund > 0 THEN ' — حسب سياستك يُرجَع لها ' || v_refund::text || ' د.أ'
               WHEN v_paid THEN ' — العربون لا يُرجَع حسب سياستك'
               ELSE '' END,
          '/dashboard/bookings/' || v_bk.id);

  RETURN jsonb_build_object(
    'booking_id',      v_bk.id,
    'cancelled_by',    'client',
    'photographer_id', v_bk.photographer_id,
    'client_name',     v_bk.client_name,
    'event_date',      v_bk.event_date,
    'deposit_paid',    v_paid,
    'refund_amount',   v_refund
  );
END;
$function$;

-- ---------------------------------------------------------------------------
-- 3) تأكيد الاستلام: فقط بعد أن تضع المصوّرة الحجز "مكتمل/مُسلَّم"
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.client_mark_received(_token text)
RETURNS void
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

  IF v_bk.client_received_at IS NOT NULL THEN RETURN; END IF;           -- مكرّر: لا شيء
  IF v_bk.status <> 'completed' THEN RAISE EXCEPTION 'NOT_DELIVERED_YET'; END IF;

  UPDATE public.bookings
  SET client_received_at = now(), updated_at = now()
  WHERE id = v_bk.id;

  INSERT INTO public.notifications (user_id, title, body, link)
  VALUES (v_bk.photographer_id, 'العميل أكّد استلام الصور', 'تم إغلاق الحجز كمكتمل.',
          '/dashboard/bookings/' || v_bk.id);
END;
$$;

-- ---------------------------------------------------------------------------
-- 4) لا حذف لحجز فيه عربون قائم (يُلغى أولاً ليصل العروس إشعار واسترداد)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.soft_delete_booking(_booking_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_bk public.bookings%ROWTYPE;
BEGIN
  SELECT * INTO v_bk FROM public.bookings WHERE id = _booking_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'booking not found'; END IF;
  IF v_bk.photographer_id != auth.uid() AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  IF v_bk.photographer_id = auth.uid()
     AND v_bk.status IN ('pending_deposit', 'confirmed')
     AND (v_bk.deposit_sent_at IS NOT NULL OR v_bk.deposit_confirmed_at IS NOT NULL)
     AND COALESCE(v_bk.deposit_amount, 0) > 0
     AND v_bk.verified_via IS DISTINCT FROM 'manual' THEN
    RAISE EXCEPTION 'BOOKING_HAS_ACTIVE_DEPOSIT';
  END IF;

  UPDATE public.bookings
  SET deleted_at = now(), updated_at = now()
  WHERE id = _booking_id;

  PERFORM public.log_audit('booking.delete', 'booking', _booking_id::text, NULL,
                           jsonb_build_object('deleted', true));
END;
$$;
