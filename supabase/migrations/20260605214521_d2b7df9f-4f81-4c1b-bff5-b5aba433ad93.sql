
-- 1) Notifications: restrict inserts to self-targeted
DROP POLICY IF EXISTS "auth insert notif" ON public.notifications;
CREATE POLICY "auth insert own notif"
  ON public.notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- 2) Reviews: only allow inserting for completed bookings
DROP POLICY IF EXISTS "client insert review" ON public.reviews;
CREATE POLICY "client insert review"
  ON public.reviews
  FOR INSERT
  TO authenticated
  WITH CHECK (
    client_user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = reviews.booking_id
        AND b.client_user_id = auth.uid()
        AND b.status = 'completed'
    )
  );

-- 3) Revoke sensitive columns from anon on profiles, then grant only safe columns
REVOKE SELECT ON public.profiles FROM anon;
GRANT SELECT (
  id, username, display_name, bio, city, base_location, instagram,
  avatar_url, cover_url, equipment, deposit_percent, travel_fee_per_km,
  is_published, created_at, updated_at, portfolio_urls, free_km,
  is_featured, tagline, booking_notes, fixed_deposit
) ON public.profiles TO anon;

-- 4) Revoke unavailability.reason from anon (dates remain public)
REVOKE SELECT ON public.photographer_unavailability FROM anon;
GRANT SELECT (id, photographer_id, date, created_at)
  ON public.photographer_unavailability TO anon;

-- 5) Storage: explicit owner-only UPDATE/DELETE on payment-proofs bucket
DROP POLICY IF EXISTS "payment_proofs owner update" ON storage.objects;
CREATE POLICY "payment_proofs owner update"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'payment-proofs' AND owner = auth.uid())
  WITH CHECK (bucket_id = 'payment-proofs' AND owner = auth.uid());

DROP POLICY IF EXISTS "payment_proofs owner delete" ON storage.objects;
CREATE POLICY "payment_proofs owner delete"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'payment-proofs' AND owner = auth.uid());
