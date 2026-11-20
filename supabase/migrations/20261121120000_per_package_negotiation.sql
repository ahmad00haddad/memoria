-- التفاوض لكل باقة: المصوّرة تفعّله لباقات معينة، وأقل سعر اختياري ومخفي عن العروس.
BEGIN;

ALTER TABLE public.pricing_rules ADD COLUMN IF NOT EXISTS allow_negotiation boolean NOT NULL DEFAULT false;

-- أقل سعر في جدول خاص (pricing_rules مقروء للعامة، فلا يوضع الحد فيه)
CREATE TABLE IF NOT EXISTS public.pricing_rule_floors (
  rule_id uuid PRIMARY KEY REFERENCES public.pricing_rules(id) ON DELETE CASCADE,
  photographer_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  min_offer_price numeric NOT NULL CHECK (min_offer_price > 0 AND min_offer_price < 1000000)
);
ALTER TABLE public.pricing_rule_floors ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.pricing_rule_floors FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pricing_rule_floors TO authenticated;
GRANT ALL ON public.pricing_rule_floors TO service_role;
DROP POLICY IF EXISTS "owner manage floors" ON public.pricing_rule_floors;
CREATE POLICY "owner manage floors" ON public.pricing_rule_floors
  FOR ALL TO authenticated
  USING (auth.uid() = photographer_id)
  WITH CHECK (auth.uid() = photographer_id
    AND EXISTS (SELECT 1 FROM public.pricing_rules r WHERE r.id = rule_id AND r.photographer_id = auth.uid()));

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
                   allow_negotiation
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

COMMIT;
