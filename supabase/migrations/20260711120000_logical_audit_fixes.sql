-- =====================================================================
-- Migration: Logical Audit Fixes (Constraints + Search RPC)
-- =====================================================================

-- 1) Add safety constraints to prevent negative financial values
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_deposit_percent_check 
  CHECK (deposit_percent >= 0 AND deposit_percent <= 100);

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_fixed_deposit_check 
  CHECK (fixed_deposit IS NULL OR fixed_deposit >= 0);

ALTER TABLE public.pricing_rules
  ADD CONSTRAINT pricing_rules_price_check 
  CHECK (price >= 0);

ALTER TABLE public.pricing_rules
  ADD CONSTRAINT pricing_rules_per_photo_price_check 
  CHECK (per_photo_price IS NULL OR per_photo_price >= 0);

-- 2) Create highly optimized RPC for searching active photographers
-- This solves the pagination data-loss bug caused by limiting before filtering.
CREATE OR REPLACE FUNCTION public.search_photographers(
  _query text DEFAULT NULL,
  _city text DEFAULT NULL,
  _min_price numeric DEFAULT NULL,
  _max_price numeric DEFAULT NULL,
  _available_date date DEFAULT NULL,
  _sort text DEFAULT 'featured',
  _limit int DEFAULT 48
)
RETURNS TABLE (
  id uuid,
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
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH active_subs AS (
    SELECT DISTINCT photographer_id
    FROM public.subscriptions
    WHERE status = 'active' AND (current_period_end IS NULL OR current_period_end > now())
       OR status = 'trial' AND (trial_ends_at IS NULL OR trial_ends_at > now())
  ),
  prices AS (
    SELECT photographer_id, MIN(price) as m_price
    FROM public.pricing_rules
    WHERE package != 'addon'
    GROUP BY photographer_id
  ),
  ratings AS (
    SELECT photographer_id, AVG(rating)::numeric as a_rating, COUNT(*) as c_count
    FROM public.reviews
    WHERE is_published = true
    GROUP BY photographer_id
  ),
  busy_days AS (
    SELECT photographer_id
    FROM public.photographer_unavailability
    WHERE date = _available_date
  ),
  fully_booked AS (
    -- Heuristic: If a photographer has 4 or more active bookings on a single day, consider them fully booked.
    SELECT photographer_id
    FROM public.bookings
    WHERE event_date = _available_date 
      AND deleted_at IS NULL 
      AND status IN ('pending_deposit', 'confirmed', 'completed')
    GROUP BY photographer_id
    HAVING COUNT(*) >= 4
  )
  SELECT
    p.id,
    p.username,
    p.display_name,
    p.city,
    p.bio,
    p.tagline,
    p.avatar_url,
    p.cover_url,
    p.is_featured,
    p.verification_status,
    pr.m_price AS min_price,
    COALESCE(r.a_rating, 0) AS avg_rating,
    COALESCE(r.c_count, 0) AS review_count
  FROM public.profiles p
  INNER JOIN active_subs s ON s.photographer_id = p.id
  LEFT JOIN prices pr ON pr.photographer_id = p.id
  LEFT JOIN ratings r ON r.photographer_id = p.id
  WHERE p.is_published = true
    AND (_city IS NULL OR p.city ILIKE '%' || _city || '%')
    AND (_query IS NULL OR (
         p.username ILIKE '%' || _query || '%' OR
         p.display_name ILIKE '%' || _query || '%' OR
         p.city ILIKE '%' || _query || '%' OR
         p.tagline ILIKE '%' || _query || '%'
        ))
    AND (_min_price IS NULL OR pr.m_price >= _min_price)
    AND (_max_price IS NULL OR pr.m_price <= _max_price)
    AND (_available_date IS NULL OR (
          p.id NOT IN (SELECT photographer_id FROM busy_days) AND
          p.id NOT IN (SELECT photographer_id FROM fully_booked)
        ))
  ORDER BY
    CASE WHEN _sort = 'rating' THEN COALESCE(r.a_rating, 0) END DESC NULLS LAST,
    CASE WHEN _sort = 'rating' THEN COALESCE(r.c_count, 0) END DESC NULLS LAST,
    CASE WHEN _sort = 'price_asc' THEN pr.m_price END ASC NULLS LAST,
    CASE WHEN _sort = 'price_desc' THEN pr.m_price END DESC NULLS LAST,
    CASE WHEN _sort = 'featured' OR _sort IS NULL THEN p.is_featured::int END DESC NULLS LAST,
    CASE WHEN _sort = 'featured' OR _sort IS NULL THEN COALESCE(r.a_rating, 0) END DESC NULLS LAST
  LIMIT _limit;
END;
$$;

GRANT EXECUTE ON FUNCTION public.search_photographers TO anon, authenticated;
