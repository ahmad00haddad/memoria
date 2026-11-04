-- قرار أحمد (2026-11-04): لا إلغاء تلقائي لأن العروس لم ترفع الإيصال.
-- المصوّرة ترى التحويل في حسابها وتؤكّده، أو تلغي بنفسها لتفتح التاريخ.
-- يبقى: حذف الطلبات غير المؤكَّدة برمز الهاتف بعد ساعتين، وإلغاء الطلب إن لم ترد المصوّرة خلال 24 ساعة.
CREATE OR REPLACE FUNCTION public.expire_unpaid_bookings()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_unverified integer; v_unapproved integer;
BEGIN
  UPDATE public.bookings
     SET deleted_at = now(), updated_at = now()
   WHERE phone_verified_at IS NULL
     AND deleted_at IS NULL
     AND created_at < now() - interval '2 hours';
  GET DIAGNOSTICS v_unverified = ROW_COUNT;

  UPDATE public.bookings
     SET status = 'cancelled',
         cancelled_at = now(),
         cancellation_reason = 'المصوّرة لم تردّ على الطلب خلال 24 ساعة، فأُلغي تلقائياً',
         auto_cancel_kind = 'approval_timeout',
         refund_amount = 0, refund_status = 'none',
         updated_at = now()
   WHERE status IN ('quote', 'pending_deposit')
     AND deleted_at IS NULL
     AND needs_approval AND approved_at IS NULL
     AND phone_verified_at IS NOT NULL
     AND phone_verified_at < now() - interval '24 hours';
  GET DIAGNOSTICS v_unapproved = ROW_COUNT;
  RETURN v_unverified + v_unapproved;
END; $$;
REVOKE ALL ON FUNCTION public.expire_unpaid_bookings() FROM PUBLIC, anon, authenticated;
