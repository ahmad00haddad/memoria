-- =============================================================================
-- 20260623120000_phase6_enhancements.sql
-- تحسينات Phase 6: دوال مساعدة + فهارس إضافية + قيود جديدة
-- =============================================================================

-- 1) حقل delivery_due_at محسوب تلقائياً إن لم يُحدَّد يدوياً
-- يُعيّن تلقائياً بعد 7 أيام من يوم الفعالية
CREATE OR REPLACE FUNCTION set_default_delivery_due()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.delivery_due_at IS NULL AND NEW.event_date IS NOT NULL THEN
    NEW.delivery_due_at := (NEW.event_date::date + INTERVAL '7 days')::timestamptz;
  END IF;
  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'bookings_default_delivery_due'
  ) THEN
    CREATE TRIGGER bookings_default_delivery_due
      BEFORE INSERT OR UPDATE OF event_date ON bookings
      FOR EACH ROW
      EXECUTE FUNCTION set_default_delivery_due();
  END IF;
END $$;

-- 2) دالة لجلب إحصاءات المصوّر بشكل فعّال (تُستخدم في dashboard.reports)
CREATE OR REPLACE FUNCTION get_photographer_stats(_photographer_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'total_bookings',     COUNT(*),
    'confirmed',          COUNT(*) FILTER (WHERE status = 'confirmed'),
    'completed',          COUNT(*) FILTER (WHERE status = 'completed'),
    'pending',            COUNT(*) FILTER (WHERE status IN ('pending_deposit', 'quote')),
    'cancelled',          COUNT(*) FILTER (WHERE status = 'cancelled'),
    'total_revenue',      COALESCE(SUM(total_price) FILTER (WHERE status IN ('confirmed','completed')), 0),
    'avg_ticket',         COALESCE(AVG(total_price) FILTER (WHERE status IN ('confirmed','completed')), 0),
    'pending_deposits',   COALESCE(SUM(deposit_amount) FILTER (WHERE status = 'pending_deposit'), 0),
    'overdue_deliveries', COUNT(*) FILTER (
      WHERE delivery_due_at < now()
        AND production_stage NOT IN ('delivered')
        AND status = 'confirmed'
    )
  )
  FROM bookings
  WHERE photographer_id = _photographer_id
    AND deleted_at IS NULL;
$$;

GRANT EXECUTE ON FUNCTION get_photographer_stats(uuid) TO authenticated;

-- 3) دالة لجلب قائمة الحجوزات المحسوبة بكفاءة (تحلّ محل N+1 queries)
CREATE OR REPLACE FUNCTION get_bookings_with_contract(_photographer_id uuid)
RETURNS TABLE(
  booking_id        uuid,
  client_name       text,
  client_email      text,
  client_phone      text,
  event_date        date,
  start_time        time,
  end_time          time,
  status            text,
  production_stage  text,
  total_price       numeric,
  deposit_amount    numeric,
  deposit_confirmed_at timestamptz,
  delivery_due_at   timestamptz,
  has_contract      boolean,
  created_at        timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    b.id,
    b.client_name,
    b.client_email,
    b.client_phone,
    b.event_date,
    b.start_time,
    b.end_time,
    b.status,
    b.production_stage,
    b.total_price,
    b.deposit_amount,
    b.deposit_confirmed_at,
    b.delivery_due_at,
    EXISTS(SELECT 1 FROM contracts c WHERE c.booking_id = b.id) AS has_contract,
    b.created_at
  FROM bookings b
  WHERE b.photographer_id = _photographer_id
    AND b.deleted_at IS NULL
  ORDER BY
    CASE b.status
      WHEN 'confirmed' THEN 1
      WHEN 'pending_deposit' THEN 2
      WHEN 'quote' THEN 3
      WHEN 'completed' THEN 4
      ELSE 5
    END,
    b.event_date ASC NULLS LAST;
$$;

GRANT EXECUTE ON FUNCTION get_bookings_with_contract(uuid) TO authenticated;

-- 4) إنشاء جدول push_subscriptions لـ PWA Push Notifications
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint        text        NOT NULL,
  p256dh_key      text        NOT NULL,
  auth_key        text        NOT NULL,
  user_agent      text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  last_used_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, endpoint)
);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own_push_subs" ON push_subscriptions
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS push_subs_user_idx ON push_subscriptions(user_id);

-- 5) تحسين فهرس الحجوزات للتقويم
CREATE INDEX IF NOT EXISTS bookings_calendar_idx
  ON bookings(photographer_id, event_date, status)
  WHERE deleted_at IS NULL AND status NOT IN ('cancelled');

COMMENT ON TABLE push_subscriptions IS 'اشتراكات Push Notifications للـ PWA';
COMMENT ON FUNCTION get_photographer_stats(uuid) IS 'إحصاءات المصوّر الشاملة — تُستخدم في dashboard.reports';
