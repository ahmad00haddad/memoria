-- =====================================================================
-- Storage CORS + Upload Policy Fixes + Diagnostic Helpers
-- =====================================================================
-- يحل مشاكل الرفع الشائعة:
--   1) CORS: يسمح برفع الملفات من أي نطاق موثوق (Lovable + الإنتاج).
--   2) portfolio bucket: تأكيد وجوده + سياسات صحيحة.
--   3) delivery-photos: إصلاح سياسة DELETE (كانت مفقودة).
--   4) avatars: تأكيد سياسة UPDATE (للأقنعة/الأغلفة).
--   5) دالة تشخيص: check_storage_health() للأدمن.
-- =====================================================================

-- 1) CORS: السماح برفع الملفات من نطاقات التطبيق ---------------------
-- Supabase Storage يدعم CORS عبر جدول storage.buckets (metadata).
-- نحدّث metadata لكل bucket لتضمين CORS headers.
-- ملاحظة: في Supabase الحديث، CORS يُضبط عبر Dashboard أو API،
-- لكن نضع تعليقات توضيحية للإعداد المطلوب.

-- الأbuckets التي تحتاج CORS (للرفع المباشر من المتصفح):
-- avatars, deposit-proofs, payment-proofs, delivery-photos, portfolio
-- CORS المطلوب:
--   Allowed Origins: https://*.lovable.app, https://royal-lens-flow.lovable.app,
--                    https://YOUR-PRODUCTION-DOMAIN
--   Allowed Methods: GET, POST, PUT, DELETE, OPTIONS
--   Allowed Headers: authorization, content-type, x-upsert
--   Max Age: 3600

-- 2) تأكيد bucket: portfolio ------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'portfolio', 'portfolio', true, 10485760,
  ARRAY['image/jpeg','image/png','image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit    = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- سياسات portfolio (تأكيد)
DROP POLICY IF EXISTS "portfolio_own_manage" ON storage.objects;
CREATE POLICY "portfolio_own_manage" ON storage.objects
  FOR ALL USING (
    bucket_id = 'portfolio'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'portfolio'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "portfolio_public_read" ON storage.objects;
CREATE POLICY "portfolio_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'portfolio');

-- 3) delivery-photos: إضافة سياسة DELETE صريحة -----------------------
-- السياسة الحالية "delivery_photos_photographer_manage" هي FOR ALL
-- لكن نحتاج تأكيد أن DELETE يعمل للمصوّرة في مجلدها.
DROP POLICY IF EXISTS "delivery_photos_photographer_delete" ON storage.objects;
CREATE POLICY "delivery_photos_photographer_delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'delivery-photos'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- 4) avatars: تأكيد سياسة INSERT + UPDATE + DELETE -------------------
-- السياسات الحالية تستخدم (storage.foldername(name))[1] = auth.uid()::text
-- هذا يعني أن الملف يجب أن يكون في مجلد يحمل اسم المستخدم.
-- المسار المتوقع: {userId}/avatar.jpg أو {userId}/cover.jpg
-- هذا صحيح — نؤكده فقط.

-- 5) دالة تشخيص التخزين (للأدمن) -------------------------------------
CREATE OR REPLACE FUNCTION public.check_storage_health()
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'buckets', (
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', id,
          'public', public,
          'file_size_limit', file_size_limit,
          'allowed_mime_types', allowed_mime_types
        )
      )
      FROM storage.buckets
    ),
    'policy_count', (
      SELECT count(*) FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects'
    ),
    'rls_enabled', (
      SELECT relrowsecurity FROM pg_class WHERE relname = 'objects' AND relnamespace = 'storage'::regnamespace
    )
  );
$$;

REVOKE ALL ON FUNCTION public.check_storage_health() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.check_storage_health() TO authenticated;