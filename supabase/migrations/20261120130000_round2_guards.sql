-- تدقيق المنطق 2026-11-20 (الجولة 2).
-- 1) سياسة "owner manage contracts" (FOR ALL) تسمح للمصوّرة بحذف عقد وقّعته العروس
-- (دليل الاتفاق). الحذف المباشر يقتصر على العقد غير الموقّع؛ الأدمن والخادم مستثنيان.
BEGIN;

CREATE OR REPLACE FUNCTION public.contracts_guard_signed_delete()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF current_user <> 'authenticated' THEN RETURN OLD; END IF;
  IF public.has_role(auth.uid(), 'admin') THEN RETURN OLD; END IF;
  IF OLD.status = 'signed' OR OLD.signed_at IS NOT NULL OR OLD.client_signature IS NOT NULL THEN
    RAISE EXCEPTION 'SIGNED_CONTRACT_LOCKED' USING ERRCODE = '42501';
  END IF;
  RETURN OLD;
END $$;

DROP TRIGGER IF EXISTS aa_contracts_guard_signed_delete ON public.contracts;
CREATE TRIGGER aa_contracts_guard_signed_delete
  BEFORE DELETE ON public.contracts
  FOR EACH ROW EXECUTE FUNCTION public.contracts_guard_signed_delete();

-- طرق الدفع (CliQ/بنك) لا تظهر في صفحة متابعة حجز ملغى: كانت تظهر لأي حجز معتمد فيه عربون مهما كانت حالته
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
      'delivery_link', b.delivery_link,
      'selection_link', b.selection_link,
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
            OR (b.status IN ('quote', 'pending_deposit') AND b.deposit_amount > 0 AND (NOT b.needs_approval OR b.approved_at IS NOT NULL))
          THEN pp.cliq_alias ELSE NULL END,
        'payment_methods', CASE
          WHEN b.status IN ('confirmed','completed')
            OR (b.status IN ('quote', 'pending_deposit') AND b.deposit_amount > 0 AND (NOT b.needs_approval OR b.approved_at IS NOT NULL))
          THEN COALESCE(pp.payment_methods, '[]'::jsonb) ELSE '[]'::jsonb END,
        'bank_info', CASE
          WHEN b.status IN ('confirmed','completed')
            OR (b.status IN ('quote', 'pending_deposit') AND b.deposit_amount > 0 AND (NOT b.needs_approval OR b.approved_at IS NOT NULL))
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


COMMIT;
