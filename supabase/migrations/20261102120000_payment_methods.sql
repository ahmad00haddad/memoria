-- Deposit methods: CliQ (alias + linked bank/wallet + name as shown on transfer),
-- e-wallets (Zain Cash, Orange Money, ...) and bank transfer (bank, holder, IBAN).
-- Stored as a list on photographer_private; the tracking page shows it only after
-- the photographer approves (same gate as cliq_alias). cliq_alias / bank_info stay
-- in sync from the app for older readers.

ALTER TABLE public.photographer_private
  ADD COLUMN IF NOT EXISTS payment_methods jsonb NOT NULL DEFAULT '[]'::jsonb;

-- Backfill: existing CliQ alias and free-text bank details become methods.
UPDATE public.photographer_private
SET payment_methods =
  (CASE WHEN NULLIF(btrim(cliq_alias), '') IS NOT NULL
        THEN jsonb_build_array(jsonb_build_object('kind', 'cliq', 'alias', btrim(cliq_alias)))
        ELSE '[]'::jsonb END)
  ||
  (CASE WHEN NULLIF(btrim(bank_info), '') IS NOT NULL
        THEN jsonb_build_array(jsonb_build_object('kind', 'bank', 'note', btrim(bank_info)))
        ELSE '[]'::jsonb END)
WHERE payment_methods = '[]'::jsonb;

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
