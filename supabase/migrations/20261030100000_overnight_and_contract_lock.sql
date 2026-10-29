-- B1: an end time before the start means the session runs past midnight (wedding 20:00–02:00).
--     Only an end equal to the start is invalid.
-- B2: a signed contract is evidence, so its text and signature can no longer change.
--     The SHA-256 of the signed text is stored at signing time.

CREATE OR REPLACE FUNCTION public.create_booking_guarded(_payload jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_pid uuid := (_payload->>'photographer_id')::uuid;
  v_date date := (_payload->>'event_date')::date;
  v_start time := (_payload->>'start_time')::time;
  v_end time := (_payload->>'end_time')::time;
  v_email text := _payload->>'client_email';
  v_existing public.bookings%ROWTYPE;
  v_id uuid;
  v_token text;
BEGIN
  IF v_pid IS NULL OR v_date IS NULL OR v_start IS NULL OR v_end IS NULL THEN RAISE EXCEPTION 'INVALID_PAYLOAD'; END IF;
  IF v_end = v_start THEN RAISE EXCEPTION 'INVALID_TIME'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(v_pid::text || '|' || v_date::text, 0));
  SELECT * INTO v_existing FROM public.bookings b
  WHERE b.photographer_id = v_pid AND lower(b.client_email) = lower(v_email) AND b.event_date = v_date
    AND b.start_time = v_start AND b.deleted_at IS NULL AND b.created_at > now() - interval '2 minutes'
  ORDER BY b.created_at DESC LIMIT 1;
  IF FOUND THEN
    RETURN jsonb_build_object('booking_id', v_existing.id, 'tracking_token', v_existing.client_tracking_token, 'deduped', true);
  END IF;
  IF public.is_photographer_busy(v_pid, v_date) THEN RAISE EXCEPTION 'DAY_UNAVAILABLE'; END IF;
  IF public.has_booking_conflict(v_pid, v_date, v_start, v_end, NULL) THEN RAISE EXCEPTION 'SLOT_CONFLICT'; END IF;
  INSERT INTO public.bookings (
    photographer_id, client_name, client_email, client_phone, service, event_date, start_time, end_time,
    venue_address, base_price, travel_fee, total_price, deposit_amount, privacy_level, photographer_can_publish,
    client_notes, contract_agreed, status, addons
  ) VALUES (
    v_pid, _payload->>'client_name', v_email, _payload->>'client_phone', (_payload->>'service')::public.service_type,
    v_date, v_start, v_end, NULLIF(_payload->>'venue_address',''), COALESCE((_payload->>'base_price')::numeric, 0), 0,
    COALESCE((_payload->>'total_price')::numeric, 0), COALESCE((_payload->>'deposit_amount')::numeric, 0),
    COALESCE(_payload->>'privacy_level','public'), COALESCE((_payload->>'photographer_can_publish')::boolean, true),
    NULLIF(_payload->>'client_notes',''), true, 'pending_deposit', COALESCE(_payload->'addons','[]'::jsonb)
  ) RETURNING id, client_tracking_token INTO v_id, v_token;
  RETURN jsonb_build_object('booking_id', v_id, 'tracking_token', v_token, 'deduped', false);
END;
$function$;

ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS signed_body_sha256 text;

-- Contracts signed before this migration get their fingerprint now (text is unchanged from here on).
UPDATE public.contracts
SET signed_body_sha256 = encode(sha256(convert_to(COALESCE(body, ''), 'UTF8')), 'hex')
WHERE status = 'signed' AND signed_body_sha256 IS NULL;

CREATE OR REPLACE FUNCTION public.contracts_lock_signed()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF OLD.status = 'signed' THEN
    IF NEW.body IS DISTINCT FROM OLD.body
       OR NEW.client_signature IS DISTINCT FROM OLD.client_signature
       OR NEW.client_name IS DISTINCT FROM OLD.client_name
       OR NEW.signed_at IS DISTINCT FROM OLD.signed_at
       OR NEW.signed_body_sha256 IS DISTINCT FROM OLD.signed_body_sha256
       OR NEW.booking_id IS DISTINCT FROM OLD.booking_id
       OR NEW.photographer_id IS DISTINCT FROM OLD.photographer_id
       OR NEW.status NOT IN ('signed', 'void') THEN
      RAISE EXCEPTION 'CONTRACT_SIGNED_LOCKED';
    END IF;
  ELSIF NEW.status = 'signed' THEN
    NEW.signed_body_sha256 := encode(sha256(convert_to(COALESCE(NEW.body, ''), 'UTF8')), 'hex');
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_contracts_lock_signed ON public.contracts;
CREATE TRIGGER trg_contracts_lock_signed BEFORE UPDATE ON public.contracts
  FOR EACH ROW EXECUTE FUNCTION public.contracts_lock_signed();
