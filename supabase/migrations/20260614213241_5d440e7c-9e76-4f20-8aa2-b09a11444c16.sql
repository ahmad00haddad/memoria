
CREATE TABLE public.delivery_galleries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL UNIQUE REFERENCES public.bookings(id) ON DELETE CASCADE,
  photographer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text,
  cover_path text,
  allow_downloads boolean NOT NULL DEFAULT true,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.delivery_galleries TO authenticated;
GRANT ALL ON public.delivery_galleries TO service_role;
ALTER TABLE public.delivery_galleries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "photographer manages own galleries" ON public.delivery_galleries
  FOR ALL TO authenticated
  USING (photographer_id = auth.uid())
  WITH CHECK (photographer_id = auth.uid());
CREATE TRIGGER trg_delivery_galleries_updated BEFORE UPDATE ON public.delivery_galleries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.delivery_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gallery_id uuid NOT NULL REFERENCES public.delivery_galleries(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  caption text,
  position int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.delivery_photos TO authenticated;
GRANT ALL ON public.delivery_photos TO service_role;
ALTER TABLE public.delivery_photos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "photographer manages own gallery photos" ON public.delivery_photos
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.delivery_galleries g WHERE g.id = delivery_photos.gallery_id AND g.photographer_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.delivery_galleries g WHERE g.id = delivery_photos.gallery_id AND g.photographer_id = auth.uid()));
CREATE INDEX idx_delivery_photos_gallery ON public.delivery_photos(gallery_id, position);

CREATE POLICY "photographer manages delivery files" ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'delivery-photos' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'delivery-photos' AND (storage.foldername(name))[1] = auth.uid()::text);
