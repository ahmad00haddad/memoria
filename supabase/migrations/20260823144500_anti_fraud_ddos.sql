-- =====================================================================
-- Migration: Anti-Fraud & DDOS Calendar Blocking Fix
-- Description: 
-- 1. Unpaid bookings (pending_deposit) older than 48 hours no longer block the calendar.
-- 2. Prevents clients from marking deposits as sent after 48 hours to avoid double-booking conflicts.
-- =====================================================================

-- 1) Update has_booking_conflict to release calendar after 48 hours
CREATE OR REPLACE FUNCTION public.has_booking_conflict(
  _pid uuid, _date date, _start time, _end time, _exclude uuid DEFAULT NULL
) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.bookings b
    WHERE b.photographer_id = _pid
      AND b.event_date = _date
      AND b.deleted_at IS NULL
      AND (
        b.status IN ('confirmed', 'completed') OR
        (b.status IN ('quote', 'pending_deposit') AND b.created_at >= now() - interval '48 hours')
      )
      AND (_exclude IS NULL OR b.id <> _exclude)
      AND b.start_time < _end AND _start < b.end_time
  );
$$;

-- 2) Update is_photographer_busy 
CREATE OR REPLACE FUNCTION public.is_photographer_busy(_pid uuid, _date date)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.photographer_unavailability 
    WHERE photographer_id = _pid AND date = _date
  ) OR EXISTS (
    -- If they have 4 or more active bookings on that day, they are busy.
    SELECT 1 FROM public.bookings
    WHERE photographer_id = _pid 
      AND event_date = _date 
      AND deleted_at IS NULL 
      AND (
        status IN ('confirmed', 'completed') OR
        (status IN ('quote', 'pending_deposit') AND created_at >= now() - interval '48 hours')
      )
    HAVING COUNT(*) >= 4
  );
$$;

-- 3) Prevent client from marking deposit sent after 48 hours
CREATE OR REPLACE FUNCTION public.client_mark_deposit_sent(_token text, _proof_path text, _reference text, _note text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_bk record;
BEGIN
  SELECT id, photographer_id, created_at, status INTO v_bk
  FROM public.bookings WHERE client_tracking_token = _token;
  IF v_bk.id IS NULL THEN RAISE EXCEPTION 'invalid token'; END IF;

  IF v_bk.status = 'pending_deposit' AND v_bk.created_at < now() - interval '48 hours' THEN
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
  VALUES (v_bk.photographer_id, 'O O,O1U.USU, OOO3U, O O,O1OO"U^U+', 'O,OU. O O,O1U.USU, O"OOU,USO_ OOO3OU, O O,O1OO"U^U+. USOO,O% O O,U.OOO,O1O.',
          '/dashboard/bookings/' || v_bk.id);
END;
$$;
GRANT EXECUTE ON FUNCTION public.client_mark_deposit_sent(text, text, text, text) TO anon, authenticated;
