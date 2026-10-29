-- Clear rules up front (the platform does not arbitrate):
--   * The bride can cancel at any time before the event. Before a deposit it costs nothing;
--     after a deposit she gets back only what the photographer's declared policy says.
--   * A photographer who cancels owes the whole deposit back.
--   * Default deposit policy for a bride's cancellation is 'none' (deposit is not refunded).
--     No UI ever set this column, so existing 'full' values were never a real choice.
--   * deposit_terms_accepted_at records when the bride accepted those terms before paying.
--   * profiles.team_gender: who is on the photographer's team (female / male / mixed).

ALTER TABLE public.profiles ALTER COLUMN deposit_refund_policy SET DEFAULT 'none';
UPDATE public.profiles SET deposit_refund_policy = 'none' WHERE deposit_refund_policy = 'full';

ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS deposit_terms_accepted_at timestamptz;

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS team_gender text;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_team_gender_check') THEN
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_team_gender_check
      CHECK (team_gender IS NULL OR team_gender IN ('female', 'male', 'mixed'));
  END IF;
END $$;
GRANT SELECT (team_gender, deposit_refund_policy, deposit_refund_percent) ON public.profiles TO anon, authenticated;
GRANT UPDATE (team_gender) ON public.profiles TO authenticated;

-- Bride cancels by tracking token -----------------------------------------
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
    SELECT deposit_refund_policy, deposit_refund_percent INTO v_policy, v_percent
    FROM public.profiles WHERE id = v_bk.photographer_id;
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
          jsonb_build_object('status', 'cancelled', 'reason', _reason, 'refund_amount', v_refund, 'policy', v_policy));

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

-- Photographer (or admin) cancels: the whole paid deposit is owed back ------
CREATE OR REPLACE FUNCTION public.cancel_booking(_booking_id uuid, _reason text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_bk        public.bookings%ROWTYPE;
  v_refund    numeric := 0;
  v_refund_st text := 'none';
BEGIN
  SELECT * INTO v_bk FROM public.bookings
  WHERE id = _booking_id AND deleted_at IS NULL
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'BOOKING_NOT_FOUND'; END IF;

  IF v_bk.photographer_id != auth.uid() AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  IF v_bk.status = 'completed' THEN RAISE EXCEPTION 'CANNOT_CANCEL_COMPLETED'; END IF;
  IF v_bk.status = 'cancelled' THEN RAISE EXCEPTION 'ALREADY_CANCELLED'; END IF;

  IF (v_bk.deposit_confirmed_at IS NOT NULL OR v_bk.deposit_sent_at IS NOT NULL)
     AND COALESCE(v_bk.deposit_amount, 0) > 0 THEN
    v_refund := v_bk.deposit_amount;
    v_refund_st := 'pending';
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

  INSERT INTO public.audit_logs (action, actor_id, entity_type, entity_id, before_data, after_data)
  VALUES ('booking.cancel', auth.uid(), 'booking', _booking_id,
          jsonb_build_object('status', v_bk.status),
          jsonb_build_object('status', 'cancelled', 'refund_amount', v_refund, 'refund_status', v_refund_st, 'reason', _reason));

  IF v_bk.client_user_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, title, body, link)
    VALUES (v_bk.client_user_id, 'تم إلغاء الحجز',
            'تم إلغاء حجزك من قبل المصوّرة' ||
            CASE WHEN v_refund > 0 THEN '. عليها إرجاع العربون كاملاً: ' || v_refund::text || ' د.أ' ELSE '' END,
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
$function$;

-- Tracking page data: + deposit policy, terms acceptance, final payment ------
CREATE OR REPLACE FUNCTION public.get_booking_by_token(_token text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v jsonb;
  v_status text;
  v_expired boolean;
BEGIN
  SELECT
    jsonb_build_object(
      'id', b.id, 'status', b.status, 'production_stage', b.production_stage,
      'event_date', b.event_date, 'start_time', b.start_time, 'end_time', b.end_time,
      'service', b.service, 'venue_address', b.venue_address,
      'base_price', b.base_price, 'total_price', b.total_price, 'deposit_amount', b.deposit_amount,
      'deposit_sent_at', b.deposit_sent_at, 'deposit_confirmed_at', b.deposit_confirmed_at,
      'deposit_checkout_session_id', b.deposit_checkout_session_id,
      'deposit_terms_accepted_at', b.deposit_terms_accepted_at,
      'final_paid_at', b.final_paid_at,
      'delivered_at', b.delivered_at, 'client_received_at', b.client_received_at,
      'cancelled_at', b.cancelled_at, 'cancellation_reason', b.cancellation_reason,
      'auto_cancel_kind', b.auto_cancel_kind,
      'refund_amount', b.refund_amount, 'refund_status', b.refund_status,
      'client_notes', b.client_notes, 'client_name', b.client_name, 'addons', b.addons,
      'token_expires_at', b.token_expires_at,
      'created_at', b.created_at,
      'sneak_peek_url', b.sneak_peek_url,
      'needs_approval', b.needs_approval,
      'approved_at', b.approved_at,
      'approval_due_at', CASE WHEN b.needs_approval AND b.approved_at IS NULL AND b.phone_verified_at IS NOT NULL
                              THEN b.phone_verified_at + interval '24 hours' END,
      'deposit_due_at', CASE WHEN (NOT b.needs_approval OR b.approved_at IS NOT NULL)
                              THEN COALESCE(b.approved_at, b.created_at) + interval '48 hours' END,
      'photographer', jsonb_build_object(
        'display_name', p.display_name, 'username', p.username,
        'whatsapp', pp.whatsapp, 'phone', pp.phone,
        'deposit_refund_policy', COALESCE(p.deposit_refund_policy, 'none'),
        'deposit_refund_percent', p.deposit_refund_percent,
        'cliq_alias', CASE
          WHEN b.status IN ('confirmed','completed')
            OR (b.deposit_amount > 0 AND (NOT b.needs_approval OR b.approved_at IS NOT NULL))
          THEN pp.cliq_alias ELSE NULL END,
        'bank_info', CASE
          WHEN b.status IN ('confirmed','completed')
            OR (b.deposit_amount > 0 AND (NOT b.needs_approval OR b.approved_at IS NOT NULL))
          THEN pp.bank_info ELSE NULL END,
        'avatar_url', p.avatar_url
      )
    ) INTO v
  FROM public.bookings b
  JOIN public.profiles p ON p.id = b.photographer_id
  LEFT JOIN public.photographer_private pp ON pp.user_id = p.id
  WHERE b.client_tracking_token = _token AND b.deleted_at IS NULL;

  IF v IS NULL THEN
    RETURN NULL;
  END IF;

  v_status := v->>'status';
  v_expired := (v->>'token_expires_at') IS NOT NULL AND (v->>'token_expires_at')::timestamptz < now();

  IF v_status = 'cancelled' AND v_expired THEN
    RETURN NULL;
  END IF;

  RETURN v;
END;
$function$;
GRANT EXECUTE ON FUNCTION public.get_booking_by_token(text) TO anon, authenticated;
