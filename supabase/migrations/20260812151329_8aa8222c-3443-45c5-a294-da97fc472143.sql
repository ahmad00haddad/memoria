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
      'delivered_at', b.delivered_at, 'client_received_at', b.client_received_at,
      'cancelled_at', b.cancelled_at, 'cancellation_reason', b.cancellation_reason,
      'refund_amount', b.refund_amount, 'refund_status', b.refund_status,
      'client_notes', b.client_notes, 'client_name', b.client_name, 'addons', b.addons,
      'token_expires_at', b.token_expires_at,
      'photographer', jsonb_build_object(
        'display_name', p.display_name, 'username', p.username,
        'whatsapp', pp.whatsapp, 'phone', pp.phone,
        'cliq_alias', CASE 
          WHEN b.status IN ('confirmed','completed') OR b.deposit_amount > 0 
          THEN pp.cliq_alias ELSE NULL END,
        'bank_info', CASE 
          WHEN b.status IN ('confirmed','completed') OR b.deposit_amount > 0 
          THEN pp.bank_info ELSE NULL END,
        'fixed_deposit', p.fixed_deposit, 'avatar_url', p.avatar_url
      )
    ),
    b.status,
    (b.token_expires_at IS NOT NULL AND b.token_expires_at < now())
  INTO v, v_status, v_expired
  FROM public.bookings b
  JOIN public.profiles p ON p.id = b.photographer_id
  LEFT JOIN public.photographer_private pp ON pp.user_id = b.photographer_id
  WHERE b.client_tracking_token = _token
    AND b.deleted_at IS NULL;
  
  IF v IS NULL THEN
    RETURN NULL;
  END IF;
  
  IF v_expired THEN
    RETURN jsonb_build_object('expired', true, 'photographer', v->'photographer');
  END IF;
  
  RETURN v;
END;
$function$;