-- ===========================================================================
-- Migration: إصلاح تحذيرات Supabase Linter الأمنية
-- ===========================================================================

-- 1. نقل الإضافات (Extensions) إلى سكيما extensions لتجنب تلوث public
CREATE SCHEMA IF NOT EXISTS extensions;
-- افتراضياً Supabase يستخدم بعض الإضافات، ننقلها إن وجدت في public
DO $$ BEGIN
  ALTER EXTENSION "uuid-ossp" SET SCHEMA extensions;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
  ALTER EXTENSION "pgcrypto" SET SCHEMA extensions;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- 2. تأمين الجداول اليتيمة (التي قد تكون بدون RLS أو بدون Policies)
-- ضمان تفعيل RLS على كل الجداول الحساسة
ALTER TABLE IF EXISTS public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.booking_disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.contract_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.delivery_galleries ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.delivery_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.email_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.payment_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.photographer_private ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.photographer_unavailability ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.pricing_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.shot_list_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.subscription_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.whatsapp_templates ENABLE ROW LEVEL SECURITY;

-- 3. سحب الصلاحيات (REVOKE) من دوال الـ SECURITY DEFINER لتجنب استدعائها مباشرة
-- الدالة: log_audit (يجب أن تُستدعى من دوال أخرى أو service_role)
-- Revoke from every overload by name: the signatures previously listed here
-- did not match the real functions, which made the migration fail.
DO $$
DECLARE
  f regprocedure;
BEGIN
  FOR f IN
    SELECT p.oid::regprocedure
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN ('log_audit', 'admin_renew_subscription', 'admin_set_published',
                        'delete_photographer_cascade', 'restore_photographer',
                        'approve_review', 'reject_review')
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon, authenticated', f);
  END LOOP;
END $$;

-- دوال حيوية أخرى (يجب أن تُحمى إذا كانت SECURITY DEFINER):
-- (بعض الدوال مثل client_* يجب أن تبقى متاحة لـ anon لأن العميل غير مسجل)
-- REVOKE EXECUTE ON FUNCTION public.create_booking_guarded(json) FROM PUBLIC, anon; -- تحتاج إلى مراجعة قبل السحب
