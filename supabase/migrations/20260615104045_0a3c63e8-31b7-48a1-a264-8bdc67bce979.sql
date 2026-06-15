
CREATE TABLE public.shot_list_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  photographer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('todo','done','skipped')),
  sort_order INTEGER NOT NULL DEFAULT 0,
  done_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_shot_list_booking ON public.shot_list_items(booking_id, sort_order);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.shot_list_items TO authenticated;
GRANT ALL ON public.shot_list_items TO service_role;

ALTER TABLE public.shot_list_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "photographer manages own shot list"
  ON public.shot_list_items FOR ALL
  USING (photographer_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (photographer_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_shot_list_items_updated_at
  BEFORE UPDATE ON public.shot_list_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.seed_default_shot_list(_booking_id uuid, _service text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_photographer uuid;
  v_existing int;
BEGIN
  SELECT photographer_id INTO v_photographer FROM public.bookings WHERE id = _booking_id;
  IF v_photographer IS NULL THEN RAISE EXCEPTION 'booking not found'; END IF;
  IF v_photographer != auth.uid() AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT COUNT(*) INTO v_existing FROM public.shot_list_items WHERE booking_id = _booking_id;
  IF v_existing > 0 THEN RETURN; END IF;

  IF _service ILIKE '%عرس%' OR _service ILIKE '%زفاف%' OR _service ILIKE '%wedding%' THEN
    INSERT INTO public.shot_list_items (booking_id, photographer_id, title, sort_order) VALUES
    (_booking_id, v_photographer, 'تحضيرات العروس', 1),
    (_booking_id, v_photographer, 'فستان الزفاف وتفاصيله', 2),
    (_booking_id, v_photographer, 'لحظة الدخول', 3),
    (_booking_id, v_photographer, 'تبادل الخواتم', 4),
    (_booking_id, v_photographer, 'الرقصة الأولى', 5),
    (_booking_id, v_photographer, 'قطع الكيكة', 6),
    (_booking_id, v_photographer, 'صور عائلية جماعية', 7),
    (_booking_id, v_photographer, 'صور مع الأصدقاء', 8),
    (_booking_id, v_photographer, 'لقطات الديكور والقاعة', 9),
    (_booking_id, v_photographer, 'بورتريه للعروسين', 10);
  ELSIF _service ILIKE '%خطبة%' OR _service ILIKE '%engagement%' THEN
    INSERT INTO public.shot_list_items (booking_id, photographer_id, title, sort_order) VALUES
    (_booking_id, v_photographer, 'تبادل الخواتم', 1),
    (_booking_id, v_photographer, 'لقطة الخاتم بالقرب', 2),
    (_booking_id, v_photographer, 'بورتريه ثنائي', 3),
    (_booking_id, v_photographer, 'صور عائلية', 4),
    (_booking_id, v_photographer, 'لقطات الديكور والحلويات', 5);
  ELSIF _service ILIKE '%مولود%' OR _service ILIKE '%newborn%' OR _service ILIKE '%baby%' THEN
    INSERT INTO public.shot_list_items (booking_id, photographer_id, title, sort_order) VALUES
    (_booking_id, v_photographer, 'بورتريه قريب للوجه', 1),
    (_booking_id, v_photographer, 'القدمين واليدين', 2),
    (_booking_id, v_photographer, 'مع الأم', 3),
    (_booking_id, v_photographer, 'مع الأب', 4),
    (_booking_id, v_photographer, 'العائلة كاملة', 5);
  ELSE
    INSERT INTO public.shot_list_items (booking_id, photographer_id, title, sort_order) VALUES
    (_booking_id, v_photographer, 'بورتريه رسمي', 1),
    (_booking_id, v_photographer, 'لقطات طبيعية', 2),
    (_booking_id, v_photographer, 'صور جماعية', 3),
    (_booking_id, v_photographer, 'تفاصيل المكان', 4);
  END IF;
END;
$$;
