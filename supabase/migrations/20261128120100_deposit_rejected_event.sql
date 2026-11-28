-- عند رفض إيصال العربون تُمسح deposit_sent_at؛ لا نسجّلها كـ deposit_sent (الرفض يُسجَّل من الخادم بنوع deposit_rejected مع السبب).
BEGIN;

CREATE OR REPLACE FUNCTION public.log_booking_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := COALESCE(auth.uid(), NULLIF(current_setting('app.actor', true), '')::uuid);
  v_role  text := COALESCE(NULLIF(current_setting('app.actor_role', true), ''),
                           CASE WHEN auth.uid() IS NOT NULL THEN 'user' ELSE 'system' END);
  v_reason text := NULLIF(current_setting('app.reason', true), '');
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.booking_events (booking_id, kind, to_status, actor_id, actor_role, reason, meta)
    VALUES (NEW.id, 'created', NEW.status, v_actor, v_role, v_reason,
            jsonb_build_object('event_date', NEW.event_date, 'start_time', NEW.start_time, 'end_time', NEW.end_time));
    RETURN NEW;
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.booking_events (booking_id, kind, from_status, to_status, actor_id, actor_role, reason, meta)
    VALUES (NEW.id, 'status', OLD.status, NEW.status, v_actor, v_role, COALESCE(v_reason, NEW.cancellation_reason),
            jsonb_build_object('auto_cancel_kind', NEW.auto_cancel_kind));
  END IF;
  IF NEW.event_date IS DISTINCT FROM OLD.event_date OR NEW.start_time IS DISTINCT FROM OLD.start_time
     OR NEW.end_time IS DISTINCT FROM OLD.end_time THEN
    INSERT INTO public.booking_events (booking_id, kind, actor_id, actor_role, reason, meta)
    VALUES (NEW.id, 'reschedule', v_actor, v_role, v_reason,
            jsonb_build_object('from', jsonb_build_object('date', OLD.event_date, 'start', OLD.start_time, 'end', OLD.end_time),
                               'to',   jsonb_build_object('date', NEW.event_date, 'start', NEW.start_time, 'end', NEW.end_time)));
  END IF;
  IF NEW.approved_at IS DISTINCT FROM OLD.approved_at THEN
    INSERT INTO public.booking_events (booking_id, kind, actor_id, actor_role, reason)
    VALUES (NEW.id, 'approved', v_actor, v_role, v_reason);
  END IF;
  IF NEW.deposit_sent_at IS DISTINCT FROM OLD.deposit_sent_at AND NEW.deposit_sent_at IS NOT NULL THEN
    INSERT INTO public.booking_events (booking_id, kind, actor_id, actor_role, reason)
    VALUES (NEW.id, 'deposit_sent', v_actor, v_role, v_reason);
  END IF;
  IF NEW.deposit_confirmed_at IS DISTINCT FROM OLD.deposit_confirmed_at THEN
    INSERT INTO public.booking_events (booking_id, kind, actor_id, actor_role, reason)
    VALUES (NEW.id, 'deposit_confirmed', v_actor, v_role, v_reason);
  END IF;
  IF NEW.deleted_at IS DISTINCT FROM OLD.deleted_at THEN
    INSERT INTO public.booking_events (booking_id, kind, actor_id, actor_role, reason)
    VALUES (NEW.id, CASE WHEN NEW.deleted_at IS NULL THEN 'restored' ELSE 'deleted' END, v_actor, v_role, v_reason);
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.log_booking_event() FROM PUBLIC, anon, authenticated;

COMMIT;
