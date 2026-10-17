-- عروض الأسعار: العروس تقترح سعراً أقل ولا يُنشأ حجز ولا يُحجز الموعد قبل موافقة المصوّرة.
CREATE TABLE IF NOT EXISTS public.price_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  photographer_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  rule_id uuid NOT NULL REFERENCES public.pricing_rules(id) ON DELETE CASCADE,
  package_label text NOT NULL,
  service text NOT NULL,
  listed_price numeric NOT NULL,
  offered_price numeric NOT NULL,
  client_name text NOT NULL,
  client_email text NOT NULL,
  client_phone text NOT NULL,
  event_date date NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  venue_address text,
  client_notes text,
  photographer_note text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','declined','expired')),
  token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(18),'hex'),
  booking_id uuid REFERENCES public.bookings(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  responded_at timestamptz,
  expires_at timestamptz NOT NULL DEFAULT now() + interval '3 days'
);

CREATE INDEX IF NOT EXISTS price_offers_photographer_status_idx ON public.price_offers (photographer_id, status);

ALTER TABLE public.price_offers ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.price_offers FROM anon, authenticated;
GRANT SELECT ON public.price_offers TO authenticated;
GRANT ALL ON public.price_offers TO service_role;

CREATE POLICY "owner read offers" ON public.price_offers
  FOR SELECT TO authenticated
  USING (auth.uid() = photographer_id);
