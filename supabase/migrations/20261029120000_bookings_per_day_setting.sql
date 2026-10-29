-- Photographer setting: one booking per day (default) or several when times don't overlap.
-- Stored in profiles.page_settings->>'bookings_per_day' ('one' | 'multi'), written by savePageSettings.
--   one   → any holding booking blocks the whole day (unchanged behaviour).
--   multi → the day stays open; only overlapping times conflict.

CREATE OR REPLACE FUNCTION public.allows_multi_bookings(_pid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((SELECT page_settings->>'bookings_per_day' = 'multi' FROM public.profiles WHERE id = _pid), false);
$$;

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
        -- half-open overlap; an end at/before start means "until midnight"
        OR (b.start_time < CASE WHEN _end <= _start THEN time '23:59:59' ELSE _end END
            AND _start < CASE WHEN b.end_time <= b.start_time THEN time '23:59:59' ELSE b.end_time END)
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.is_photographer_busy(_pid uuid, _date date)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.photographer_unavailability
    WHERE photographer_id = _pid AND date = _date
  ) OR (
    NOT public.allows_multi_bookings(_pid)
    AND EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.photographer_id = _pid
        AND b.event_date = _date
        AND b.deleted_at IS NULL
        AND public.booking_holds(b)
    )
  );
$$;

REVOKE EXECUTE ON FUNCTION public.allows_multi_bookings(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.allows_multi_bookings(uuid) TO anon, authenticated, service_role;
