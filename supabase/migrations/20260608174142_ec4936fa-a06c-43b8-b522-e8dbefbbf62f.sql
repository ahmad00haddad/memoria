
-- Fix: Hide photographer sensitive fields from public reads.
-- Move sensitive contact, payment, and calendar fields into a private table
-- accessible only to the owner (or service role via SECURITY DEFINER RPCs).

CREATE TABLE IF NOT EXISTS public.photographer_private (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  phone text,
  whatsapp text,
  cliq_alias text,
  bank_info text,
  ical_token text UNIQUE DEFAULT replace((gen_random_uuid())::text,'-',''),
  external_ical_url text,
  external_ical_synced_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.photographer_private TO authenticated;
GRANT ALL ON public.photographer_private TO service_role;

ALTER TABLE public.photographer_private ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner read private"   ON public.photographer_private FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "owner insert private" ON public.photographer_private FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "owner update private" ON public.photographer_private FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER trg_photographer_private_updated
  BEFORE UPDATE ON public.photographer_private
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Migrate any existing data, then drop columns from profiles.
INSERT INTO public.photographer_private (user_id, phone, whatsapp, cliq_alias, bank_info, ical_token, external_ical_url, external_ical_synced_at)
SELECT id, phone, whatsapp, cliq_alias, bank_info, ical_token, external_ical_url, external_ical_synced_at
FROM public.profiles
ON CONFLICT (user_id) DO UPDATE SET
  phone = EXCLUDED.phone,
  whatsapp = EXCLUDED.whatsapp,
  cliq_alias = EXCLUDED.cliq_alias,
  bank_info = EXCLUDED.bank_info,
  ical_token = COALESCE(EXCLUDED.ical_token, public.photographer_private.ical_token),
  external_ical_url = EXCLUDED.external_ical_url,
  external_ical_synced_at = EXCLUDED.external_ical_synced_at;

-- Auto-create a private row for every new profile.
CREATE OR REPLACE FUNCTION public.ensure_photographer_private_row()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.photographer_private(user_id) VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_profiles_create_private
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.ensure_photographer_private_row();

ALTER TABLE public.profiles
  DROP COLUMN IF EXISTS phone,
  DROP COLUMN IF EXISTS whatsapp,
  DROP COLUMN IF EXISTS cliq_alias,
  DROP COLUMN IF EXISTS bank_info,
  DROP COLUMN IF EXISTS ical_token,
  DROP COLUMN IF EXISTS external_ical_url,
  DROP COLUMN IF EXISTS external_ical_synced_at;

-- Update get_booking_by_token to read from photographer_private.
CREATE OR REPLACE FUNCTION public.get_booking_by_token(_token text)
 RETURNS jsonb
 LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v jsonb;
BEGIN
  SELECT jsonb_build_object(
    'id', b.id, 'status', b.status, 'production_stage', b.production_stage,
    'event_date', b.event_date, 'start_time', b.start_time, 'end_time', b.end_time,
    'service', b.service, 'venue_address', b.venue_address,
    'base_price', b.base_price, 'total_price', b.total_price, 'deposit_amount', b.deposit_amount,
    'deposit_sent_at', b.deposit_sent_at, 'deposit_confirmed_at', b.deposit_confirmed_at,
    'delivered_at', b.delivered_at, 'client_received_at', b.client_received_at,
    'client_notes', b.client_notes, 'client_name', b.client_name, 'addons', b.addons,
    'photographer', jsonb_build_object(
      'display_name', p.display_name, 'username', p.username,
      'whatsapp', pp.whatsapp, 'phone', pp.phone,
      'cliq_alias', pp.cliq_alias, 'bank_info', pp.bank_info,
      'fixed_deposit', p.fixed_deposit, 'avatar_url', p.avatar_url
    )
  ) INTO v
  FROM public.bookings b
  JOIN public.profiles p ON p.id = b.photographer_id
  LEFT JOIN public.photographer_private pp ON pp.user_id = b.photographer_id
  WHERE b.client_tracking_token = _token;
  RETURN v;
END;
$function$;

-- Fix: tighten bookings INSERT (all inserts now go via service-role server fn).
DROP POLICY IF EXISTS "anyone insert booking quote" ON public.bookings;

-- Fix: drop direct notification inserts; only SECURITY DEFINER triggers / service role create them.
DROP POLICY IF EXISTS "auth insert own notif" ON public.notifications;

-- Fix: photographers must not be able to edit reviews about themselves.
DROP POLICY IF EXISTS "owner update review" ON public.reviews;
CREATE POLICY "client update own review" ON public.reviews
  FOR UPDATE TO authenticated
  USING (auth.uid() = client_user_id)
  WITH CHECK (auth.uid() = client_user_id);

-- Fix: hide unavailability "reason" from public; expose only dates via a SECURITY DEFINER RPC.
DROP POLICY IF EXISTS "unavail public read" ON public.photographer_unavailability;

CREATE OR REPLACE FUNCTION public.get_photographer_busy_dates(_pid uuid)
RETURNS SETOF date LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT date FROM public.photographer_unavailability WHERE photographer_id = _pid;
$$;
GRANT EXECUTE ON FUNCTION public.get_photographer_busy_dates(uuid) TO anon, authenticated;
