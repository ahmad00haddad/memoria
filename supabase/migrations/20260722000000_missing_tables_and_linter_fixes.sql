-- ===========================================================================
-- Migration: إضافة الجداول المفقودة + إصلاح تحذيرات Supabase Linter
-- ===========================================================================

-- 1. جدول rate_limits (مستخدم في payments.functions.ts لمنع إساءة الاستخدام)
CREATE TABLE IF NOT EXISTS public.rate_limits (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  token text NOT NULL,
  action text NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;
-- لا يُسمح بالوصول المباشر — تُستخدم فقط عبر service_role
CREATE POLICY "rate_limits_service_only" ON public.rate_limits
  FOR ALL USING (false);

-- فهرس لتسريع استعلامات الـ rate limiting
CREATE INDEX IF NOT EXISTS idx_rate_limits_token_action_created
  ON public.rate_limits (token, action, created_at DESC);

-- تنظيف تلقائي (اختياري): حذف السجلات الأقدم من ساعة
-- يمكن تفعيل هذا عبر pg_cron إذا لزم الأمر

-- 2. جدول whatsapp_log (مستخدم في whatsapp.server.ts لتسجيل الإشعارات)
CREATE TABLE IF NOT EXISTS public.whatsapp_log (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  photographer_id uuid NOT NULL,
  recipient_phone text NOT NULL,
  template_name text NOT NULL,
  payload jsonb DEFAULT '{}'::jsonb,
  status text DEFAULT 'pending' NOT NULL,
  error_message text,
  created_at timestamptz DEFAULT now() NOT NULL
);
ALTER TABLE public.whatsapp_log ENABLE ROW LEVEL SECURITY;
-- يُستخدم عبر service_role فقط
CREATE POLICY "whatsapp_log_service_only" ON public.whatsapp_log
  FOR ALL USING (false);

-- فهرس لاستعلامات المصورة
CREATE INDEX IF NOT EXISTS idx_whatsapp_log_photographer
  ON public.whatsapp_log (photographer_id, created_at DESC);

-- 3. إضافة عمود reference_type في payment_events (إذا لم يكن موجوداً)
DO $$ BEGIN
  ALTER TABLE public.payment_events ADD COLUMN reference_type text;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;
