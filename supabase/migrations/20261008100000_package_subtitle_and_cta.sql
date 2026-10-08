-- Optional per-package copy shown on the public package card:
--   subtitle  — one line under the name ("مثالية للحفلات العائلية الأنيقة")
--   cta_label — the package's own button text ("احجزي الباقة الذهبية")
ALTER TABLE public.pricing_rules
  ADD COLUMN IF NOT EXISTS subtitle text CHECK (char_length(subtitle) <= 120),
  ADD COLUMN IF NOT EXISTS cta_label text CHECK (char_length(cta_label) <= 40);

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
      FROM (SELECT id, service, package, label, price, per_photo_price, description, subtitle, cta_label
            FROM pricing_rules WHERE photographer_id = p_id) pr), '[]'::jsonb),
    'reviews', COALESCE((
      SELECT jsonb_agg(to_jsonb(r) ORDER BY r.created_at DESC)
      FROM (SELECT id, client_name, rating, comment, created_at
            FROM reviews WHERE photographer_id = p_id AND is_published) r), '[]'::jsonb),
    'unavail', COALESCE((
      SELECT jsonb_agg(d) FROM get_photographer_busy_dates(p_id) d), '[]'::jsonb),
    'bookedSlots', COALESCE((
      SELECT jsonb_agg(to_jsonb(b))
      FROM (SELECT event_date, start_time, end_time FROM bookings
            WHERE photographer_id = p_id AND deleted_at IS NULL
              AND event_date >= CURRENT_DATE
              AND booking_holds_slot(status, created_at, deposit_sent_at, phone_verified_at)) b), '[]'::jsonb),
    'completedCount', (
      SELECT count(*) FROM bookings
      WHERE photographer_id = p_id AND deleted_at IS NULL AND status = 'completed')
  ) END;
$$;
REVOKE ALL ON FUNCTION public.get_public_profile_data(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_profile_data(uuid) TO anon, authenticated;
