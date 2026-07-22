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
REVOKE EXECUTE ON FUNCTION public.log_audit(text, json, json, text, text) FROM PUBLIC, anon, authenticated;

-- الدوال الإدارية:
REVOKE EXECUTE ON FUNCTION public.admin_renew_subscription(integer, uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_set_published(uuid, boolean) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.delete_photographer_cascade(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.restore_photographer(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.approve_review(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.reject_review(uuid) FROM PUBLIC, anon, authenticated;

-- دوال حيوية أخرى (يجب أن تُحمى إذا كانت SECURITY DEFINER):
-- (بعض الدوال مثل client_* يجب أن تبقى متاحة لـ anon لأن العميل غير مسجل)
-- REVOKE EXECUTE ON FUNCTION public.create_booking_guarded(json) FROM PUBLIC, anon; -- تحتاج إلى مراجعة قبل السحب
