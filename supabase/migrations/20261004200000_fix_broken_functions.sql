-- plpgsql_check found these functions broken on a fresh database (they only
-- fail when called): pgcrypto lives in the extensions schema, audit_logs.entity_id
-- is uuid, subscription_payments.method is an enum, referrals had no updated_at.

ALTER TYPE public.payment_method ADD VALUE IF NOT EXISTS 'hyperpay';
ALTER TYPE public.payment_method ADD VALUE IF NOT EXISTS 'gateway';
ALTER TABLE public.referrals ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE OR REPLACE FUNCTION public.regenerate_booking_token(_booking_id uuid)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_token text;
  v_photographer uuid;
BEGIN
  SELECT photographer_id INTO v_photographer FROM public.bookings WHERE id = _booking_id;
  IF v_photographer IS NULL THEN RAISE EXCEPTION 'booking not found'; END IF;
  IF v_photographer != auth.uid() AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  
  v_token := encode(extensions.gen_random_bytes(24), 'base64');
  v_token := replace(replace(replace(v_token, '/', '_'), '+', '-'), '=', '');
  
  UPDATE public.bookings 
  SET client_tracking_token = v_token,
      token_expires_at = COALESCE(event_date + interval '90 days', now() + interval '90 days'),
      updated_at = now()
  WHERE id = _booking_id;
  
  RETURN v_token;
END;
$function$

;

CREATE OR REPLACE FUNCTION public.auto_generate_contract(_booking_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_bk       public.bookings%ROWTYPE;
  v_template public.contract_templates%ROWTYPE;
  v_contract uuid;
  v_body     text;
BEGIN
  SELECT * INTO v_bk FROM public.bookings WHERE id = _booking_id AND deleted_at IS NULL;
  IF NOT FOUND THEN RAISE EXCEPTION 'BOOKING_NOT_FOUND'; END IF;

  -- ابحث عن قالب افتراضي للمصوّرة.
  SELECT * INTO v_template
  FROM public.contract_templates
  WHERE photographer_id = v_bk.photographer_id AND is_default = true
  LIMIT 1;

  -- إن لم يوجد قالب افتراضي، خذ أي قالب للمصوّرة.
  IF NOT FOUND THEN
    SELECT * INTO v_template
    FROM public.contract_templates
    WHERE photographer_id = v_bk.photographer_id
    ORDER BY created_at DESC LIMIT 1;
  END IF;

  -- إن لم يوجد أي قالب، لا تنشئ عقداً (لا خطأ — العقد اختياري).
  IF NOT FOUND THEN RETURN NULL; END IF;

  -- استبدل المتغيّرات في القالب.
  v_body := v_template.body;
  v_body := replace(v_body, '{{client_name}}', COALESCE(v_bk.client_name, ''));
  v_body := replace(v_body, '{{event_date}}', COALESCE(v_bk.event_date::text, ''));
  v_body := replace(v_body, '{{start_time}}', COALESCE(v_bk.start_time::text, ''));
  v_body := replace(v_body, '{{end_time}}', COALESCE(v_bk.end_time::text, ''));
  v_body := replace(v_body, '{{venue_address}}', COALESCE(v_bk.venue_address, ''));
  v_body := replace(v_body, '{{total_price}}', COALESCE(v_bk.total_price::text, '0'));
  v_body := replace(v_body, '{{deposit_amount}}', COALESCE(v_bk.deposit_amount::text, '0'));
  v_body := replace(v_body, '{{service}}', COALESCE(v_bk.service::text, ''));

  -- أنشئ العقد.
  INSERT INTO public.contracts (
    booking_id, photographer_id, client_name, body, sign_token
  ) VALUES (
    v_bk.id, v_bk.photographer_id, v_bk.client_name, v_body,
    encode(extensions.gen_random_bytes(32), 'hex')
  )
  RETURNING id INTO v_contract;

  PERFORM public.log_audit('contract.auto_generate', 'contract', v_contract::text, NULL,
                           jsonb_build_object('booking_id', _booking_id));

  RETURN v_contract;
END;
$function$

;

CREATE OR REPLACE FUNCTION public.client_cancel_booking(_token text, _reason text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
  VALUES ('booking.client_cancel', v_bk.client_user_id, 'booking', v_bk.id,
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
$function$

;

CREATE OR REPLACE FUNCTION public.cancel_booking(_booking_id uuid, _reason text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
  VALUES ('booking.cancel', auth.uid(), 'booking', _booking_id,
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
$function$

;

CREATE OR REPLACE FUNCTION public.grant_referral_reward(_referred_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_referrer_id uuid;
  v_sub record;
  v_new_end timestamptz;
BEGIN
  -- Find the pending referral for this newly-paid photographer.
  -- reward_granted=false ensures idempotency (one reward per referral).
  SELECT referrer_id INTO v_referrer_id
  FROM public.referrals
  WHERE referred_id = _referred_id
    AND reward_granted = false;

  -- No pending referral → nothing to do.
  IF v_referrer_id IS NULL THEN
    RETURN;
  END IF;

  -- Atomically mark reward as granted to prevent race conditions.
  UPDATE public.referrals
  SET reward_granted = true,
      updated_at = now()
  WHERE referred_id = _referred_id
    AND reward_granted = false;

  -- If no row was updated, another call already processed it.
  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- Fetch referrer's subscription to determine extension target.
  SELECT * INTO v_sub
  FROM public.subscriptions
  WHERE photographer_id = v_referrer_id;

  -- If referrer has no subscription row, create one with a 14-day trial.
  IF v_sub IS NULL THEN
    INSERT INTO public.subscriptions
      (photographer_id, status, trial_ends_at, current_period_start, current_period_end)
    VALUES
      (v_referrer_id, 'trial', now() + interval '14 days', now(), now() + interval '14 days');
  ELSE
    -- Extend the appropriate end date by 14 days.
    -- If currently in trial → extend trial_ends_at.
    -- If active/paid → extend current_period_end.
    IF v_sub.status = 'trial' AND v_sub.trial_ends_at > now() THEN
      v_new_end := v_sub.trial_ends_at + interval '14 days';
      UPDATE public.subscriptions
      SET trial_ends_at = v_new_end,
          updated_at = now()
      WHERE photographer_id = v_referrer_id;
    ELSE
      v_new_end := GREATEST(COALESCE(v_sub.current_period_end, now()), now()) + interval '14 days';
      UPDATE public.subscriptions
      SET current_period_end = v_new_end,
          updated_at = now()
      WHERE photographer_id = v_referrer_id;
    END IF;
  END IF;

  -- Audit log: record the reward grant for transparency.
  PERFORM public.log_audit(
    'referral.reward_granted',
    'referral',
    _referred_id::text,
    jsonb_build_object('referrer_id', v_referrer_id, 'referred_id', _referred_id),
    jsonb_build_object('reward_days', 14, 'new_end_date', v_new_end)
  );
END;
$function$

;

CREATE OR REPLACE FUNCTION public.renew_subscription_paid(_photographer_id uuid, _months integer, _amount numeric, _provider text, _ref text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
  VALUES (_photographer_id, COALESCE(_amount,0), (CASE COALESCE(_provider,'') WHEN 'cliq' THEN 'cliq' WHEN 'stripe' THEN 'stripe' WHEN 'hyperpay' THEN 'hyperpay' ELSE 'gateway' END)::public.payment_method, 'approved', _months,
    'تجديد تلقائي عبر بوّابة الدفع' || COALESCE(' (ref: ' || _ref || ')',''), now());
END; $function$

;
CREATE OR REPLACE FUNCTION public.renew_subscription_paid(_photographer_id uuid, _months integer, _provider text DEFAULT 'stripe'::text, _intent text DEFAULT NULL::text, _amount numeric DEFAULT NULL::numeric, _currency text DEFAULT 'JOD'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_start timestamptz;
  v_end   timestamptz;
BEGIN
  IF _months IS NULL OR _months <= 0 THEN
    RAISE EXCEPTION 'INVALID_MONTHS';
  END IF;

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

  -- Record payment in subscription_payments table.
  INSERT INTO public.subscription_payments
    (photographer_id, amount, currency, method, period_months, status, stripe_payment_intent_id)
  VALUES
    (_photographer_id, COALESCE(_amount, 0), _currency, (CASE COALESCE(_provider,'') WHEN 'cliq' THEN 'cliq' WHEN 'stripe' THEN 'stripe' WHEN 'hyperpay' THEN 'hyperpay' ELSE 'gateway' END)::public.payment_method, _months, 'approved', _intent);

  -- Trigger referral reward if this is the first paid subscription for this user.
  PERFORM public.grant_referral_reward(_photographer_id);

  -- Audit log.
  PERFORM public.log_audit(
    'subscription.renew',
    'subscription',
    _photographer_id::text,
    NULL,
    jsonb_build_object('months', _months, 'current_period_end', v_end, 'provider', _provider)
  );

  RETURN jsonb_build_object('ok', true, 'current_period_end', v_end);
END;
$function$
;
