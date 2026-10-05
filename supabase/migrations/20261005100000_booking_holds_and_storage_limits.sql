-- Booking holds, deposit notification text, and storage limits.
--
-- 1) An unpaid request (quote / pending_deposit) holds the slot for 48 hours
--    only. Once the bride uploads deposit proof the hold stays until the
--    photographer confirms or rejects it. has_booking_conflict and
--    is_photographer_busy already used the 48h rule, but the public profile
--    still greyed out every pending slot forever, so spam requests blocked
--    the calendar. All three now share one definition: booking_holds_slot().
-- 2) Requests that expire without any deposit proof are auto-cancelled hourly.
-- 3) client_mark_deposit_sent wrote a mojibake (garbled) notification; fixed.
-- 4) Proof uploaded → slot keeps holding even after 48h (it used to be refused).
-- 5) Delivery is via external links (Drive / WeTransfer): no more uploads to
--    the delivery-photos bucket. Existing files stay readable/deletable.
-- 6) Portfolio capped at 20 photos; avatars bucket capped at 2 MB per file.

-- ---------------------------------------------------------------------------
-- 1) One definition of "this booking holds its slot"
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.booking_holds_slot(
  _status public.booking_status, _created_at timestamptz, _deposit_sent_at timestamptz
) RETURNS boolean LANGUAGE sql IMMUTABLE AS $$
  SELECT _status IN ('confirmed', 'completed')
      OR (_status IN ('quote', 'pending_deposit')
          AND (_deposit_sent_at IS NOT NULL OR _created_at >= now() - interval '48 hours'));
$$;

CREATE OR REPLACE FUNCTION public.has_booking_conflict(
  _pid uuid, _date date, _start time, _end time, _exclude uuid DEFAULT NULL
) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.bookings b
    WHERE b.photographer_id = _pid
      AND b.event_date = _date
      AND b.deleted_at IS NULL
      AND public.booking_holds_slot(b.status, b.created_at, b.deposit_sent_at)
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
      AND public.booking_holds_slot(status, created_at, deposit_sent_at)
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
              AND booking_holds_slot(status, created_at, deposit_sent_at)) b), '[]'::jsonb),
    'completedCount', (
      SELECT count(*) FROM bookings
      WHERE photographer_id = p_id AND deleted_at IS NULL AND status = 'completed')
  ) END;
$$;

REVOKE ALL ON FUNCTION public.get_public_profile_data(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_profile_data(uuid) TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2) Auto-cancel requests that expired without any deposit proof
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.expire_unpaid_bookings()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_count integer;
BEGIN
  UPDATE public.bookings
     SET status = 'cancelled',
         cancelled_at = now(),
         cancellation_reason = 'انتهت مهلة دفع العربون (48 ساعة) دون إرسال إثبات',
         refund_amount = 0, refund_status = 'none',
         updated_at = now()
   WHERE status IN ('quote', 'pending_deposit')
     AND deleted_at IS NULL
     AND deposit_sent_at IS NULL
     AND deposit_proof_url IS NULL
     AND deposit_confirmed_at IS NULL
     AND created_at < now() - interval '48 hours';
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END; $$;

REVOKE ALL ON FUNCTION public.expire_unpaid_bookings() FROM PUBLIC, anon, authenticated;

DO $$ BEGIN
  PERFORM cron.unschedule('expire-unpaid-bookings');
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
  PERFORM cron.schedule('expire-unpaid-bookings', '0 * * * *', 'SELECT public.expire_unpaid_bookings();');
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'pg_cron not available; expired requests still stop holding the calendar';
END $$;

-- ---------------------------------------------------------------------------
-- 3 + 4) Deposit proof: readable notification, allowed after 48h if still open
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
  SELECT id, photographer_id, client_name, created_at, status, event_date, start_time, end_time
    INTO v_bk
  FROM public.bookings WHERE client_tracking_token = _token AND deleted_at IS NULL;
  IF v_bk.id IS NULL THEN RAISE EXCEPTION 'invalid token'; END IF;
  IF v_bk.status NOT IN ('quote', 'pending_deposit') THEN RAISE EXCEPTION 'BOOKING_NOT_AWAITING_DEPOSIT'; END IF;

  -- After the 48h hold lapsed, only accept proof if nobody else took the slot meanwhile.
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

-- ---------------------------------------------------------------------------
-- 5) No new uploads to delivery-photos (delivery is via external links)
-- ---------------------------------------------------------------------------
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND cmd IN ('INSERT', 'UPDATE', 'ALL')
      AND (coalesce(qual, '') || coalesce(with_check, '')) LIKE '%delivery-photos%'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', r.policyname);
  END LOOP;
END $$;

DROP POLICY IF EXISTS "delivery_photos_owner_read" ON storage.objects;
CREATE POLICY "delivery_photos_owner_read" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'delivery-photos'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "delivery_photos_owner_delete" ON storage.objects;
CREATE POLICY "delivery_photos_owner_delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'delivery-photos'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- ---------------------------------------------------------------------------
-- 6) Portfolio cap + avatar file size cap
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.enforce_portfolio_limit()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  -- Only block growth, so profiles already above the cap can still shrink.
  IF coalesce(array_length(NEW.portfolio_urls, 1), 0) > 20
     AND coalesce(array_length(NEW.portfolio_urls, 1), 0) > coalesce(array_length(OLD.portfolio_urls, 1), 0) THEN
    RAISE EXCEPTION 'الحد الأقصى لمعرض الأعمال هو 20 صورة';
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_enforce_portfolio_limit ON public.profiles;
CREATE TRIGGER trg_enforce_portfolio_limit
  BEFORE UPDATE OF portfolio_urls ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.enforce_portfolio_limit();

UPDATE storage.buckets SET file_size_limit = 2097152 WHERE id = 'avatars';

-- ---------------------------------------------------------------------------
-- 7) Tracking links showed "رابط غير صالح": get_booking_by_token was not
--    executable by anon on the live DB, and the server falls back to the anon
--    key when SUPABASE_SERVICE_ROLE_KEY is missing. Access is gated by the
--    unguessable token itself, so anon may call the token RPCs.
-- ---------------------------------------------------------------------------
GRANT EXECUTE ON FUNCTION public.get_booking_by_token(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.client_mark_deposit_sent(text, text, text, text) TO anon, authenticated;
-- These may not exist on every environment, so grant only if present.
DO $$
DECLARE f text;
BEGIN
  FOREACH f IN ARRAY ARRAY[
    'public.client_mark_received(text)',
    'public.client_add_note(text, text)',
    'public.client_cancel_booking(text, text)'
  ] LOOP
    BEGIN
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO anon, authenticated', f);
    EXCEPTION WHEN undefined_function THEN NULL;
    END;
  END LOOP;
END $$;
