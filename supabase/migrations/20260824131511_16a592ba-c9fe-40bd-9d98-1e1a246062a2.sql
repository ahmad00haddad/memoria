CREATE OR REPLACE FUNCTION public.booking_token_exists(_token text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.bookings b
    WHERE b.client_tracking_token = _token
      AND b.deleted_at IS NULL
      AND (b.token_expires_at IS NULL OR b.token_expires_at > now())
  )
$$;

REVOKE ALL ON FUNCTION public.booking_token_exists(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.booking_token_exists(text) TO anon, authenticated, service_role;

DROP POLICY IF EXISTS "anon upload deposit proof via token" ON storage.objects;
CREATE POLICY "anon upload deposit proof via token"
ON storage.objects FOR INSERT TO anon, authenticated
WITH CHECK (
  bucket_id = 'deposit-proofs'
  AND (storage.foldername(name))[1] = 'public-tokens'
  AND (storage.foldername(name))[2] IS NOT NULL
  AND public.booking_token_exists((storage.foldername(name))[2])
);

DROP POLICY IF EXISTS "deposit insert public-token authenticated" ON storage.objects;