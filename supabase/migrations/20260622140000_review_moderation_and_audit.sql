-- =====================================================================
-- Priority 3 — Review moderation + extended audit logging
-- =====================================================================
-- يضيف:
--   1) التقييمات الجديدة تُنشأ غير منشورة (is_published default = false). لا نلمس
--      التقييمات القائمة (نغيّر الافتراضي فقط).
--   2) approve_review / reject_review (أدمن) + دالة log_audit عامة.
--   3) توسيع سجل التدقيق: تسجيل الحذف/التجديد/تغيير النشر في audit_logs عبر
--      CREATE OR REPLACE للدوال القائمة (يحافظ على صلاحياتها).
-- =====================================================================

-- 1) التقييمات الجديدة بحاجة لمراجعة قبل النشر -------------------------
ALTER TABLE public.reviews ALTER COLUMN is_published SET DEFAULT false;

-- 2) مساعد تسجيل تدقيق عام (يلتقط الفاعل من auth.uid()) -----------------
CREATE OR REPLACE FUNCTION public.log_audit(
  _action text, _entity_type text, _entity_id text,
  _before jsonb DEFAULT NULL, _after jsonb DEFAULT NULL
)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  INSERT INTO public.audit_logs (action, actor_id, entity_type, entity_id, before_data, after_data)
  VALUES (_action, auth.uid(), _entity_type, _entity_id, _before, _after);
$$;

REVOKE ALL ON FUNCTION public.log_audit(text, text, text, jsonb, jsonb) FROM PUBLIC, anon, authenticated;

-- 3) مراجعة التقييمات (أدمن) -------------------------------------------
CREATE OR REPLACE FUNCTION public.approve_review(_review_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  UPDATE public.reviews SET is_published = true WHERE id = _review_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'review not found'; END IF;
  PERFORM public.log_audit('review.approve', 'review', _review_id::text, NULL,
                           jsonb_build_object('is_published', true));
END;
$$;

CREATE OR REPLACE FUNCTION public.reject_review(_review_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  UPDATE public.reviews SET is_published = false WHERE id = _review_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'review not found'; END IF;
  PERFORM public.log_audit('review.reject', 'review', _review_id::text, NULL,
                           jsonb_build_object('is_published', false));
END;
$$;

REVOKE ALL ON FUNCTION public.approve_review(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.reject_review(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.approve_review(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_review(uuid) TO authenticated;

-- 4) توسيع سجل التدقيق للدوال الحسّاسة القائمة -------------------------
-- (CREATE OR REPLACE يحافظ على الصلاحيات الحالية؛ نضيف PERFORM log_audit فقط.)

-- 4.1 حذف ناعم للحجز
CREATE OR REPLACE FUNCTION public.soft_delete_booking(_booking_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_photographer uuid;
BEGIN
  SELECT photographer_id INTO v_photographer FROM public.bookings WHERE id = _booking_id;
  IF v_photographer IS NULL THEN RAISE EXCEPTION 'booking not found'; END IF;
  IF v_photographer != auth.uid() AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  UPDATE public.bookings
  SET deleted_at = now(), updated_at = now()
  WHERE id = _booking_id;

  PERFORM public.log_audit('booking.delete', 'booking', _booking_id::text, NULL,
                           jsonb_build_object('deleted', true));
END;
$$;

-- 4.2 تجديد الاشتراك (أدمن يدوياً)
CREATE OR REPLACE FUNCTION public.admin_renew_subscription(_photographer_id uuid, _months int)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_start timestamptz;
  v_end   timestamptz;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF _months IS NULL OR _months <= 0 THEN RAISE EXCEPTION 'invalid months'; END IF;

  SELECT GREATEST(COALESCE(current_period_end, now()), now()) INTO v_start
  FROM public.subscriptions WHERE photographer_id = _photographer_id;
  IF v_start IS NULL THEN v_start := now(); END IF;
  v_end := v_start + (_months || ' months')::interval;

  INSERT INTO public.subscriptions (photographer_id, status, current_period_start, current_period_end, trial_ends_at)
  VALUES (_photographer_id, 'active', now(), v_end, now())
  ON CONFLICT (photographer_id) DO UPDATE
    SET status = 'active',
        current_period_start = COALESCE(public.subscriptions.current_period_start, now()),
        current_period_end = v_end,
        updated_at = now();

  PERFORM public.log_audit('subscription.renew', 'subscription', _photographer_id::text, NULL,
                           jsonb_build_object('months', _months, 'current_period_end', v_end));
END;
$$;

-- 4.3 تبديل نشر ملف المصوّرة (أدمن)
CREATE OR REPLACE FUNCTION public.admin_set_published(_photographer_id uuid, _published boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  UPDATE public.profiles SET is_published = _published, updated_at = now() WHERE id = _photographer_id;
  PERFORM public.log_audit('profile.set_published', 'profile', _photographer_id::text, NULL,
                           jsonb_build_object('is_published', _published));
END;
$$;

-- إعادة تأكيد الصلاحيات (CREATE OR REPLACE لا يلغيها، لكن للتوثيق والوضوح).
REVOKE EXECUTE ON FUNCTION public.soft_delete_booking(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.soft_delete_booking(uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_renew_subscription(uuid, int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_renew_subscription(uuid, int) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_set_published(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_published(uuid, boolean) TO authenticated;
