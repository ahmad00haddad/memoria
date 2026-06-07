REVOKE EXECUTE ON FUNCTION public.notify_message_recipient() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.notify_message_recipient() FROM anon;
REVOKE EXECUTE ON FUNCTION public.notify_message_recipient() FROM authenticated;

CREATE POLICY "deposit parties update"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'deposit-proofs' AND EXISTS (
    SELECT 1 FROM public.bookings b
    WHERE b.id::text = (storage.foldername(name))[1]
      AND (b.photographer_id = auth.uid() OR b.client_user_id = auth.uid())
  )
)
WITH CHECK (
  bucket_id = 'deposit-proofs' AND EXISTS (
    SELECT 1 FROM public.bookings b
    WHERE b.id::text = (storage.foldername(name))[1]
      AND (b.photographer_id = auth.uid() OR b.client_user_id = auth.uid())
  )
);

CREATE POLICY "deposit parties delete"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'deposit-proofs' AND EXISTS (
    SELECT 1 FROM public.bookings b
    WHERE b.id::text = (storage.foldername(name))[1]
      AND (b.photographer_id = auth.uid() OR b.client_user_id = auth.uid())
  )
);