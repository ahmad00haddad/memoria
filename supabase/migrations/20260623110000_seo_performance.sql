-- =============================================================================
-- 20260623110000_seo_performance.sql
-- تحسينات SEO + الأداء: فهارس البحث + دعم الـ sitemap الديناميكي
-- =============================================================================

-- 1) فهرس مركّب لصفحة البحث (يُسرّع searchPhotographers)
CREATE INDEX IF NOT EXISTS profiles_search_idx
  ON profiles(is_published, city, is_featured, id)
  WHERE is_published = true AND deleted_at IS NULL;

-- 2) فهرس للتقييمات المنشورة (يُسرّع حساب avg_rating)
CREATE INDEX IF NOT EXISTS reviews_published_idx
  ON reviews(photographer_id, rating)
  WHERE is_published = true;

-- 3) فهرس لصفحة التتبع (يُسرّع get_booking_by_token)
CREATE INDEX IF NOT EXISTS bookings_tracking_token_idx
  ON bookings(client_tracking_token)
  WHERE deleted_at IS NULL;

-- 4) فهرس للإشعارات (يُسرّع عدد غير المقروءة في الـ Header)
CREATE INDEX IF NOT EXISTS notifications_unread_idx
  ON notifications(user_id, is_read)
  WHERE is_read = false;

-- 5) فهرس لـ sitemap (جلب جميع المصوّرين المنشورين)
CREATE INDEX IF NOT EXISTS profiles_sitemap_idx
  ON profiles(username, updated_at)
  WHERE is_published = true AND deleted_at IS NULL;

-- 6) فهرس للحجوزات حسب المصوّرة (يُسرّع dashboard queries)
CREATE INDEX IF NOT EXISTS bookings_photographer_active_idx
  ON bookings(photographer_id, status, event_date)
  WHERE deleted_at IS NULL;

-- 7) دالة مساعدة لـ sitemap (تُعيد جميع المصوّرين النشطين + وقت التحديث)
CREATE OR REPLACE FUNCTION get_sitemap_photographers()
RETURNS TABLE(username text, updated_at timestamptz)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.username, GREATEST(p.updated_at, MAX(r.created_at)) AS updated_at
  FROM profiles p
  LEFT JOIN reviews r ON r.photographer_id = p.id AND r.is_published = true
  WHERE p.is_published = true
    AND p.deleted_at IS NULL
    AND p.username IS NOT NULL
  GROUP BY p.id, p.username, p.updated_at
  ORDER BY p.updated_at DESC;
$$;

GRANT EXECUTE ON FUNCTION get_sitemap_photographers() TO anon, authenticated;

COMMENT ON FUNCTION get_sitemap_photographers() IS 'تُستخدم لإنشاء sitemap.xml الديناميكي';
