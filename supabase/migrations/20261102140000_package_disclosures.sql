-- Required package disclosures, so nothing about a package is a surprise later:
-- shooting hours, edited photos (or film minutes for video), delivery days, who
-- actually shoots, overtime price, what is NOT included, whether unedited photos
-- come too, and free editing rounds. The bride sees them before she sends a
-- request, and the booking keeps a frozen copy (package_snapshot) of the package
-- as it was at request time, so later edits by the photographer don't change it.

ALTER TABLE public.pricing_rules
  ADD COLUMN IF NOT EXISTS hours numeric,
  ADD COLUMN IF NOT EXISTS deliverable_count integer,
  ADD COLUMN IF NOT EXISTS delivery_days integer,
  ADD COLUMN IF NOT EXISTS shooter text,
  ADD COLUMN IF NOT EXISTS overtime_fee numeric,
  ADD COLUMN IF NOT EXISTS excludes text,
  ADD COLUMN IF NOT EXISTS unedited_included boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS revision_rounds integer;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'pricing_rules_shooter_check') THEN
    ALTER TABLE public.pricing_rules ADD CONSTRAINT pricing_rules_shooter_check
      CHECK (shooter IS NULL OR shooter IN ('me', 'me_team', 'team'));
  END IF;
END $$;

ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS package_snapshot jsonb;

-- Public profile: packages now carry their disclosures --------------------------
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
            FROM pricing_rules WHERE photographer_id = p_id) pr), '[]'::jsonb),
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

-- Tracking page: the frozen package and the promises taken from it ------------
CREATE OR REPLACE FUNCTION public.get_booking_by_token(_token text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v jsonb;
  v_status text;
  v_expired boolean;
BEGIN
  SELECT
    jsonb_build_object(
      'id', b.id, 'status', b.status, 'production_stage', b.production_stage,
      'event_date', b.event_date, 'start_time', b.start_time, 'end_time', b.end_time,
      'service', b.service, 'venue_address', b.venue_address,
      'base_price', b.base_price, 'total_price', b.total_price, 'deposit_amount', b.deposit_amount,
      'deposit_sent_at', b.deposit_sent_at, 'deposit_confirmed_at', b.deposit_confirmed_at,
      'deposit_checkout_session_id', b.deposit_checkout_session_id,
      'deposit_terms_accepted_at', b.deposit_terms_accepted_at,
      'final_paid_at', b.final_paid_at,
      'delivered_at', b.delivered_at, 'client_received_at', b.client_received_at,
      'cancelled_at', b.cancelled_at, 'cancellation_reason', b.cancellation_reason,
      'auto_cancel_kind', b.auto_cancel_kind,
      'refund_amount', b.refund_amount, 'refund_status', b.refund_status,
      'client_notes', b.client_notes, 'client_name', b.client_name, 'addons', b.addons,
      'token_expires_at', b.token_expires_at,
      'created_at', b.created_at,
      'sneak_peek_url', b.sneak_peek_url,
      'needs_approval', b.needs_approval,
      'package_snapshot', b.package_snapshot,
      'photos_promised', b.photos_promised,
      'delivery_days_promised', b.delivery_days_promised,
      'delivery_due_at', b.delivery_due_at,
      'overtime_fee_per_hour', b.overtime_fee_per_hour,
      'approved_at', b.approved_at,
      'approval_due_at', CASE WHEN b.needs_approval AND b.approved_at IS NULL AND b.phone_verified_at IS NOT NULL
                              THEN b.phone_verified_at + interval '24 hours' END,
      'deposit_due_at', CASE WHEN (NOT b.needs_approval OR b.approved_at IS NOT NULL)
                              THEN COALESCE(b.approved_at, b.created_at) + interval '48 hours' END,
      'photographer', jsonb_build_object(
        'display_name', p.display_name, 'username', p.username,
        'whatsapp', CASE WHEN NOT COALESCE(b.needs_approval, false) OR b.approved_at IS NOT NULL THEN pp.whatsapp END,
        'phone', CASE WHEN NOT COALESCE(b.needs_approval, false) OR b.approved_at IS NOT NULL THEN pp.phone END,
        'deposit_refund_policy', COALESCE(p.deposit_refund_policy, 'none'),
        'deposit_refund_percent', p.deposit_refund_percent,
        'cliq_alias', CASE
          WHEN b.status IN ('confirmed','completed')
            OR (b.deposit_amount > 0 AND (NOT b.needs_approval OR b.approved_at IS NOT NULL))
          THEN pp.cliq_alias ELSE NULL END,
        'payment_methods', CASE
          WHEN b.status IN ('confirmed','completed')
            OR (b.deposit_amount > 0 AND (NOT b.needs_approval OR b.approved_at IS NOT NULL))
          THEN COALESCE(pp.payment_methods, '[]'::jsonb) ELSE '[]'::jsonb END,
        'bank_info', CASE
          WHEN b.status IN ('confirmed','completed')
            OR (b.deposit_amount > 0 AND (NOT b.needs_approval OR b.approved_at IS NOT NULL))
          THEN pp.bank_info ELSE NULL END,
        'avatar_url', p.avatar_url
      )
    ) INTO v
  FROM public.bookings b
  JOIN public.profiles p ON p.id = b.photographer_id
  LEFT JOIN public.photographer_private pp ON pp.user_id = p.id
  WHERE b.client_tracking_token = _token AND b.deleted_at IS NULL;

  IF v IS NULL THEN
    RETURN NULL;
  END IF;

  v_status := v->>'status';
  v_expired := (v->>'token_expires_at') IS NOT NULL AND (v->>'token_expires_at')::timestamptz < now();

  IF v_status = 'cancelled' AND v_expired THEN
    RETURN NULL;
  END IF;

  RETURN v;
END;
$function$;
GRANT EXECUTE ON FUNCTION public.get_booking_by_token(text) TO anon, authenticated;
