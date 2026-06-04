
DROP POLICY IF EXISTS "public read by token" ON public.contracts;

DROP POLICY IF EXISTS "messages insert by parties" ON public.messages;
CREATE POLICY "messages insert by parties" ON public.messages
  FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = messages.booking_id
        AND (auth.uid() = b.photographer_id OR auth.uid() = b.client_user_id)
    )
  );

DROP POLICY IF EXISTS "client insert review" ON public.reviews;
CREATE POLICY "client insert review" ON public.reviews
  FOR INSERT TO authenticated
  WITH CHECK (
    client_user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = reviews.booking_id
        AND b.client_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "deposit insert if booking exists" ON storage.objects;
CREATE POLICY "deposit insert by booking party" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'deposit-proofs'
    AND EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id::text = (storage.foldername(name))[1]
        AND (auth.uid() = b.photographer_id OR auth.uid() = b.client_user_id)
    )
  );

DROP POLICY IF EXISTS "profiles public read" ON public.profiles;
CREATE POLICY "profiles owner read" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE OR REPLACE VIEW public.profiles_public AS
  SELECT
    id, username, display_name, bio, city, base_location, phone, cliq_alias,
    instagram, whatsapp, avatar_url, cover_url, equipment,
    deposit_percent, travel_fee_per_km, free_km, is_published, is_featured,
    portfolio_urls, tagline, booking_notes, bank_info, fixed_deposit,
    created_at, updated_at
  FROM public.profiles
  WHERE is_published = true;

GRANT SELECT ON public.profiles_public TO anon, authenticated;

DROP POLICY IF EXISTS "unavail public read" ON public.photographer_unavailability;

CREATE OR REPLACE VIEW public.unavailability_public AS
  SELECT id, photographer_id, date
  FROM public.photographer_unavailability;

GRANT SELECT ON public.unavailability_public TO anon, authenticated;

REVOKE ALL ON FUNCTION public.refresh_featured_photographers() FROM PUBLIC;

CREATE OR REPLACE FUNCTION public.get_referrer_id(_code text)
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.profiles WHERE referral_code = _code LIMIT 1
$$;

REVOKE ALL ON FUNCTION public.get_referrer_id(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_referrer_id(text) TO authenticated;
