-- حارس انتقال حالة الحجز على مستوى قاعدة البيانات (يسري على كل الأدوار بما فيها service_role).
-- يمنع الرجوع من مكتمل/ملغى ومن مؤكَّد إلى ما قبل التأكيد، ولا يغيّر أي مسار مسموح حالياً.
-- للإصلاح اليدوي النادر: SELECT set_config('app.allow_status_rewind','on',true) داخل نفس المعاملة.
BEGIN;

CREATE OR REPLACE FUNCTION public.guard_booking_transition()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN RETURN NEW; END IF;
  IF COALESCE(current_setting('app.allow_status_rewind', true), '') = 'on' THEN RETURN NEW; END IF;

  IF OLD.status = 'cancelled' THEN
    RAISE EXCEPTION 'BAD_TRANSITION: cancelled booking cannot change status' USING ERRCODE = 'P0001';
  END IF;
  IF OLD.status = 'completed' AND NEW.status <> 'cancelled' THEN
    RAISE EXCEPTION 'BAD_TRANSITION: completed booking cannot go back' USING ERRCODE = 'P0001';
  END IF;
  IF OLD.status = 'confirmed' AND NEW.status IN ('quote', 'pending_deposit') THEN
    RAISE EXCEPTION 'BAD_TRANSITION: confirmed booking cannot go back' USING ERRCODE = 'P0001';
  END IF;
  IF OLD.status IN ('quote', 'pending_deposit') AND NEW.status = 'completed' THEN
    RAISE EXCEPTION 'BAD_TRANSITION: unconfirmed booking cannot complete' USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.guard_booking_transition() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS zz_bookings_transition_guard ON public.bookings;
CREATE TRIGGER zz_bookings_transition_guard
  BEFORE UPDATE OF status ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.guard_booking_transition();

COMMIT;

-- ROLLBACK:
--   DROP TRIGGER IF EXISTS zz_bookings_transition_guard ON public.bookings;
--   DROP FUNCTION IF EXISTS public.guard_booking_transition();
