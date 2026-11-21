-- ثلاث إعدادات تحكّم للمصوّرة (تُخزَّن في profiles.page_settings):
--   approval_hours  : مهلة ردّها على الطلب (24 | 48 | 72، الافتراضي 24)
--   min_notice_days : أقل مهلة بين الطلب والمناسبة بالأيام (الافتراضي 0)
--   buffer_minutes  : فاصل بين حجزين في نفس اليوم، عند وضع "أكثر من حجز" (الافتراضي 0)
BEGIN;

CREATE OR REPLACE FUNCTION public.page_setting_int(_pid uuid, _key text, _default integer)
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((SELECT CASE WHEN page_settings->>_key ~ '^[0-9]{1,4}$' THEN (page_settings->>_key)::integer END
                     FROM public.profiles WHERE id = _pid), _default);
$$;
REVOKE EXECUTE ON FUNCTION public.page_setting_int(uuid, text, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.page_setting_int(uuid, text, integer) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.approval_window_hours(_pid uuid)
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE WHEN h IN (24, 48, 72) THEN h ELSE 24 END FROM (SELECT public.page_setting_int(_pid, 'approval_hours', 24) AS h) x;
$$;
REVOKE EXECUTE ON FUNCTION public.approval_window_hours(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.approval_window_hours(uuid) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.booking_holds(b public.bookings)
RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT b.status IN ('confirmed', 'completed')
      OR (b.status IN ('quote', 'pending_deposit') AND (
            (b.phone_verified_at IS NULL AND b.created_at >= now() - interval '30 minutes')
         OR (b.phone_verified_at IS NOT NULL AND b.needs_approval AND b.approved_at IS NULL
             AND b.phone_verified_at >= now() - make_interval(hours => public.approval_window_hours(b.photographer_id)))
         OR (b.phone_verified_at IS NOT NULL AND (NOT b.needs_approval OR b.approved_at IS NOT NULL))));
$$;

CREATE OR REPLACE FUNCTION public.expire_unpaid_bookings()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_unverified integer; v_unapproved integer;
BEGIN
  UPDATE public.bookings
     SET deleted_at = now(), updated_at = now()
   WHERE phone_verified_at IS NULL
     AND deleted_at IS NULL
     AND created_at < now() - interval '2 hours';
  GET DIAGNOSTICS v_unverified = ROW_COUNT;

  UPDATE public.bookings
     SET status = 'cancelled',
         cancelled_at = now(),
         cancellation_reason = 'المصوّرة لم تردّ على الطلب خلال ' || public.approval_window_hours(photographer_id) || ' ساعة، فأُلغي تلقائياً',
         auto_cancel_kind = 'approval_timeout',
         refund_amount = 0, refund_status = 'none',
         updated_at = now()
   WHERE status IN ('quote', 'pending_deposit')
     AND deleted_at IS NULL
     AND needs_approval AND approved_at IS NULL
     AND phone_verified_at IS NOT NULL
     AND phone_verified_at < now() - make_interval(hours => public.approval_window_hours(photographer_id));
  GET DIAGNOSTICS v_unapproved = ROW_COUNT;
  RETURN v_unverified + v_unapproved;
END; $$;
REVOKE ALL ON FUNCTION public.expire_unpaid_bookings() FROM PUBLIC, anon, authenticated;

-- الفاصل بين الحجوزات يُطبَّق فقط عند وضع "أكثر من حجز في اليوم"
CREATE OR REPLACE FUNCTION public.has_booking_conflict(
  _pid uuid, _date date, _start time, _end time, _exclude uuid DEFAULT NULL
) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.bookings b
    WHERE b.photographer_id = _pid
      AND b.event_date = _date
      AND b.deleted_at IS NULL
      AND public.booking_holds(b)
      AND (_exclude IS NULL OR b.id <> _exclude)
      AND (
        NOT public.allows_multi_bookings(_pid)
        -- نصف مفتوح بالدقائق؛ النهاية عند/قبل البداية = حتى منتصف الليل؛ الفاصل يُضاف على الجانبين
        OR (EXTRACT(EPOCH FROM b.start_time) / 60
              < CASE WHEN _end <= _start THEN 1440 ELSE EXTRACT(EPOCH FROM _end) / 60 END
                + LEAST(480, public.page_setting_int(_pid, 'buffer_minutes', 0))
            AND EXTRACT(EPOCH FROM _start) / 60
              < CASE WHEN b.end_time <= b.start_time THEN 1440 ELSE EXTRACT(EPOCH FROM b.end_time) / 60 END
                + LEAST(480, public.page_setting_int(_pid, 'buffer_minutes', 0)))
      )
  );
$$;

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
      'delivery_link', b.delivery_link,
      'selection_link', b.selection_link,
      'needs_approval', b.needs_approval,
      'package_snapshot', b.package_snapshot,
      'photos_promised', b.photos_promised,
      'delivery_days_promised', b.delivery_days_promised,
      'delivery_due_at', b.delivery_due_at,
      'overtime_fee_per_hour', b.overtime_fee_per_hour,
      'approved_at', b.approved_at,
      'approval_due_at', CASE WHEN b.needs_approval AND b.approved_at IS NULL AND b.phone_verified_at IS NOT NULL
                              THEN b.phone_verified_at + make_interval(hours => public.approval_window_hours(b.photographer_id)) END,
      'deposit_due_at', CASE WHEN (NOT b.needs_approval OR b.approved_at IS NOT NULL)
                              THEN COALESCE(b.approved_at, b.created_at) + interval '48 hours' END,
      'photographer', jsonb_build_object(
        'display_name', p.display_name, 'username', p.username,
        'whatsapp', CASE WHEN NOT COALESCE(b.needs_approval, false) OR b.approved_at IS NOT NULL THEN pp.whatsapp END,
        'phone', CASE WHEN NOT COALESCE(b.needs_approval, false) OR b.approved_at IS NOT NULL THEN pp.phone END,
        'deposit_refund_policy', COALESCE(p.deposit_refund_policy, 'none'),
        'deposit_refund_percent', p.deposit_refund_percent,
        'cliq_alias', CASE
          WHEN b.status IN ('confirmed','completed')
            OR (b.status IN ('quote', 'pending_deposit') AND b.deposit_amount > 0 AND (NOT b.needs_approval OR b.approved_at IS NOT NULL))
          THEN pp.cliq_alias ELSE NULL END,
        'payment_methods', CASE
          WHEN b.status IN ('confirmed','completed')
            OR (b.status IN ('quote', 'pending_deposit') AND b.deposit_amount > 0 AND (NOT b.needs_approval OR b.approved_at IS NOT NULL))
          THEN COALESCE(pp.payment_methods, '[]'::jsonb) ELSE '[]'::jsonb END,
        'bank_info', CASE
          WHEN b.status IN ('confirmed','completed')
            OR (b.status IN ('quote', 'pending_deposit') AND b.deposit_amount > 0 AND (NOT b.needs_approval OR b.approved_at IS NOT NULL))
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

COMMIT;
