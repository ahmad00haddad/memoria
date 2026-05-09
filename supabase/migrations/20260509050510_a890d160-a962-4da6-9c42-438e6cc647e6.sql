
-- Reviews
CREATE TABLE public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL UNIQUE,
  photographer_id UUID NOT NULL,
  client_user_id UUID,
  client_name TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  is_published BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reviews public read" ON public.reviews FOR SELECT USING (is_published = true);
CREATE POLICY "client insert review" ON public.reviews FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.bookings b WHERE b.id = booking_id AND (b.client_user_id = auth.uid() OR b.client_email IS NOT NULL))
);
CREATE POLICY "owner update review" ON public.reviews FOR UPDATE USING (auth.uid() = client_user_id OR auth.uid() = photographer_id);

-- Unavailability
CREATE TABLE public.photographer_unavailability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  photographer_id UUID NOT NULL,
  date DATE NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (photographer_id, date)
);
ALTER TABLE public.photographer_unavailability ENABLE ROW LEVEL SECURITY;
CREATE POLICY "unavail public read" ON public.photographer_unavailability FOR SELECT USING (true);
CREATE POLICY "owner manage unavail" ON public.photographer_unavailability FOR ALL USING (auth.uid() = photographer_id) WITH CHECK (auth.uid() = photographer_id);

-- Notifications
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  link TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner read notif" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "owner update notif" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "system insert notif" ON public.notifications FOR INSERT WITH CHECK (true);

-- Profile extras
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS portfolio_urls TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS free_km NUMERIC NOT NULL DEFAULT 20;

-- Storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true) ON CONFLICT DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('deposit-proofs', 'deposit-proofs', false) ON CONFLICT DO NOTHING;

-- avatars policies (public read, owner write)
CREATE POLICY "avatars public read" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "avatars owner write" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "avatars owner update" ON storage.objects FOR UPDATE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "avatars owner delete" ON storage.objects FOR DELETE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- deposit-proofs policies (anyone can upload to a booking folder; only photographer/client of booking can read)
CREATE POLICY "deposit anyone insert" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'deposit-proofs');
CREATE POLICY "deposit parties read" ON storage.objects FOR SELECT USING (
  bucket_id = 'deposit-proofs' AND EXISTS (
    SELECT 1 FROM public.bookings b WHERE b.id::text = (storage.foldername(name))[1]
      AND (b.photographer_id = auth.uid() OR b.client_user_id = auth.uid())
  )
);
