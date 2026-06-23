-- =============================================================================
-- 20260623100000_production_server_fns.sql
-- إضافة حقول مرحلة الإنتاج على جدول bookings + تحسين audit_logs
-- ملاحظة: shot_list_items موجود مسبقاً في migration 20260615104045
-- =============================================================================

-- 1) إضافة حقول مرحلة الإنتاج إن لم تكن موجودة بالفعل
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS editing_started_at   timestamptz,
  ADD COLUMN IF NOT EXISTS editing_completed_at  timestamptz,
  ADD COLUMN IF NOT EXISTS final_paid_amount     numeric(10,3),
  ADD COLUMN IF NOT EXISTS selection_link        text,
  ADD COLUMN IF NOT EXISTS delivery_due_at       timestamptz;

-- 2) تحسين audit_logs — إضافة indexes للأداء
CREATE INDEX IF NOT EXISTS audit_logs_entity_idx
  ON audit_logs(entity_type, entity_id);

CREATE INDEX IF NOT EXISTS audit_logs_actor_idx
  ON audit_logs(actor_id);

-- 3) subscription_payments — إضافة session_id unique constraint إن لم يكن موجوداً
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'subscription_payments'
      AND column_name = 'session_id'
  ) THEN
    ALTER TABLE subscription_payments ADD COLUMN IF NOT EXISTS session_id text;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'subscription_payments'
      AND indexname = 'subscription_payments_session_id_key'
  ) THEN
    CREATE UNIQUE INDEX IF NOT EXISTS subscription_payments_session_id_key
      ON subscription_payments(session_id)
      WHERE session_id IS NOT NULL;
  END IF;
END $$;

-- إضافة أعمدة للتتبع في subscription_payments
ALTER TABLE subscription_payments
  ADD COLUMN IF NOT EXISTS months   integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS currency text    NOT NULL DEFAULT 'JOD';

-- 4) إضافة refund_status و refund_amount إن لم تكن موجودة
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS refund_amount  numeric(10,3),
  ADD COLUMN IF NOT EXISTS refund_status  text CHECK (refund_status IN ('pending','refunded','none')),
  ADD COLUMN IF NOT EXISTS cancelled_by   text,
  ADD COLUMN IF NOT EXISTS cancelled_at   timestamptz,
  ADD COLUMN IF NOT EXISTS cancellation_reason text;

COMMENT ON COLUMN bookings.selection_link IS 'رابط اختيار الصور (تُرسله المصوّرة للعميل)';
COMMENT ON COLUMN bookings.delivery_due_at IS 'الموعد المتوقع لتسليم الصور';
