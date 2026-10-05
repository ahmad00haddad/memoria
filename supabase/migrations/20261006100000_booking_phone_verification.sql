-- Booking verification before a request counts.
--
-- A new request must be verified by one of:
--   * WhatsApp: the bride sends us a prefilled message with wa code from the
--     same phone she booked with (free, user-initiated; checked in the
--     /api/public/hooks/whatsapp webhook), or
--   * Email: she types the 6-digit email code we sent her.
-- Until then the request holds its slot for 30 minutes only, the photographer
-- is not notified, and it can't receive a deposit. Unverified requests are
-- soft-deleted after 2 hours by the hourly expiry job.
-- Existing bookings are treated as verified.

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS phone_verified_at      timestamptz,
  ADD COLUMN IF NOT EXISTS verified_via           text,
  ADD COLUMN IF NOT EXISTS verify_code_wa         text,
  ADD COLUMN IF NOT EXISTS verify_code_email      text,
  ADD COLUMN IF NOT EXISTS verify_expires_at      timestamptz,
  ADD COLUMN IF NOT EXISTS verify_attempts        integer NOT NULL DEFAULT 0;

UPDATE public.bookings SET phone_verified_at = created_at, verified_via = 'legacy'
WHERE phone_verified_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_bookings_verify_code_wa
  ON public.bookings (verify_code_wa) WHERE verify_code_wa IS NOT NULL AND phone_verified_at IS NULL;

-- ---------------------------------------------------------------------------
-- Holds: unverified requests hold for 30 minutes only
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.booking_holds_slot(
  _status public.booking_status, _created_at timestamptz, _deposit_sent_at timestamptz,
  _verified_at timestamptz
) RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT _status IN ('confirmed', 'completed')
      OR (_status IN ('quote', 'pending_deposit') AND (
            (_verified_at IS NULL AND _created_at >= now() - interval '30 minutes')
         OR (_verified_at IS NOT NULL
             AND (_deposit_sent_at IS NOT NULL OR _created_at >= now() - interval '48 hours'))));
$$;

CREATE OR REPLACE FUNCTION public.has_booking_conflict(
  _pid uuid, _date date, _start time, _end time, _exclude uuid DEFAULT NULL
) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.bookings b
    WHERE b.photographer_id = _pid
      AND b.event_date = _date
      AND b.deleted_at IS NULL
      AND public.booking_holds_slot(b.status, b.created_at, b.deposit_sent_at, b.phone_verified_at)
      AND (_exclude IS NULL OR b.id <> _exclude)
      AND b.start_time < _end AND _start < b.end_time
  );
$$;

CREATE OR REPLACE FUNCTION public.is_photographer_busy(_pid uuid, _date date)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.photographer_unavailability
    WHERE photographer_id = _pid AND date = _date
  ) OR EXISTS (
    SELECT 1 FROM public.bookings
    WHERE photographer_id = _pid
      AND event_date = _date
      AND deleted_at IS NULL
      AND public.booking_holds_slot(status, created_at, deposit_sent_at, phone_verified_at)
    HAVING COUNT(*) >= 4
  );
$$;

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
      FROM (SELECT id, service, package, label, price, per_photo_price, description
            FROM pricing_rules WHERE photographer_id = p_id) pr), '[]'::jsonb),
    'reviews', COALESCE((
      SELECT jsonb_agg(to_jsonb(r) ORDER BY r.created_at DESC)
      FROM (SELECT id, client_name, rating, comment, created_at
            FROM reviews WHERE photographer_id = p_id AND is_published) r), '[]'::jsonb),
    'unavail', COALESCE((
      SELECT jsonb_agg(d) FROM get_photographer_busy_dates(p_id) d), '[]'::jsonb),
    'bookedSlots', COALESCE((
      SELECT jsonb_agg(to_jsonb(b))
      FROM (SELECT event_date, start_time, end_time FROM bookings
            WHERE photographer_id = p_id AND deleted_at IS NULL
              AND event_date >= CURRENT_DATE
              AND booking_holds_slot(status, created_at, deposit_sent_at, phone_verified_at)) b), '[]'::jsonb),
    'completedCount', (
      SELECT count(*) FROM bookings
      WHERE photographer_id = p_id AND deleted_at IS NULL AND status = 'completed')
  ) END;
$$;
REVOKE ALL ON FUNCTION public.get_public_profile_data(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_profile_data(uuid) TO anon, authenticated;

DROP FUNCTION IF EXISTS public.booking_holds_slot(public.booking_status, timestamptz, timestamptz);

-- ---------------------------------------------------------------------------
-- Expiry: also drop unverified requests after 2 hours
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.expire_unpaid_bookings()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_count integer; v_unverified integer;
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
         cancellation_reason = 'انتهت مهلة دفع العربون (48 ساعة) دون إرسال إثبات',
         refund_amount = 0, refund_status = 'none',
         updated_at = now()
   WHERE status IN ('quote', 'pending_deposit')
     AND deleted_at IS NULL
     AND phone_verified_at IS NOT NULL
     AND deposit_sent_at IS NULL
     AND deposit_proof_url IS NULL
     AND deposit_confirmed_at IS NULL
     AND created_at < now() - interval '48 hours';
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count + v_unverified;
END; $$;
REVOKE ALL ON FUNCTION public.expire_unpaid_bookings() FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------------------
-- No deposit before verification
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
  SELECT id, photographer_id, client_name, created_at, status, event_date, start_time, end_time, phone_verified_at
    INTO v_bk
  FROM public.bookings WHERE client_tracking_token = _token AND deleted_at IS NULL;
  IF v_bk.id IS NULL THEN RAISE EXCEPTION 'invalid token'; END IF;
  IF v_bk.phone_verified_at IS NULL THEN RAISE EXCEPTION 'BOOKING_NOT_VERIFIED'; END IF;
  IF v_bk.status NOT IN ('quote', 'pending_deposit') THEN RAISE EXCEPTION 'BOOKING_NOT_AWAITING_DEPOSIT'; END IF;

  IF v_bk.created_at < now() - interval '48 hours'
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
          COALESCE(v_bk.client_name, 'العميلة') || ' أرسلت إثبات دفع العربون. راجعيه ثم أكّدي الحجز.',
          '/dashboard/bookings/' || v_bk.id);
END;
$$;
GRANT EXECUTE ON FUNCTION public.client_mark_deposit_sent(text, text, text, text) TO anon, authenticated;
