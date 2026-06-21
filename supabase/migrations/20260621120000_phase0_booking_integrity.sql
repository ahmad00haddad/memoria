-- =====================================================================
-- Phase 0 — Booking integrity: prevent double-booking + idempotency
-- =====================================================================
-- Problem addressed:
--   * submitBookingRequest inserted bookings WITHOUT any server-side
--     availability/conflict check (the only validation lived in the
--     browser), so two clients could book the same slot concurrently, and
--     a crafted request could bypass the UI guard entirely.
--   * No protection against duplicate submissions (double-click / retry).
--
-- Solution:
--   1. has_booking_conflict() — detects time-overlap against ACTIVE bookings.
--   2. create_booking_guarded() — SECURITY DEFINER function that performs the
--      insert atomically: a per-(photographer, date) advisory lock serializes
--      concurrent attempts, re-checks the blocked-day + slot conflict inside
--      the lock, and de-duplicates identical submissions within 2 minutes.
-- =====================================================================

-- 1) Time-overlap conflict detector ----------------------------------
CREATE OR REPLACE FUNCTION public.has_booking_conflict(
  _pid uuid,
  _date date,
  _start time,
  _end time,
  _exclude uuid DEFAULT NULL
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.bookings b
    WHERE b.photographer_id = _pid
      AND b.event_date = _date
      AND b.deleted_at IS NULL
      AND b.status IN ('pending_deposit', 'confirmed', 'completed')
      AND (_exclude IS NULL OR b.id <> _exclude)
      -- half-open overlap test: [start, end) intervals intersect
      AND b.start_time < _end
      AND _start < b.end_time
  );
$$;

-- 2) Atomic, idempotent, conflict-guarded booking creation -----------
CREATE OR REPLACE FUNCTION public.create_booking_guarded(_payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pid     uuid := (_payload->>'photographer_id')::uuid;
  v_date    date := (_payload->>'event_date')::date;
  v_start   time := (_payload->>'start_time')::time;
  v_end     time := (_payload->>'end_time')::time;
  v_email   text := _payload->>'client_email';
  v_existing public.bookings%ROWTYPE;
  v_id      uuid;
  v_token   text;
BEGIN
  IF v_pid IS NULL OR v_date IS NULL OR v_start IS NULL OR v_end IS NULL THEN
    RAISE EXCEPTION 'INVALID_PAYLOAD';
  END IF;
  IF v_end <= v_start THEN
    RAISE EXCEPTION 'INVALID_TIME';
  END IF;

  -- Serialize concurrent bookings for the same photographer + date.
  PERFORM pg_advisory_xact_lock(hashtextextended(v_pid::text || '|' || v_date::text, 0));

  -- Idempotency: an identical submission within the last 2 minutes returns
  -- the existing booking instead of creating a duplicate.
  SELECT * INTO v_existing
  FROM public.bookings b
  WHERE b.photographer_id = v_pid
    AND lower(b.client_email) = lower(v_email)
    AND b.event_date = v_date
    AND b.start_time = v_start
    AND b.deleted_at IS NULL
    AND b.created_at > now() - interval '2 minutes'
  ORDER BY b.created_at DESC
  LIMIT 1;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'booking_id', v_existing.id,
      'tracking_token', v_existing.client_tracking_token,
      'deduped', true
    );
  END IF;

  -- Blocked day (photographer marked unavailable)?
  IF public.is_photographer_busy(v_pid, v_date) THEN
    RAISE EXCEPTION 'DAY_UNAVAILABLE';
  END IF;

  -- Overlapping active booking?
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
    v_pid,
    _payload->>'client_name',
    v_email,
    _payload->>'client_phone',
    (_payload->>'service')::public.service_type,
    v_date, v_start, v_end,
    NULLIF(_payload->>'venue_address', ''),
    COALESCE((_payload->>'base_price')::numeric, 0),
    0,
    COALESCE((_payload->>'total_price')::numeric, 0),
    COALESCE((_payload->>'deposit_amount')::numeric, 0),
    COALESCE(_payload->>'privacy_level', 'public'),
    COALESCE((_payload->>'photographer_can_publish')::boolean, true),
    NULLIF(_payload->>'client_notes', ''),
    true,
    'pending_deposit',
    COALESCE(_payload->'addons', '[]'::jsonb)
  )
  RETURNING id, client_tracking_token INTO v_id, v_token;

  RETURN jsonb_build_object(
    'booking_id', v_id,
    'tracking_token', v_token,
    'deduped', false
  );
END;
$$;

-- The booking flow is invoked from the server with the service-role key, but
-- granting execute keeps the function usable for authenticated clients too.
GRANT EXECUTE ON FUNCTION public.has_booking_conflict(uuid, date, time, time, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_booking_guarded(jsonb) TO anon, authenticated;
