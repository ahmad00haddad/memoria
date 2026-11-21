-- إضافات اختيارية على الباقة (لا يتغيّر شيء للباقات الحالية):
--  • cities: الباقة لمدن معيّنة؛ فارغة = لكل المدن (الوضع الحالي). صفحة المصوّرة تعرض
--    فلتر مدن فقط إن رُبطت باقة واحدة على الأقل، والبحث بمدينة يُظهر المصوّرة إن كان
--    عندها باقة لتلك المدينة حتى لو كانت مدينتها الأساسية غيرها.
--  • photo_shooters / video_shooters: عدد مصوّري الصور والفيديو (اختياري، مع «أنا مع فريقي»/«فريقي»).
--  • video_types: نوع فيديو التسليم للفرز والبحث (اختياري).
--  • all_good_edited: «وكل الصور الجيدة بعد الفرز» — deliverable_count يصبح حداً أدنى مضموناً.
BEGIN;

ALTER TABLE public.pricing_rules
  ADD COLUMN IF NOT EXISTS cities text[],
  ADD COLUMN IF NOT EXISTS photo_shooters smallint,
  ADD COLUMN IF NOT EXISTS video_shooters smallint,
  ADD COLUMN IF NOT EXISTS video_types text[],
  ADD COLUMN IF NOT EXISTS all_good_edited boolean NOT NULL DEFAULT false;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'pricing_rules_cities_check') THEN
    ALTER TABLE public.pricing_rules ADD CONSTRAINT pricing_rules_cities_check
      CHECK (cities IS NULL OR (cardinality(cities) <= 20 AND array_position(cities, NULL) IS NULL
        AND length(array_to_string(cities, '')) <= 400));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'pricing_rules_shooters_check') THEN
    ALTER TABLE public.pricing_rules ADD CONSTRAINT pricing_rules_shooters_check
      CHECK ((photo_shooters IS NULL OR photo_shooters BETWEEN 0 AND 20)
         AND (video_shooters IS NULL OR video_shooters BETWEEN 0 AND 20));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'pricing_rules_video_types_check') THEN
    ALTER TABLE public.pricing_rules ADD CONSTRAINT pricing_rules_video_types_check
      CHECK (video_types IS NULL OR video_types <@ ARRAY['highlight', 'full_film', 'full_event', 'reels']::text[]);
  END IF;
END $$;

-- اسم المدينة بلا شدّة ولا همزة ولا مسافات زائدة (عمّان = عمان، إربد = اربد) — نفس normCity في الواجهة
CREATE OR REPLACE FUNCTION public.norm_city(c text)
RETURNS text LANGUAGE sql IMMUTABLE AS $$ SELECT btrim(translate(COALESCE(c, ''), 'أإآّ', 'ااا')) $$;

-- الملف العام: الباقات تحمل الحقول الجديدة -----------------------------------------
CREATE OR REPLACE FUNCTION public.get_public_profile_data(p_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE WHEN NOT EXISTS (
    SELECT 1 FROM profiles WHERE id = p_id AND is_published AND deleted_at IS NULL AND public.is_subscription_active(p_id)
  ) THEN NULL ELSE jsonb_build_object(
    'pricing', COALESCE((
      SELECT jsonb_agg(to_jsonb(pr) ORDER BY pr.price)
      FROM (SELECT id, service, package, label, price, per_photo_price, description, subtitle, cta_label,
                   hours, deliverable_count, delivery_days, shooter, overtime_fee, excludes, unedited_included, revision_rounds,
                   allow_negotiation, cities, photo_shooters, video_shooters, video_types, all_good_edited
            FROM pricing_rules WHERE photographer_id = p_id
              AND id IN (SELECT public.visible_pricing_ids(p_id))) pr), '[]'::jsonb),
    'reviews', COALESCE((
      SELECT jsonb_agg(to_jsonb(r) ORDER BY r.created_at DESC)
      FROM (SELECT id, client_name, rating, comment, created_at, photographer_reply, replied_at
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
        AND phone_verified_at IS NOT NULL AND created_at >= now() - interval '180 days'),
    'deliveryDays', (
      SELECT CASE WHEN count(*) >= 3 THEN
        round(percentile_cont(0.5) WITHIN GROUP (ORDER BY (delivered_at::date - event_date))::numeric)
      END
      FROM bookings
      WHERE photographer_id = p_id AND deleted_at IS NULL AND delivered_at IS NOT NULL
        AND delivered_at >= now() - interval '365 days')
  ) END;
$$;
REVOKE ALL ON FUNCTION public.get_public_profile_data(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_profile_data(uuid) TO anon, authenticated;

-- البحث بمدينة: مدينتها الأساسية، أو باقة ظاهرة مربوطة بتلك المدينة ------------------
CREATE OR REPLACE FUNCTION public.search_photographers(
  _query text DEFAULT NULL,
  _city text DEFAULT NULL,
  _min_price numeric DEFAULT NULL,
  _max_price numeric DEFAULT NULL,
  _available_date date DEFAULT NULL,
  _sort text DEFAULT 'featured',
  _limit integer DEFAULT 48
)
RETURNS TABLE (
  username text,
  display_name text,
  city text,
  bio text,
  tagline text,
  avatar_url text,
  cover_url text,
  is_featured boolean,
  verification_status text,
  min_price numeric,
  avg_rating numeric,
  review_count bigint
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  WITH agg AS (
    SELECT p.id,
           p.username, p.display_name, p.city, p.bio, p.tagline,
           p.avatar_url, p.cover_url, p.is_featured, p.verification_status,
           (SELECT MIN(price) FROM public.pricing_rules pr WHERE pr.photographer_id = p.id) AS min_price,
           COALESCE((SELECT AVG(rating)::numeric FROM public.reviews r
                     WHERE r.photographer_id = p.id AND r.is_published = true), 0) AS avg_rating,
           COALESCE((SELECT COUNT(*) FROM public.reviews r
                     WHERE r.photographer_id = p.id AND r.is_published = true), 0) AS review_count
      FROM public.profiles p
     WHERE p.is_published = true
       AND p.deleted_at IS NULL
       AND public.is_subscription_active(p.id)
       AND (_city IS NULL OR p.city = _city
            OR public.norm_city(p.city) = public.norm_city(_city)
            OR EXISTS (
              SELECT 1 FROM public.pricing_rules pr
               WHERE pr.photographer_id = p.id AND pr.package <> 'addon' AND pr.is_visible IS NOT FALSE
                 AND EXISTS (SELECT 1 FROM unnest(pr.cities) c WHERE public.norm_city(c) = public.norm_city(_city))))
       AND (_query IS NULL OR (
             p.display_name ILIKE '%' || _query || '%'
          OR p.username ILIKE '%' || _query || '%'
          OR COALESCE(p.bio,'') ILIKE '%' || _query || '%'
          OR COALESCE(p.tagline,'') ILIKE '%' || _query || '%'
       ))
       AND (_available_date IS NULL OR NOT public.is_photographer_busy(p.id, _available_date))
  )
  SELECT username, display_name, city, bio, tagline, avatar_url, cover_url,
         is_featured, verification_status, min_price, avg_rating, review_count
    FROM agg
   WHERE (_min_price IS NULL OR (min_price IS NOT NULL AND min_price >= _min_price))
     AND (_max_price IS NULL OR (min_price IS NOT NULL AND min_price <= _max_price))
   ORDER BY
     CASE WHEN _sort = 'featured' THEN 0 ELSE 1 END,
     CASE WHEN _sort = 'featured' AND is_featured THEN 0 ELSE 1 END,
     CASE WHEN _sort = 'rating' THEN avg_rating END DESC NULLS LAST,
     CASE WHEN _sort = 'price_asc' THEN min_price END ASC NULLS LAST,
     CASE WHEN _sort = 'price_desc' THEN min_price END DESC NULLS LAST,
     display_name ASC
   LIMIT COALESCE(_limit, 48);
$$;
GRANT EXECUTE ON FUNCTION public.search_photographers(text, text, numeric, numeric, date, text, integer) TO anon, authenticated;

COMMIT;
