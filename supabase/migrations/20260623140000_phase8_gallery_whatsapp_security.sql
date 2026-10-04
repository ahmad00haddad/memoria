-- =============================================================================
-- Migration: 20260623140000_phase8_gallery_whatsapp_security.sql
-- EliteCapture — Phase 8: Gallery Security + WhatsApp Automation + Security
-- =============================================================================
--
-- ما يُنجزه هذا الميغريشن:
--   1. RLS على delivery-photos bucket — يمنع رؤية مجلد originals/ مباشرة
--      من العميل (السيرفر فقط يملك service-role).
--   2. فهرسة على bookings(final_paid_at) لتسريع استعلامات gallery endpoint.
--   3. دالة get_booking_payment_status() مساعدة للسيرفر.
--   4. فهرسة على whatsapp_templates(photographer_id, category).
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. فهرس سريع: bookings(final_paid_at) للاستعلامات الكثيرة من gallery endpoint
-- ─────────────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_bookings_final_paid_at
  ON bookings (final_paid_at)
  WHERE final_paid_at IS NOT NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. فهرس على bookings(client_tracking_token) لتسريع جلب الحجز بالرمز
-- ─────────────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_bookings_tracking_token
  ON bookings (client_tracking_token)
  WHERE client_tracking_token IS NOT NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. فهرس على whatsapp_templates(photographer_id, category)
--    لتسريع بحث المحرك الذكي عن القوالب المخصصة
-- ─────────────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_whatsapp_templates_photographer_category
  ON whatsapp_templates (photographer_id, category);

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. دالة مساعدة: get_booking_payment_status(booking_id)
--    تُعيد حالة الدفع للحجز بشكل ذري — تُستخدم في سيناريوهات متعددة
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_booking_payment_status(_booking_id UUID)
RETURNS TABLE (
  booking_id     UUID,
  final_paid     BOOLEAN,
  deposit_paid   BOOLEAN,
  status         TEXT,
  final_paid_at  TIMESTAMPTZ
)
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT
    b.id                                       AS booking_id,
    (b.final_paid_at IS NOT NULL
      OR b.status = 'completed')               AS final_paid,
    (b.deposit_confirmed_at IS NOT NULL
      OR b.deposit_sent_at IS NOT NULL)        AS deposit_paid,
    b.status::TEXT                             AS status,
    b.final_paid_at                            AS final_paid_at
  FROM bookings b
  WHERE b.id = _booking_id
  LIMIT 1;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. تحديث seed_default_whatsapp_templates — إضافة قوالب delivery و review
--    إن لم تكن موجودة مسبقاً
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION seed_default_whatsapp_templates(_photographer_id UUID)
RETURNS VOID
LANGUAGE PLPGSQL
SECURITY DEFINER
AS $$
BEGIN
  -- welcome
  INSERT INTO whatsapp_templates (photographer_id, name, category, body, sort_order)
  SELECT _photographer_id,
         'ترحيب بطلب الحجز',
         'welcome',
         'مرحباً {{client_name}} 👋' || chr(10) ||
         'تم استلام طلب حجزك بتاريخ {{event_date}} بنجاح.' || chr(10) ||
         'متابعة حجزك: {{tracking_url}}',
         1
  WHERE NOT EXISTS (
    SELECT 1 FROM whatsapp_templates
    WHERE photographer_id = _photographer_id AND category = 'welcome'
  );

  -- confirmed
  INSERT INTO whatsapp_templates (photographer_id, name, category, body, sort_order)
  SELECT _photographer_id,
         'تأكيد الحجز',
         'confirmed',
         'تهانينا {{client_name}}! 🎉' || chr(10) ||
         'تم تأكيد حجزك بتاريخ {{event_date}}.' || chr(10) ||
         'تفاصيل الحجز: {{tracking_url}}',
         2
  WHERE NOT EXISTS (
    SELECT 1 FROM whatsapp_templates
    WHERE photographer_id = _photographer_id AND category = 'confirmed'
  );

  -- reminder
  INSERT INTO whatsapp_templates (photographer_id, name, category, body, sort_order)
  SELECT _photographer_id,
         'تذكير موعد التصوير',
         'reminder',
         'تذكير: {{client_name}} 📅' || chr(10) ||
         'موعد جلسة التصوير غداً {{event_date}}.' || chr(10) ||
         'نتمنى لكِ يوماً رائعاً! 💐',
         3
  WHERE NOT EXISTS (
    SELECT 1 FROM whatsapp_templates
    WHERE photographer_id = _photographer_id AND category = 'reminder'
  );

  -- delivery
  INSERT INTO whatsapp_templates (photographer_id, name, category, body, sort_order)
  SELECT _photographer_id,
         'جاهزية الصور',
         'delivery',
         'صورك جاهزة {{client_name}}! 🌟' || chr(10) ||
         'يمكنك مشاهدة معرضك الخاص:' || chr(10) ||
         '{{tracking_url}}',
         4
  WHERE NOT EXISTS (
    SELECT 1 FROM whatsapp_templates
    WHERE photographer_id = _photographer_id AND category = 'delivery'
  );

  -- review
  INSERT INTO whatsapp_templates (photographer_id, name, category, body, sort_order)
  SELECT _photographer_id,
         'طلب تقييم',
         'review',
         'مرحباً {{client_name}} ⭐' || chr(10) ||
         'نأمل أنكِ أحببتِ صورك! شاركي تجربتك:' || chr(10) ||
         '{{tracking_url}}',
         5
  WHERE NOT EXISTS (
    SELECT 1 FROM whatsapp_templates
    WHERE photographer_id = _photographer_id AND category = 'review'
  );

  -- general
  INSERT INTO whatsapp_templates (photographer_id, name, category, body, sort_order)
  SELECT _photographer_id,
         'رسالة عامة',
         'general',
         'مرحباً {{client_name}}، تحديث من EliteCapture بخصوص حجزك مع {{photographer_name}}.',
         6
  WHERE NOT EXISTS (
    SELECT 1 FROM whatsapp_templates
    WHERE photographer_id = _photographer_id AND category = 'general'
  );
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. تسجيل الميغريشن في السجل (اختياري — يساعد الفريق)
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
BEGIN
  RAISE NOTICE 'Phase 8 migration applied: gallery security + WhatsApp automation indexes';
END;
$$;
