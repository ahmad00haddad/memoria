-- Phase 1 (LOGIC_FIX_PLAN 2026-11-16): إغلاق دوال وسياسات مكشوفة
BEGIN;

-- 1.1 دوال SECURITY DEFINER بلا فحص هوية وبلا أي مستدعٍ في الكود
DROP FUNCTION IF EXISTS public.get_photographer_stats(uuid);
DROP FUNCTION IF EXISTS public.get_bookings_with_contract(uuid);
DROP FUNCTION IF EXISTS public.get_booking_payment_status(uuid);

-- 1.2 create_booking_guarded: السيرفر فقط (كل المستدعين يستخدمون supabaseAdmin)
REVOKE ALL ON FUNCTION public.create_booking_guarded(jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_booking_guarded(jsonb) TO service_role;

-- 1.3 client_mark_deposit_sent: السيرفر فقط
REVOKE ALL ON FUNCTION public.client_mark_deposit_sent(text, text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.client_mark_deposit_sent(text, text, text, text) TO service_role;

-- 1.4 المصوّرة لا تستطيع تزوير توقيع العروس عبر الطلب المباشر
CREATE OR REPLACE FUNCTION public.contracts_guard_direct_writes()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  -- نفس اختبار guard_booking_direct_updates: غير 'authenticated' = السيرفر/service_role/دوال definer
  IF current_user <> 'authenticated' THEN RETURN NEW; END IF;
  IF public.has_role(auth.uid(), 'admin') THEN RETURN NEW; END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.status IS DISTINCT FROM 'pending'
       OR NEW.client_signature IS NOT NULL
       OR NEW.signed_at IS NOT NULL
       OR NOT EXISTS (SELECT 1 FROM public.bookings b
                       WHERE b.id = NEW.booking_id AND b.photographer_id = auth.uid()) THEN
      RAISE EXCEPTION 'PROTECTED_CONTRACT_FIELD' USING ERRCODE = '42501';
    END IF;
  ELSE
    IF NEW.status           IS DISTINCT FROM OLD.status
       OR NEW.client_signature IS DISTINCT FROM OLD.client_signature
       OR NEW.client_name      IS DISTINCT FROM OLD.client_name
       OR NEW.signed_at        IS DISTINCT FROM OLD.signed_at THEN
      RAISE EXCEPTION 'PROTECTED_CONTRACT_FIELD' USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS aa_contracts_guard_direct_writes ON public.contracts;
CREATE TRIGGER aa_contracts_guard_direct_writes
  BEFORE INSERT OR UPDATE ON public.contracts
  FOR EACH ROW EXECUTE FUNCTION public.contracts_guard_direct_writes();

-- 1.5 لا إدراج مباشر في referrals (الكاتب الوحيد recordReferralAfterSignup عبر supabaseAdmin)
DROP POLICY IF EXISTS "system insert referral" ON public.referrals;

COMMIT;
