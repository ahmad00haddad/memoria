-- تدقيق المنطق 2026-11-20:
-- 1) client_mark_deposit_sent: حُذف فرع EXPIRED_BOOKING (منذ 2026-11-16 الحجز المعتمد يحجز يومه حتى التأكيد أو الإلغاء،
--    فرسالة «حُجز الموعد لعميلة أخرى» لم تعد صحيحة)، ولا إيصال لحجز مرّ موعده.
-- 2) client_cancel_booking: «اليوم» بتوقيت الأردن (كان CURRENT_DATE بتوقيت UTC فيسمح بإلغاء حجز الأمس بين 00:00 و03:00).
BEGIN;

CREATE OR REPLACE FUNCTION public.client_mark_deposit_sent(_token text, _proof_path text, _reference text, _note text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_bk record;
BEGIN
  SELECT id, photographer_id, client_name, created_at, status, event_date, start_time, end_time,
         phone_verified_at, needs_approval, approved_at
    INTO v_bk
  FROM public.bookings WHERE client_tracking_token = _token AND deleted_at IS NULL;
  IF v_bk.id IS NULL THEN RAISE EXCEPTION 'invalid token'; END IF;
  IF v_bk.phone_verified_at IS NULL THEN RAISE EXCEPTION 'BOOKING_NOT_VERIFIED'; END IF;
  IF v_bk.status NOT IN ('quote', 'pending_deposit') THEN RAISE EXCEPTION 'BOOKING_NOT_AWAITING_DEPOSIT'; END IF;
  IF v_bk.needs_approval AND v_bk.approved_at IS NULL THEN RAISE EXCEPTION 'BOOKING_NOT_APPROVED'; END IF;
  IF v_bk.event_date < (now() AT TIME ZONE 'Asia/Amman')::date THEN RAISE EXCEPTION 'EVENT_PASSED'; END IF;

  UPDATE public.bookings
  SET deposit_sent_at = now(),
      deposit_proof_url = COALESCE(_proof_path, deposit_proof_url),
      client_notes = CASE
        WHEN _note IS NULL OR _note = '' THEN client_notes
        ELSE COALESCE(client_notes || E'\n', '') || _note
      END,
      updated_at = now()
  WHERE id = v_bk.id;

  INSERT INTO public.notifications (user_id, title, body, link)
  VALUES (v_bk.photographer_id,
          'وصل إثبات العربون',
          COALESCE(v_bk.client_name, 'العميلة') || ' أرسلت إثبات دفع العربون. تأكّدي من وصول المبلغ في تطبيق البنك ثم ثبّتي الحجز.',
          '/dashboard/bookings/' || v_bk.id);
END;
$$;
REVOKE ALL ON FUNCTION public.client_mark_deposit_sent(text, text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.client_mark_deposit_sent(text, text, text, text) TO service_role;

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

  IF v_bk.status NOT IN ('quote', 'pending_deposit', 'confirmed') OR v_bk.event_date < (now() AT TIME ZONE 'Asia/Amman')::date THEN
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

COMMIT;
