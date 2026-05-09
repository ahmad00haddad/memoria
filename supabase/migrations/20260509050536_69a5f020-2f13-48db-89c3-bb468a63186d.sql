
DROP POLICY IF EXISTS "system insert notif" ON public.notifications;
CREATE POLICY "auth insert notif" ON public.notifications FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "deposit anyone insert" ON storage.objects;
CREATE POLICY "deposit insert if booking exists" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'deposit-proofs' AND EXISTS (
    SELECT 1 FROM public.bookings b WHERE b.id::text = (storage.foldername(name))[1]
  )
);
