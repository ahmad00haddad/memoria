
-- Restore EXECUTE on is_subscription_active so RLS policies on profiles can be evaluated for anon/authenticated
GRANT EXECUTE ON FUNCTION public.is_subscription_active(uuid) TO anon, authenticated;

-- Create the search_photographers RPC used by the public search page
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
       AND (_city IS NULL OR p.city = _city)
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
