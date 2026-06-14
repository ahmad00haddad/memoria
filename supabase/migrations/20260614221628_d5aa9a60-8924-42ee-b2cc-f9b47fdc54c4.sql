
-- ============================================================
-- Phase 8: Security Hardening Pro
-- ============================================================

-- 1) Audit logs table for critical changes
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  before_data jsonb,
  after_data jsonb,
  ip_address text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view all audit logs"
  ON public.audit_logs FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users view their own audit logs"
  ON public.audit_logs FOR SELECT
  TO authenticated
  USING (actor_id = auth.uid());

CREATE INDEX idx_audit_logs_entity ON public.audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_actor ON public.audit_logs(actor_id, created_at DESC);

-- 2) Soft delete columns
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_bookings_deleted ON public.bookings(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_deleted ON public.profiles(deleted_at) WHERE deleted_at IS NULL;

-- 3) Token expiry for client tracking
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS token_expires_at timestamptz;

-- Default: tokens expire 90 days after event_date (or 90 days from now if no event_date)
UPDATE public.bookings 
SET token_expires_at = COALESCE(event_date + interval '90 days', now() + interval '90 days')
WHERE token_expires_at IS NULL AND client_tracking_token IS NOT NULL;

-- 4) Fix get_photographer_busy_dates — return boolean check instead of list
-- New function: check if a specific date is busy (no info disclosure)
CREATE OR REPLACE FUNCTION public.is_photographer_busy(_pid uuid, _date date)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.photographer_unavailability 
    WHERE photographer_id = _pid AND date = _date
  );
$$;

REVOKE EXECUTE ON FUNCTION public.is_photographer_busy(uuid, date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_photographer_busy(uuid, date) TO anon, authenticated;

-- Keep old function but limit to next 6 months only (instead of all-time disclosure)
CREATE OR REPLACE FUNCTION public.get_photographer_busy_dates(_pid uuid)
RETURNS SETOF date
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT date FROM public.photographer_unavailability 
  WHERE photographer_id = _pid 
    AND date >= CURRENT_DATE 
    AND date <= CURRENT_DATE + interval '6 months';
$$;

-- 5) Update get_booking_by_token to:
--    - reject expired tokens
--    - hide sensitive payment info until booking is confirmed
CREATE OR REPLACE FUNCTION public.get_booking_by_token(_token text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
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
      'delivered_at', b.delivered_at, 'client_received_at', b.client_received_at,
      'client_notes', b.client_notes, 'client_name', b.client_name, 'addons', b.addons,
      'token_expires_at', b.token_expires_at,
      'photographer', jsonb_build_object(
        'display_name', p.display_name, 'username', p.username,
        'whatsapp', pp.whatsapp, 'phone', pp.phone,
        -- Hide payment details until booking is confirmed (deposit_amount set or status=confirmed)
        'cliq_alias', CASE 
          WHEN b.status IN ('confirmed','in_production','delivered','completed') 
            OR b.deposit_amount > 0 
          THEN pp.cliq_alias ELSE NULL END,
        'bank_info', CASE 
          WHEN b.status IN ('confirmed','in_production','delivered','completed') 
            OR b.deposit_amount > 0 
          THEN pp.bank_info ELSE NULL END,
        'fixed_deposit', p.fixed_deposit, 'avatar_url', p.avatar_url
      )
    ),
    b.status,
    (b.token_expires_at IS NOT NULL AND b.token_expires_at < now())
  INTO v, v_status, v_expired
  FROM public.bookings b
  JOIN public.profiles p ON p.id = b.photographer_id
  LEFT JOIN public.photographer_private pp ON pp.user_id = b.photographer_id
  WHERE b.client_tracking_token = _token
    AND b.deleted_at IS NULL;
  
  IF v IS NULL THEN
    RETURN NULL;
  END IF;
  
  IF v_expired THEN
    RETURN jsonb_build_object('expired', true, 'photographer', v->'photographer');
  END IF;
  
  RETURN v;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_booking_by_token(text) FROM PUBLIC, anon, authenticated;

-- 6) Auto-set token_expires_at on new bookings
CREATE OR REPLACE FUNCTION public.set_booking_token_expiry()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.client_tracking_token IS NOT NULL AND NEW.token_expires_at IS NULL THEN
    NEW.token_expires_at := COALESCE(NEW.event_date + interval '90 days', now() + interval '90 days');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_booking_token_expiry ON public.bookings;
CREATE TRIGGER trg_set_booking_token_expiry
  BEFORE INSERT OR UPDATE OF event_date, client_tracking_token ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.set_booking_token_expiry();

-- 7) Audit trigger for critical booking changes
CREATE OR REPLACE FUNCTION public.log_booking_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_logs (actor_id, action, entity_type, entity_id, before_data)
    VALUES (auth.uid(), 'delete', 'booking', OLD.id, to_jsonb(OLD));
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    IF (OLD.status IS DISTINCT FROM NEW.status) 
       OR (OLD.total_price IS DISTINCT FROM NEW.total_price)
       OR (OLD.deposit_confirmed_at IS DISTINCT FROM NEW.deposit_confirmed_at)
       OR (OLD.deleted_at IS DISTINCT FROM NEW.deleted_at) THEN
      INSERT INTO public.audit_logs (actor_id, action, entity_type, entity_id, before_data, after_data)
      VALUES (
        auth.uid(), 
        CASE WHEN NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL THEN 'soft_delete' ELSE 'update' END,
        'booking', NEW.id,
        jsonb_build_object('status', OLD.status, 'total_price', OLD.total_price, 'deposit_confirmed_at', OLD.deposit_confirmed_at, 'deleted_at', OLD.deleted_at),
        jsonb_build_object('status', NEW.status, 'total_price', NEW.total_price, 'deposit_confirmed_at', NEW.deposit_confirmed_at, 'deleted_at', NEW.deleted_at)
      );
    END IF;
    RETURN NEW;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_booking_changes ON public.bookings;
CREATE TRIGGER trg_log_booking_changes
  AFTER UPDATE OR DELETE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.log_booking_changes();

-- 8) Soft-delete RPC for bookings (preferred over hard delete)
CREATE OR REPLACE FUNCTION public.soft_delete_booking(_booking_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_photographer uuid;
BEGIN
  SELECT photographer_id INTO v_photographer FROM public.bookings WHERE id = _booking_id;
  IF v_photographer IS NULL THEN RAISE EXCEPTION 'booking not found'; END IF;
  IF v_photographer != auth.uid() AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  
  UPDATE public.bookings 
  SET deleted_at = now(), updated_at = now()
  WHERE id = _booking_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.soft_delete_booking(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.soft_delete_booking(uuid) TO authenticated;

-- 9) Token regeneration RPC (so photographer can invalidate old token)
CREATE OR REPLACE FUNCTION public.regenerate_booking_token(_booking_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_token text;
  v_photographer uuid;
BEGIN
  SELECT photographer_id INTO v_photographer FROM public.bookings WHERE id = _booking_id;
  IF v_photographer IS NULL THEN RAISE EXCEPTION 'booking not found'; END IF;
  IF v_photographer != auth.uid() AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  
  v_token := encode(gen_random_bytes(24), 'base64');
  v_token := replace(replace(replace(v_token, '/', '_'), '+', '-'), '=', '');
  
  UPDATE public.bookings 
  SET client_tracking_token = v_token,
      token_expires_at = COALESCE(event_date + interval '90 days', now() + interval '90 days'),
      updated_at = now()
  WHERE id = _booking_id;
  
  RETURN v_token;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.regenerate_booking_token(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.regenerate_booking_token(uuid) TO authenticated;

-- 10) Update existing booking-fetch policies to hide soft-deleted rows
-- (RLS policies on bookings already exist; we add a deleted_at check via view-like filter at app level.
--  Existing policies remain; app-level queries should filter deleted_at IS NULL.)
