-- Booking approval flow + one booking per day.
--
-- A bride's request now goes: request → photographer approves (24h) →
-- deposit (48h from approval) → photographer confirms the transfer.
--   * needs_approval is set only on requests the bride sends from the public
--     page. Manual bookings and older rows keep the old flow (false).
--   * An unapproved request holds the whole day for 24h from verification, so
--     nobody else can request it while the photographer decides.
--   * CliQ / bank details stay hidden and no deposit is accepted until approval.
--   * Timeouts cancel with auto_cancel_kind; the cron hook notifies both sides
--     and stamps auto_cancel_notified_at.
--   * One booking per day for everyone: any holding booking blocks the date.

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS needs_approval          boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS approved_at             timestamptz,
  ADD COLUMN IF NOT EXISTS reminders_sent          text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS auto_cancel_kind        text,
  ADD COLUMN IF NOT EXISTS auto_cancel_notified_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_bookings_awaiting_approval
  ON public.bookings (phone_verified_at)
  WHERE needs_approval AND approved_at IS NULL AND deleted_at IS NULL;

-- ---------------------------------------------------------------------------
-- One definition of "this booking holds its day"
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.booking_holds(b public.bookings)
RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT b.status IN ('confirmed', 'completed')
      OR (b.status IN ('quote', 'pending_deposit') AND (
            -- not verified yet: short hold
            (b.phone_verified_at IS NULL AND b.created_at >= now() - interval '30 minutes')
            -- waiting for the photographer: 24h from verification
         OR (b.phone_verified_at IS NOT NULL AND b.needs_approval AND b.approved_at IS NULL
             AND b.phone_verified_at >= now() - interval '24 hours')
            -- waiting for the deposit: 48h from approval (or creation for old rows)
         OR (b.phone_verified_at IS NOT NULL AND (NOT b.needs_approval OR b.approved_at IS NOT NULL)
             AND (b.deposit_sent_at IS NOT NULL
                  OR COALESCE(b.approved_at, b.created_at) >= now() - interval '48 hours'))));
$$;

-- Day-level: times no longer matter, one booking per day.
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
  );
$$;

CREATE OR REPLACE FUNCTION public.is_photographer_busy(_pid uuid, _date date)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.photographer_unavailability
    WHERE photographer_id = _pid AND date = _date
  ) OR EXISTS (
    SELECT 1 FROM public.bookings b
    WHERE b.photographer_id = _pid
      AND b.event_date = _date
      AND b.deleted_at IS NULL
      AND public.booking_holds(b)
  );
$$;

-- ---------------------------------------------------------------------------
-- Public profile: held days + how fast the photographer usually replies
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_public_profile_data(p_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE WHEN NOT EXISTS (
    SELECT 1 FROM profiles WHERE id = p_id AND is_published AND deleted_at IS NULL
  ) THEN NULL ELSE jsonb_build_object(
    'pricing', COALESCE((
      SELECT jsonb_agg(to_jsonb(pr) ORDER BY pr.price)
      FROM (SELECT id, service, package, label, price, per_photo_price, description, subtitle, cta_label
            FROM pricing_rules WHERE photographer_id = p_id) pr), '[]'::jsonb),
    'reviews', COALESCE((
      SELECT jsonb_agg(to_jsonb(r) ORDER BY r.created_at DESC)
      FROM (SELECT id, client_name, rating, comment, created_at
            FROM reviews WHERE photographer_id = p_id AND is_published) r), '[]'::jsonb),
    'unavail', COALESCE((
      SELECT jsonb_agg(d) FROM get_photographer_busy_dates(p_id) d), '[]'::jsonb),
    'bookedSlots', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('event_date', b.event_date, 'start_time', b.start_time, 'end_time', b.end_time))
      FROM bookings b
      WHERE b.photographer_id = p_id AND b.deleted_at IS NULL
        AND b.event_date >= CURRENT_DATE
        AND booking_holds(b)), '[]'::jsonb),
    'completedCount', (
      SELECT count(*) FROM bookings
      WHERE photographer_id = p_id AND deleted_at IS NULL AND status = 'completed'),
    'responseHours', (
      SELECT CASE WHEN count(*) >= 3 THEN
        round((percentile_cont(0.5) WITHIN GROUP (
          ORDER BY extract(epoch FROM approved_at - phone_verified_at) / 3600))::numeric, 1)
      END
      FROM bookings
      WHERE photographer_id = p_id AND needs_approval AND approved_at IS NOT NULL
        AND phone_verified_at IS NOT NULL AND created_at >= now() - interval '180 days')
  ) END;
$$;
REVOKE ALL ON FUNCTION public.get_public_profile_data(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_profile_data(uuid) TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- No deposit before approval
-- ---------------------------------------------------------------------------
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

  IF COALESCE(v_bk.approved_at, v_bk.created_at) < now() - interval '48 hours'
     AND public.has_booking_conflict(v_bk.photographer_id, v_bk.event_date, v_bk.start_time, v_bk.end_time, v_bk.id) THEN
    RAISE EXCEPTION 'EXPIRED_BOOKING';
  END IF;

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
GRANT EXECUTE ON FUNCTION public.client_mark_deposit_sent(text, text, text, text) TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- Expiry: unverified (2h), unapproved (24h), unpaid after approval (48h)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.expire_unpaid_bookings()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_unverified integer; v_unapproved integer; v_unpaid integer;
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
         cancellation_reason = 'المصوّرة لم تردّ على الطلب خلال 24 ساعة، فأُلغي تلقائياً',
         auto_cancel_kind = 'approval_timeout',
         refund_amount = 0, refund_status = 'none',
         updated_at = now()
   WHERE status IN ('quote', 'pending_deposit')
     AND deleted_at IS NULL
     AND needs_approval AND approved_at IS NULL
     AND phone_verified_at IS NOT NULL
     AND phone_verified_at < now() - interval '24 hours';
  GET DIAGNOSTICS v_unapproved = ROW_COUNT;

  UPDATE public.bookings
     SET status = 'cancelled',
         cancelled_at = now(),
         cancellation_reason = 'انتهت مهلة دفع العربون (48 ساعة) دون إرسال إثبات',
         auto_cancel_kind = 'deposit_timeout',
         refund_amount = 0, refund_status = 'none',
         updated_at = now()
   WHERE status IN ('quote', 'pending_deposit')
     AND deleted_at IS NULL
     AND phone_verified_at IS NOT NULL
     AND (NOT needs_approval OR approved_at IS NOT NULL)
     AND deposit_sent_at IS NULL
     AND deposit_proof_url IS NULL
     AND deposit_confirmed_at IS NULL
     AND COALESCE(approved_at, created_at) < now() - interval '48 hours';
  GET DIAGNOSTICS v_unpaid = ROW_COUNT;
  RETURN v_unverified + v_unapproved + v_unpaid;
END; $$;
REVOKE ALL ON FUNCTION public.expire_unpaid_bookings() FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Tracking page: approval state, deadlines, payment details only after approval
-- ---------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------
-- Telegram notifications for photographers (linked via t.me/<bot>?start=<code>)
-- ---------------------------------------------------------------------------
ALTER TABLE public.photographer_private
  ADD COLUMN IF NOT EXISTS telegram_chat_id   bigint,
  ADD COLUMN IF NOT EXISTS telegram_link_code text,
  ADD COLUMN IF NOT EXISTS telegram_linked_at timestamptz;
CREATE UNIQUE INDEX IF NOT EXISTS idx_photographer_private_tg_code
  ON public.photographer_private (telegram_link_code) WHERE telegram_link_code IS NOT NULL;
