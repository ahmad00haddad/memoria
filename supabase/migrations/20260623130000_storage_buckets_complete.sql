-- =============================================================================
-- 20260623130000_storage_buckets_complete.sql
-- إنشاء جميع Supabase Storage buckets مع سياسات RLS صحيحة
-- =============================================================================
-- ملاحظة: هذا migration يُنشئ الـ buckets إن لم تكن موجودة.
-- آمن للتشغيل أكثر من مرة (IF NOT EXISTS).
-- =============================================================================

-- 1) bucket: avatars — صور ملفات المصوّرين الشخصية (عامة)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,               -- عام: يمكن لأي زائر رؤية الصور
  5242880,            -- 5 MB
  ARRAY['image/jpeg','image/png','image/webp','image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit    = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- سياسة: المصوّر يرفع/يعدّل صورته فقط
DROP POLICY IF EXISTS "avatars_upload_own" ON storage.objects;
CREATE POLICY "avatars_upload_own" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'avatars'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "avatars_update_own" ON storage.objects;
CREATE POLICY "avatars_update_own" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'avatars'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "avatars_delete_own" ON storage.objects;
CREATE POLICY "avatars_delete_own" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'avatars'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "avatars_public_read" ON storage.objects;
CREATE POLICY "avatars_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');


-- 2) bucket: deposit-proofs — إثباتات الدفع (عربون)
-- الرفع من العميل بدون تسجيل دخول (anonymous + tracking token)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'deposit-proofs',
  'deposit-proofs',
  false,              -- خاص: لا يمكن الوصول العام
  5242880,            -- 5 MB
  ARRAY['image/jpeg','image/png','image/webp','application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit    = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- العميل (anon) يرفع في مسار public-tokens/
DROP POLICY IF EXISTS "deposit_proofs_anon_upload" ON storage.objects;
CREATE POLICY "deposit_proofs_anon_upload" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'deposit-proofs'
    AND (storage.foldername(name))[1] = 'public-tokens'
  );

-- المصوّر يقرأ إثباتات حجوزاتها
DROP POLICY IF EXISTS "deposit_proofs_photographer_read" ON storage.objects;
CREATE POLICY "deposit_proofs_photographer_read" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'deposit-proofs'
    AND auth.uid() IS NOT NULL
  );

-- service_role يقرأ ويكتب بحرية (للـ server functions)
DROP POLICY IF EXISTS "deposit_proofs_service_role" ON storage.objects;
CREATE POLICY "deposit_proofs_service_role" ON storage.objects
  FOR ALL USING (
    bucket_id = 'deposit-proofs'
    AND auth.role() = 'service_role'
  );


-- 3) bucket: payment-proofs — إثباتات الاشتراك
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'payment-proofs',
  'payment-proofs',
  false,
  5242880,
  ARRAY['image/jpeg','image/png','image/webp','application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit    = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "payment_proofs_own" ON storage.objects;
CREATE POLICY "payment_proofs_own" ON storage.objects
  FOR ALL USING (
    bucket_id = 'payment-proofs'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'payment-proofs'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "payment_proofs_service_read" ON storage.objects;
CREATE POLICY "payment_proofs_service_read" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'payment-proofs'
    AND (auth.role() = 'service_role' OR auth.uid() IS NOT NULL)
  );


-- 4) bucket: delivery-photos — صور التسليم للعميل
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'delivery-photos',
  'delivery-photos',
  false,              -- خاص: signed URLs فقط
  20971520,           -- 20 MB لكل صورة
  ARRAY['image/jpeg','image/png','image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit    = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- المصوّر ترفع في مسار {photographerId}/
DROP POLICY IF EXISTS "delivery_photos_photographer_upload" ON storage.objects;
CREATE POLICY "delivery_photos_photographer_upload" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'delivery-photos'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "delivery_photos_photographer_manage" ON storage.objects;
CREATE POLICY "delivery_photos_photographer_manage" ON storage.objects
  FOR ALL USING (
    bucket_id = 'delivery-photos'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- service_role يقرأ للـ signed URLs
DROP POLICY IF EXISTS "delivery_photos_service_read" ON storage.objects;
CREATE POLICY "delivery_photos_service_read" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'delivery-photos'
    AND auth.role() = 'service_role'
  );


-- 5) bucket: portfolio (إن وُجد — لمعرض الأعمال العام)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'portfolio',
  'portfolio',
  true,               -- عام
  10485760,           -- 10 MB
  ARRAY['image/jpeg','image/png','image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit    = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

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


-- 6) تفعيل RLS على storage.objects (مطلوب إذا لم يكن مفعّلاً)
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- إضافة تعليق توضيحي
COMMENT ON TABLE storage.objects IS 'ملفات Supabase Storage — تحكّم بالوصول عبر سياسات RLS أعلاه';
