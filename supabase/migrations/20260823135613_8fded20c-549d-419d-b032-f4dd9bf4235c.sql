-- Allow photographer/admin to read client-uploaded deposit proofs stored under public-tokens/<token>/
CREATE POLICY "deposit read public-token proofs"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'deposit-proofs'
  AND (storage.foldername(name))[1] = 'public-tokens'
  AND (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.client_tracking_token = (storage.foldername(name))[2]
        AND (b.photographer_id = auth.uid() OR b.client_user_id = auth.uid())
    )
  )
);

-- Allow signed-in clients (and photographer) to also use the token path for uploads
CREATE POLICY "deposit insert public-token authenticated"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'deposit-proofs'
  AND (storage.foldername(name))[1] = 'public-tokens'
  AND EXISTS (
    SELECT 1 FROM public.bookings b
    WHERE b.client_tracking_token = (storage.foldername(name))[2]
  )
);