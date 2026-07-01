-- =====================================================================
-- Trust & Operations: Photographer verification + Notification preferences
--                    + Contract auto-generation + SEO structured data
-- =====================================================================
-- مستوحى من التقرير التنفيذي الشامل (أقسام 2.4، 10.2، 10.5، 10.14، 13.2)
--
-- يضيف:
--   1) نظام التحقق من المصوّرات (verification_status) — ثقة ومصداقية.
--   2) تفضيلات الإشعارات (notification_preferences JSONB) — تحكّم تشغيلي.
--   3) توليد العقد تلقائياً عند تأكيد الحجز — جانب قانوني.
--   4) أعمدة SEO على profiles (seo_title, seo_description) — نمو عضوي.
--   5) جدول booking_disputes — معالجة النزاعات.
-- =====================================================================

-- 1) نظام التحقق من المصوّرات -----------------------------------------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS verification_status text NOT NULL DEFAULT 'unverified',
  ADD COLUMN IF NOT EXISTS verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS verified_by uuid;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_verification_status_check') THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_verification_status_check
      CHECK (verification_status IN ('unverified', 'pending_review', 'verified', 'rejected'));
  END IF;
END $$;

-- دالة الأدمن للتحقق من المصوّرة
CREATE OR REPLACE FUNCTION public.admin_verify_photographer(_photographer_id uuid, _status text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF _status NOT IN ('verified', 'rejected', 'pending_review') THEN
    RAISE EXCEPTION 'invalid status';
  END IF;
  UPDATE public.profiles SET
    verification_status = _status,
    verified_at = CASE WHEN _status = 'verified' THEN now() ELSE verified_at END,
    verified_by = auth.uid(),
    updated_at = now()
  WHERE id = _photographer_id;
  PERFORM public.log_audit('profile.verification', 'profile', _photographer_id::text, NULL,
                           jsonb_build_object('verification_status', _status));
END;
$$;

REVOKE ALL ON FUNCTION public.admin_verify_photographer(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_verify_photographer(uuid, text) TO authenticated;

-- 2) تفضيلات الإشعارات ------------------------------------------------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS notification_preferences jsonb NOT NULL DEFAULT
    '{"booking_new": true, "booking_confirmed": true, "booking_cancelled": true,
      "deposit_received": true, "message_new": true, "review_new": true,
      "subscription_expiring": true, "event_reminder": true,
      "marketing": false}'::jsonb;

-- 3) أعمدة SEO على profiles -------------------------------------------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS seo_title text,
  ADD COLUMN IF NOT EXISTS seo_description text;

-- 4) جدول النزاعات (Booking Disputes) --------------------------------
CREATE TABLE IF NOT EXISTS public.booking_disputes (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id      uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  raised_by       uuid NOT NULL,
  raised_by_role  text NOT NULL CHECK (raised_by_role IN ('client', 'photographer', 'admin')),
  reason          text NOT NULL,
  status          text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'under_review', 'resolved', 'dismissed')),
  resolution      text,
  resolved_by     uuid,
  resolved_at     timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.booking_disputes ENABLE ROW LEVEL SECURITY;

-- المصوّرة تقرأ نزاعات حجوزاتها.
CREATE POLICY "photographer read own disputes"
  ON public.booking_disputes FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.bookings b WHERE b.id = booking_disputes.booking_id AND b.photographer_id = auth.uid())
  );

-- الأدمن يقرأ ويدير كل النزاعات.
CREATE POLICY "admin manage all disputes"
  ON public.booking_disputes FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- الإدراج يكون عبر service-role فقط (من server fn).
REVOKE ALL ON public.booking_disputes FROM anon;

-- 5) توليد العقد تلقائياً عند تأكيد الحجز ------------------------------
CREATE OR REPLACE FUNCTION public.auto_generate_contract(_booking_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_bk       public.bookings%ROWTYPE;
  v_template public.contract_templates%ROWTYPE;
  v_contract uuid;
  v_body     text;
BEGIN
  SELECT * INTO v_bk FROM public.bookings WHERE id = _booking_id AND deleted_at IS NULL;
  IF NOT FOUND THEN RAISE EXCEPTION 'BOOKING_NOT_FOUND'; END IF;

  -- ابحث عن قالب افتراضي للمصوّرة.
  SELECT * INTO v_template
  FROM public.contract_templates
  WHERE photographer_id = v_bk.photographer_id AND is_default = true
  LIMIT 1;

  -- إن لم يوجد قالب افتراضي، خذ أي قالب للمصوّرة.
  IF NOT FOUND THEN
    SELECT * INTO v_template
    FROM public.contract_templates
    WHERE photographer_id = v_bk.photographer_id
    ORDER BY created_at DESC LIMIT 1;
  END IF;

  -- إن لم يوجد أي قالب، لا تنشئ عقداً (لا خطأ — العقد اختياري).
  IF NOT FOUND THEN RETURN NULL; END IF;

  -- استبدل المتغيّرات في القالب.
  v_body := v_template.body;
  v_body := replace(v_body, '{{client_name}}', COALESCE(v_bk.client_name, ''));
  v_body := replace(v_body, '{{event_date}}', COALESCE(v_bk.event_date::text, ''));
  v_body := replace(v_body, '{{start_time}}', COALESCE(v_bk.start_time::text, ''));
  v_body := replace(v_body, '{{end_time}}', COALESCE(v_bk.end_time::text, ''));
  v_body := replace(v_body, '{{venue_address}}', COALESCE(v_bk.venue_address, ''));
  v_body := replace(v_body, '{{total_price}}', COALESCE(v_bk.total_price::text, '0'));
  v_body := replace(v_body, '{{deposit_amount}}', COALESCE(v_bk.deposit_amount::text, '0'));
  v_body := replace(v_body, '{{service}}', COALESCE(v_bk.service::text, ''));

  -- أنشئ العقد.
  INSERT INTO public.contracts (
    booking_id, photographer_id, client_name, body, signing_token
  ) VALUES (
    v_bk.id, v_bk.photographer_id, v_bk.client_name, v_body,
    encode(gen_random_bytes(32), 'hex')
  )
  RETURNING id INTO v_contract;

  PERFORM public.log_audit('contract.auto_generate', 'contract', v_contract::text, NULL,
                           jsonb_build_object('booking_id', _booking_id));

  RETURN v_contract;
END;
$$;

REVOKE ALL ON FUNCTION public.auto_generate_contract(uuid) FROM PUBLIC, anon, authenticated;