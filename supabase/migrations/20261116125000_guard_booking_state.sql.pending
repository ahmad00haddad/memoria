-- Phase 7 half B (LOGIC_FIX_PLAN 2026-11-16): لا تغيير مباشر لحالة الحجز ومراحله من متصفح المصوّرة.
-- لا تُطبَّق قبل نشر نصف الكود (كل الكتابات على هذه الأعمدة صارت عبر دوال الخادم / service_role)
-- وقبل التحقق من: تأكيد العربون، كل مراحل الإنتاج للأمام والخلف، الإغلاق، الدفعة النهائية.
BEGIN;

CREATE OR REPLACE FUNCTION public.guard_booking_direct_updates()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF current_user <> 'authenticated' THEN RETURN NEW; END IF;
  IF public.has_role(auth.uid(), 'admin') THEN RETURN NEW; END IF;

  IF NEW.client_tracking_token  IS DISTINCT FROM OLD.client_tracking_token
  OR NEW.client_received_at     IS DISTINCT FROM OLD.client_received_at
  OR NEW.package_snapshot       IS DISTINCT FROM OLD.package_snapshot
  OR NEW.privacy_level          IS DISTINCT FROM OLD.privacy_level
  OR NEW.photographer_can_publish IS DISTINCT FROM OLD.photographer_can_publish
  OR NEW.phone_verified_at      IS DISTINCT FROM OLD.phone_verified_at
  OR NEW.verified_via           IS DISTINCT FROM OLD.verified_via
  OR NEW.needs_approval         IS DISTINCT FROM OLD.needs_approval
  OR NEW.approved_at            IS DISTINCT FROM OLD.approved_at
  OR NEW.deposit_terms_accepted_at IS DISTINCT FROM OLD.deposit_terms_accepted_at
  OR NEW.refund_policy_agreed   IS DISTINCT FROM OLD.refund_policy_agreed
  OR NEW.refund_percent_agreed  IS DISTINCT FROM OLD.refund_percent_agreed
  OR NEW.refund_amount          IS DISTINCT FROM OLD.refund_amount
  OR NEW.refund_status          IS DISTINCT FROM OLD.refund_status
  OR NEW.cancelled_by           IS DISTINCT FROM OLD.cancelled_by
  OR NEW.cancelled_at           IS DISTINCT FROM OLD.cancelled_at
  OR NEW.cancellation_reason    IS DISTINCT FROM OLD.cancellation_reason
  OR NEW.deleted_at             IS DISTINCT FROM OLD.deleted_at
  OR NEW.photographer_id        IS DISTINCT FROM OLD.photographer_id
  OR NEW.client_name            IS DISTINCT FROM OLD.client_name
  OR NEW.client_email           IS DISTINCT FROM OLD.client_email
  OR NEW.client_phone           IS DISTINCT FROM OLD.client_phone
  OR NEW.event_date             IS DISTINCT FROM OLD.event_date
  OR NEW.start_time             IS DISTINCT FROM OLD.start_time
  OR NEW.end_time               IS DISTINCT FROM OLD.end_time
  OR NEW.base_price             IS DISTINCT FROM OLD.base_price
  OR NEW.total_price            IS DISTINCT FROM OLD.total_price
  OR NEW.deposit_amount         IS DISTINCT FROM OLD.deposit_amount
  OR NEW.addons                 IS DISTINCT FROM OLD.addons
  OR NEW.photos_promised        IS DISTINCT FROM OLD.photos_promised
  OR NEW.delivery_days_promised IS DISTINCT FROM OLD.delivery_days_promised
  OR NEW.delivery_due_at        IS DISTINCT FROM OLD.delivery_due_at
  OR NEW.overtime_fee_per_hour  IS DISTINCT FROM OLD.overtime_fee_per_hour
  OR NEW.deposit_sent_at        IS DISTINCT FROM OLD.deposit_sent_at
  OR NEW.deposit_proof_url      IS DISTINCT FROM OLD.deposit_proof_url
  -- Phase 7: حالة الحجز ومراحله وتواريخ الدفع/التسليم
  OR NEW.status                 IS DISTINCT FROM OLD.status
  OR NEW.production_stage       IS DISTINCT FROM OLD.production_stage
  OR NEW.delivered_at           IS DISTINCT FROM OLD.delivered_at
  OR NEW.deposit_confirmed_at   IS DISTINCT FROM OLD.deposit_confirmed_at
  OR NEW.final_paid_at          IS DISTINCT FROM OLD.final_paid_at
  OR NEW.editing_started_at     IS DISTINCT FROM OLD.editing_started_at
  OR NEW.editing_completed_at   IS DISTINCT FROM OLD.editing_completed_at
  THEN
    RAISE EXCEPTION 'PROTECTED_BOOKING_FIELD' USING ERRCODE = '42501';
  END IF;

  -- الإلغاء له مسار واحد (cancel_booking) — يبقى احتياطاً
  IF NEW.status = 'cancelled' AND OLD.status IS DISTINCT FROM 'cancelled' THEN
    RAISE EXCEPTION 'USE_CANCEL_BOOKING' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

COMMIT;
