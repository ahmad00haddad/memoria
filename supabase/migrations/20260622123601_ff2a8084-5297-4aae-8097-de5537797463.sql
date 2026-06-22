-- Apply 4 stacked migrations (fixed: audit_logs.entity_id is uuid, pass uuid directly)

-- ============================================================
-- 1) PHASE 0 — Booking integrity
-- ============================================================
CREATE OR REPLACE FUNCTION public.has_booking_conflict(
  _pid uuid, _date date, _start time, _end time, _exclude uuid DEFAULT NULL
) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.bookings b
    WHERE b.photographer_id = _pid
      AND b.event_date = _date
      AND b.deleted_at IS NULL
      AND b.status IN ('pending_deposit','confirmed','completed')
      AND (_exclude IS NULL OR b.id <> _exclude)
      AND b.start_time < _end AND _start < b.end_time
  );
$$;

CREATE OR REPLACE FUNCTION public.create_booking_guarded(_payload jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_pid uuid := (_payload->>'photographer_id')::uuid;
  v_date date := (_payload->>'event_date')::date;
  v_start time := (_payload->>'start_time')::time;
  v_end time := (_payload->>'end_time')::time;
  v_email text := _payload->>'client_email';
  v_existing public.bookings%ROWTYPE;
  v_id uuid; v_token text;
BEGIN
  IF v_pid IS NULL OR v_date IS NULL OR v_start IS NULL OR v_end IS NULL THEN
    RAISE EXCEPTION 'INVALID_PAYLOAD';
  END IF;
  IF v_end <= v_start THEN RAISE EXCEPTION 'INVALID_TIME'; END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(v_pid::text || '|' || v_date::text, 0));

  SELECT * INTO v_existing FROM public.bookings b
  WHERE b.photographer_id = v_pid
    AND lower(b.client_email) = lower(v_email)
    AND b.event_date = v_date AND b.start_time = v_start
    AND b.deleted_at IS NULL AND b.created_at > now() - interval '2 minutes'
  ORDER BY b.created_at DESC LIMIT 1;

  IF FOUND THEN
    RETURN jsonb_build_object('booking_id', v_existing.id,
      'tracking_token', v_existing.client_tracking_token, 'deduped', true);
  END IF;

  IF public.is_photographer_busy(v_pid, v_date) THEN RAISE EXCEPTION 'DAY_UNAVAILABLE'; END IF;
  IF public.has_booking_conflict(v_pid, v_date, v_start, v_end, NULL) THEN
    RAISE EXCEPTION 'SLOT_CONFLICT';
  END IF;

  INSERT INTO public.bookings (
    photographer_id, client_name, client_email, client_phone, service,
    event_date, start_time, end_time, venue_address,
    base_price, travel_fee, total_price, deposit_amount,
    privacy_level, photographer_can_publish, client_notes,
    contract_agreed, status, addons
  ) VALUES (
    v_pid, _payload->>'client_name', v_email, _payload->>'client_phone',
    (_payload->>'service')::public.service_type,
    v_date, v_start, v_end, NULLIF(_payload->>'venue_address',''),
    COALESCE((_payload->>'base_price')::numeric, 0), 0,
    COALESCE((_payload->>'total_price')::numeric, 0),
    COALESCE((_payload->>'deposit_amount')::numeric, 0),
    COALESCE(_payload->>'privacy_level','public'),
    COALESCE((_payload->>'photographer_can_publish')::boolean, true),
    NULLIF(_payload->>'client_notes',''), true, 'pending_deposit',
    COALESCE(_payload->'addons','[]'::jsonb)
  ) RETURNING id, client_tracking_token INTO v_id, v_token;

  RETURN jsonb_build_object('booking_id', v_id, 'tracking_token', v_token, 'deduped', false);
END; $$;

GRANT EXECUTE ON FUNCTION public.has_booking_conflict(uuid, date, time, time, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_booking_guarded(jsonb) TO anon, authenticated;

-- ============================================================
-- 2) PAYMENTS INTEGRATION
-- ============================================================
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS deposit_payment_provider    text,
  ADD COLUMN IF NOT EXISTS deposit_checkout_session_id text,
  ADD COLUMN IF NOT EXISTS deposit_payment_intent_id   text;

CREATE INDEX IF NOT EXISTS idx_bookings_deposit_session
  ON public.bookings (deposit_checkout_session_id) WHERE deposit_checkout_session_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_bookings_deposit_intent
  ON public.bookings (deposit_payment_intent_id) WHERE deposit_payment_intent_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.payment_events (
  id                 text PRIMARY KEY,
  provider           text NOT NULL,
  event_type         text,
  related_booking_id uuid REFERENCES public.bookings(id) ON DELETE SET NULL,
  related_user_id    uuid,
  processed_at       timestamptz NOT NULL DEFAULT now(),
  created_at         timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.payment_events TO service_role;
ALTER TABLE public.payment_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.payment_events FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.confirm_booking_deposit_paid(
  _booking_id uuid, _provider text, _session text DEFAULT NULL, _intent text DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_bk public.bookings%ROWTYPE; v_already boolean := false;
BEGIN
  SELECT * INTO v_bk FROM public.bookings WHERE id = _booking_id AND deleted_at IS NULL FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'BOOKING_NOT_FOUND'; END IF;

  IF v_bk.deposit_confirmed_at IS NOT NULL AND v_bk.status = 'confirmed' THEN
    v_already := true;
  ELSE
    UPDATE public.bookings SET
      status = CASE WHEN status IN ('quote','pending_deposit') THEN 'confirmed'::public.booking_status ELSE status END,
      deposit_confirmed_at = COALESCE(deposit_confirmed_at, now()),
      deposit_payment_provider = COALESCE(_provider, deposit_payment_provider),
      deposit_checkout_session_id = COALESCE(_session, deposit_checkout_session_id),
      deposit_payment_intent_id = COALESCE(_intent, deposit_payment_intent_id),
      updated_at = now()
    WHERE id = _booking_id;
  END IF;

  RETURN jsonb_build_object(
    'booking_id', v_bk.id, 'already_confirmed', v_already, 'status', v_bk.status,
    'client_email', v_bk.client_email, 'client_name', v_bk.client_name,
    'client_phone', v_bk.client_phone, 'client_user_id', v_bk.client_user_id,
    'photographer_id', v_bk.photographer_id, 'event_date', v_bk.event_date,
    'tracking_token', v_bk.client_tracking_token
  );
END; $$;
REVOKE ALL ON FUNCTION public.confirm_booking_deposit_paid(uuid,text,text,text) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.renew_subscription_paid(_photographer_id uuid, _months int, _amount numeric, _provider text, _ref text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_start timestamptz; v_end timestamptz;
BEGIN
  IF _months IS NULL OR _months <= 0 THEN RAISE EXCEPTION 'invalid months'; END IF;
  SELECT GREATEST(COALESCE(current_period_end, now()), now()) INTO v_start
    FROM public.subscriptions WHERE photographer_id = _photographer_id;
  IF v_start IS NULL THEN v_start := now(); END IF;
  v_end := v_start + (_months || ' months')::interval;
  INSERT INTO public.subscriptions (photographer_id, status, current_period_start, current_period_end, trial_ends_at)
  VALUES (_photographer_id, 'active', now(), v_end, now())
  ON CONFLICT (photographer_id) DO UPDATE
    SET status = 'active',
        current_period_start = COALESCE(public.subscriptions.current_period_start, now()),
        current_period_end = v_end, updated_at = now();
  INSERT INTO public.subscription_payments (photographer_id, amount, method, status, period_months, notes, reviewed_at)
  VALUES (_photographer_id, COALESCE(_amount,0), COALESCE(_provider,'gateway'), 'approved', _months,
    'تجديد تلقائي عبر بوّابة الدفع' || COALESCE(' (ref: ' || _ref || ')',''), now());
END; $$;
REVOKE ALL ON FUNCTION public.renew_subscription_paid(uuid,int,numeric,text,text) FROM PUBLIC, anon, authenticated;

-- ============================================================
-- 3) BOOKING CANCELLATION + REFUND
-- ============================================================
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS cancelled_at        timestamptz,
  ADD COLUMN IF NOT EXISTS cancellation_reason text,
  ADD COLUMN IF NOT EXISTS cancelled_by        uuid,
  ADD COLUMN IF NOT EXISTS refund_amount       numeric,
  ADD COLUMN IF NOT EXISTS refund_status       text;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS deposit_refund_policy  text NOT NULL DEFAULT 'full',
  ADD COLUMN IF NOT EXISTS deposit_refund_percent int;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_deposit_refund_policy_check') THEN
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_deposit_refund_policy_check
      CHECK (deposit_refund_policy IN ('full','partial','none'));
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.cancel_booking(_booking_id uuid, _reason text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_bk public.bookings%ROWTYPE; v_policy text; v_percent int;
        v_refund numeric := 0; v_refund_st text := 'none';
BEGIN
  SELECT * INTO v_bk FROM public.bookings WHERE id = _booking_id AND deleted_at IS NULL FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'BOOKING_NOT_FOUND'; END IF;
  IF v_bk.photographer_id != auth.uid() AND NOT public.has_role(auth.uid(),'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  IF v_bk.status = 'completed' THEN RAISE EXCEPTION 'CANNOT_CANCEL_COMPLETED'; END IF;
  IF v_bk.status = 'cancelled' THEN RAISE EXCEPTION 'ALREADY_CANCELLED'; END IF;

  IF v_bk.deposit_confirmed_at IS NOT NULL AND COALESCE(v_bk.deposit_amount,0) > 0 THEN
    SELECT deposit_refund_policy, deposit_refund_percent INTO v_policy, v_percent
      FROM public.profiles WHERE id = v_bk.photographer_id;
    v_policy := COALESCE(v_policy,'full');
    IF v_policy = 'full' THEN v_refund := v_bk.deposit_amount;
    ELSIF v_policy = 'partial' THEN v_refund := round(v_bk.deposit_amount * (COALESCE(v_percent,0)::numeric/100), 2);
    ELSE v_refund := 0;
    END IF;
    v_refund_st := CASE WHEN v_refund > 0 THEN 'pending' ELSE 'none' END;
  END IF;

  UPDATE public.bookings SET status='cancelled', cancelled_at=now(),
    cancellation_reason=LEFT(COALESCE(_reason,''),2000), cancelled_by=auth.uid(),
    refund_amount=v_refund, refund_status=v_refund_st, updated_at=now()
  WHERE id = _booking_id;

  INSERT INTO public.audit_logs (action, actor_id, entity_type, entity_id, before_data, after_data)
  VALUES ('booking.cancel', auth.uid(), 'booking', _booking_id,
    jsonb_build_object('status', v_bk.status),
    jsonb_build_object('status','cancelled','refund_amount',v_refund,'refund_status',v_refund_st,'reason',_reason));

  IF v_bk.client_user_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, title, body, link)
    VALUES (v_bk.client_user_id, 'تم إلغاء الحجز',
      'تم إلغاء حجزك من قبل المصوّرة' ||
      CASE WHEN v_refund > 0 THEN '. سيتم رد عربون بقيمة ' || v_refund::text ELSE '' END,
      '/track/' || v_bk.client_tracking_token);
  END IF;

  RETURN jsonb_build_object('booking_id', v_bk.id, 'cancelled_by','photographer',
    'client_email', v_bk.client_email, 'client_name', v_bk.client_name,
    'client_phone', v_bk.client_phone, 'photographer_id', v_bk.photographer_id,
    'event_date', v_bk.event_date, 'tracking_token', v_bk.client_tracking_token,
    'refund_amount', v_refund, 'refund_status', v_refund_st);
END; $$;
REVOKE ALL ON FUNCTION public.cancel_booking(uuid,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cancel_booking(uuid,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.client_cancel_booking(_token text, _reason text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_bk public.bookings%ROWTYPE;
BEGIN
  SELECT * INTO v_bk FROM public.bookings WHERE client_tracking_token = _token AND deleted_at IS NULL FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'invalid token'; END IF;
  IF v_bk.status NOT IN ('quote','pending_deposit') THEN RAISE EXCEPTION 'CLIENT_CANCEL_NOT_ALLOWED'; END IF;

  UPDATE public.bookings SET status='cancelled', cancelled_at=now(),
    cancellation_reason=LEFT(COALESCE(_reason,''),2000), cancelled_by=v_bk.client_user_id,
    refund_amount=0, refund_status='none', updated_at=now()
  WHERE id = v_bk.id;

  INSERT INTO public.audit_logs (action, actor_id, entity_type, entity_id, before_data, after_data)
  VALUES ('booking.client_cancel', v_bk.client_user_id, 'booking', v_bk.id,
    jsonb_build_object('status', v_bk.status),
    jsonb_build_object('status','cancelled','reason',_reason));

  INSERT INTO public.notifications (user_id, title, body, link)
  VALUES (v_bk.photographer_id, 'ألغى العميل الحجز',
    COALESCE(v_bk.client_name,'العميل') || ' ألغى طلب الحجز بتاريخ ' || v_bk.event_date::text,
    '/dashboard/bookings/' || v_bk.id);

  RETURN jsonb_build_object('booking_id', v_bk.id, 'cancelled_by','client',
    'photographer_id', v_bk.photographer_id, 'client_name', v_bk.client_name,
    'event_date', v_bk.event_date);
END; $$;
REVOKE ALL ON FUNCTION public.client_cancel_booking(text,text) FROM PUBLIC, anon, authenticated;

-- ============================================================
-- 4) REVIEW MODERATION + AUDIT
-- ============================================================
ALTER TABLE public.reviews ALTER COLUMN is_published SET DEFAULT false;

CREATE OR REPLACE FUNCTION public.log_audit(
  _action text, _entity_type text, _entity_id uuid,
  _before jsonb DEFAULT NULL, _after jsonb DEFAULT NULL
) RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  INSERT INTO public.audit_logs (action, actor_id, entity_type, entity_id, before_data, after_data)
  VALUES (_action, auth.uid(), _entity_type, _entity_id, _before, _after);
$$;
REVOKE ALL ON FUNCTION public.log_audit(text,text,uuid,jsonb,jsonb) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.approve_review(_review_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  UPDATE public.reviews SET is_published = true WHERE id = _review_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'review not found'; END IF;
  PERFORM public.log_audit('review.approve','review',_review_id,NULL,
    jsonb_build_object('is_published', true));
END; $$;
REVOKE ALL ON FUNCTION public.approve_review(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.approve_review(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.reject_review(_review_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  DELETE FROM public.reviews WHERE id = _review_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'review not found'; END IF;
  PERFORM public.log_audit('review.reject','review',_review_id,NULL,NULL);
END; $$;
REVOKE ALL ON FUNCTION public.reject_review(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reject_review(uuid) TO authenticated;