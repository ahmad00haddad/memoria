-- 1) No publishing with fewer than 3 portfolio photos (decision 2026-11-02).
--    Checked on the way in (publishing, or dropping below 3 while published), so
--    existing pages are not broken by unrelated saves. Demo accounts are exempt.
CREATE OR REPLACE FUNCTION public.enforce_min_photos_to_publish()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.is_published AND NOT COALESCE(NEW.is_demo, false)
     AND COALESCE(cardinality(NEW.portfolio_urls), 0) < 3
     AND (TG_OP = 'INSERT' OR NOT COALESCE(OLD.is_published, false)
          OR COALESCE(cardinality(OLD.portfolio_urls), 0) >= 3) THEN
    RAISE EXCEPTION 'لازم 3 صور أعمال على الأقل لنشر الصفحة'
      USING ERRCODE = 'P0001', HINT = 'MIN_PHOTOS';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_min_photos ON public.profiles;
CREATE TRIGGER profiles_min_photos
  BEFORE INSERT OR UPDATE OF is_published, portfolio_urls ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.enforce_min_photos_to_publish();

-- 2) Package visibility. A photographer can hide a package; on Basic only three
--    main packages show (the ones she leaves visible, cheapest first if more).
ALTER TABLE public.pricing_rules ADD COLUMN IF NOT EXISTS is_visible boolean NOT NULL DEFAULT true;

CREATE OR REPLACE FUNCTION public.visible_pricing_ids(_pid uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM (
    SELECT id, package,
           row_number() OVER (PARTITION BY (package::text = 'addon') ORDER BY price, created_at) AS rn
    FROM public.pricing_rules
    WHERE photographer_id = _pid AND is_visible
  ) x
  WHERE package::text = 'addon' OR public.photographer_tier(_pid) = 'pro' OR rn <= 3;
$$;
GRANT EXECUTE ON FUNCTION public.visible_pricing_ids(uuid) TO anon, authenticated;

-- Basic cannot switch a fourth main package to visible.
CREATE OR REPLACE FUNCTION public.enforce_basic_visible_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.package::text <> 'addon' AND NEW.is_visible AND NOT COALESCE(OLD.is_visible, false)
     AND public.photographer_tier(NEW.photographer_id) = 'basic'
     AND (SELECT count(*) FROM public.pricing_rules r
          WHERE r.photographer_id = NEW.photographer_id AND r.id <> NEW.id
            AND r.package::text <> 'addon' AND r.is_visible) >= 3 THEN
    RAISE EXCEPTION 'باقة Basic تُظهر 3 باقات فقط — أخفي باقة أخرى أولاً أو رقّي لـPro'
      USING ERRCODE = 'P0001', HINT = 'BASIC_VISIBLE_LIMIT';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS pricing_rules_basic_visible ON public.pricing_rules;
CREATE TRIGGER pricing_rules_basic_visible
  BEFORE UPDATE OF is_visible ON public.pricing_rules
  FOR EACH ROW EXECUTE FUNCTION public.enforce_basic_visible_limit();

-- Public profile shows visible packages only --------------------------------
CREATE OR REPLACE FUNCTION public.get_public_profile_data(p_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE WHEN NOT EXISTS (
    SELECT 1 FROM profiles WHERE id = p_id AND is_published AND deleted_at IS NULL
  ) THEN NULL ELSE jsonb_build_object(
    'pricing', COALESCE((
      SELECT jsonb_agg(to_jsonb(pr) ORDER BY pr.price)
      FROM (SELECT id, service, package, label, price, per_photo_price, description, subtitle, cta_label,
                   hours, deliverable_count, delivery_days, shooter, overtime_fee, excludes, unedited_included, revision_rounds
            FROM pricing_rules WHERE photographer_id = p_id
              AND id IN (SELECT public.visible_pricing_ids(p_id))) pr), '[]'::jsonb),
    'reviews', COALESCE((
      SELECT jsonb_agg(to_jsonb(r) ORDER BY r.created_at DESC)
      FROM (SELECT id, client_name, rating, comment, created_at
            FROM reviews WHERE photographer_id = p_id AND is_published) r), '[]'::jsonb),
    'unavail', COALESCE((
      SELECT jsonb_agg(d) FROM get_photographer_busy_dates(p_id) d), '[]'::jsonb),
    'bookedSlots', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('event_date', b.event_date, 'start_time', b.start_time, 'end_time', b.end_time))
      FROM bookings b
      WHERE b.photographer_id = p_id AND b.deleted_at IS NULL
        AND b.event_date >= CURRENT_DATE
        AND booking_holds(b)), '[]'::jsonb),
    'completedCount', (
      SELECT count(*) FROM bookings
      WHERE photographer_id = p_id AND deleted_at IS NULL AND status = 'completed'),
    'responseHours', (
      SELECT CASE WHEN count(*) >= 3 THEN
        round((percentile_cont(0.5) WITHIN GROUP (
          ORDER BY extract(epoch FROM approved_at - phone_verified_at) / 3600))::numeric, 1)
      END
      FROM bookings
      WHERE photographer_id = p_id AND needs_approval AND approved_at IS NOT NULL
        AND phone_verified_at IS NOT NULL AND created_at >= now() - interval '180 days')
  ) END;
$$;
REVOKE ALL ON FUNCTION public.get_public_profile_data(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_profile_data(uuid) TO anon, authenticated;
