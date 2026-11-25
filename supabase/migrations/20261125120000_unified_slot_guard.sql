-- PROPOSED (not applied). Unified slot guard: one trigger so EVERY write path (create, verify, confirm,
-- manual booking, reschedule) is serialized and checked inside PostgreSQL.
-- Reuses the existing public.has_booking_conflict(), so allows_multi_bookings, buffer_minutes and the
-- half-open overlap policy are unchanged. Same advisory-lock key as create_booking_guarded().
BEGIN;

CREATE OR REPLACE FUNCTION public.bookings_slot_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- (1) the row does not hold a slot: nothing to check
  IF NEW.deleted_at IS NOT NULL OR NOT public.booking_holds(NEW) THEN
    RETURN NEW;
  END IF;

  -- (2) it already held exactly this slot before the change: do not re-check (legacy overlaps are never frozen)
  IF TG_OP = 'UPDATE'
     AND OLD.deleted_at IS NULL
     AND public.booking_holds(OLD)
     AND OLD.photographer_id = NEW.photographer_id
     AND OLD.event_date      = NEW.event_date
     AND OLD.start_time      = NEW.start_time
     AND OLD.end_time        = NEW.end_time THEN
    RETURN NEW;
  END IF;

  -- (3) serialize per (photographer, date); re-entrant inside the same transaction
  PERFORM pg_advisory_xact_lock(
    hashtextextended(NEW.photographer_id::text || '|' || NEW.event_date::text, 0));

  -- (4) the existing conflict function with all its policies
  IF public.has_booking_conflict(
       NEW.photographer_id, NEW.event_date, NEW.start_time, NEW.end_time, NEW.id) THEN
    RAISE EXCEPTION 'SLOT_CONFLICT';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.bookings_slot_guard() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS zz_bookings_slot_guard ON public.bookings;
CREATE TRIGGER zz_bookings_slot_guard
  BEFORE INSERT OR UPDATE OF photographer_id, event_date, start_time, end_time,
                              status, deleted_at, phone_verified_at, approved_at, needs_approval
  ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.bookings_slot_guard();

COMMIT;

-- Before applying anywhere real, list existing overlaps (read-only) to know what the guard will tolerate:
--   see the existing-conflicts query in docs/MEMORIA_PHASE_2_PRODUCTION_STRATEGY.md section 2.4
--
-- ROLLBACK:
--   BEGIN;
--   DROP TRIGGER IF EXISTS zz_bookings_slot_guard ON public.bookings;
--   DROP FUNCTION IF EXISTS public.bookings_slot_guard();
--   COMMIT;
