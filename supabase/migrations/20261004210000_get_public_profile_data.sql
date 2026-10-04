-- src/lib/profile.functions.ts calls this RPC, but no migration ever created it,
-- so every public photographer page showed no packages, reviews or busy dates
-- and the booking form had nothing to book. Returns only public-safe fields,
-- and only for published profiles.

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
      FROM (SELECT id, service, package, label, price, per_photo_price, description
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
              AND status IN ('confirmed', 'pending_deposit')) b), '[]'::jsonb),
    'completedCount', (
      SELECT count(*) FROM bookings
      WHERE photographer_id = p_id AND deleted_at IS NULL AND status = 'completed')
  ) END;
$$;

REVOKE ALL ON FUNCTION public.get_public_profile_data(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_profile_data(uuid) TO anon, authenticated;
