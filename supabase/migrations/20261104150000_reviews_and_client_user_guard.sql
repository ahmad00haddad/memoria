-- ثغرة: المصوّرة تقدر تعدّل bookings.client_user_id مباشرة (غير محمي) فتصير "عميلة" حجزها،
-- ثم تُدرج تقييماً مباشرة بدون مراجعة (is_published غير مقيّد بسياسة الإدراج/التعديل).
-- 1) client_user_id يُضاف للأعمدة المحمية  2) أي تقييم من واجهة المستخدم يبدأ غير منشور دائماً.

CREATE OR REPLACE FUNCTION public.guard_booking_client_user()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF current_user = 'authenticated' AND NOT public.has_role(auth.uid(), 'admin')
     AND NEW.client_user_id IS DISTINCT FROM OLD.client_user_id THEN
    RAISE EXCEPTION 'PROTECTED_BOOKING_FIELD' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS aa_guard_booking_client_user ON public.bookings;
CREATE TRIGGER aa_guard_booking_client_user BEFORE UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.guard_booking_client_user();

CREATE OR REPLACE FUNCTION public.guard_review_publish()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF current_user = 'authenticated' AND NOT public.has_role(auth.uid(), 'admin') THEN
    IF TG_OP = 'INSERT' THEN
      NEW.is_published := false;
    ELSIF NEW.is_published IS DISTINCT FROM OLD.is_published
       OR NEW.rating IS DISTINCT FROM OLD.rating AND OLD.is_published THEN
      RAISE EXCEPTION 'PROTECTED_REVIEW_FIELD' USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS aa_guard_review_publish ON public.reviews;
CREATE TRIGGER aa_guard_review_publish BEFORE INSERT OR UPDATE ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.guard_review_publish();
