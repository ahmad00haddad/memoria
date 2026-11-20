-- تدقيق المنطق 2026-11-20 (الجولة 5): حدود منطقية لأرقام تكتبها المصوّرة من المتصفح مباشرة.
-- بدونها: نسبة استرداد 500% تجعل الاسترداد أكبر من العربون، أيام تسليم سالبة تجعل الحجز «متأخراً» قبل العرس،
-- رسوم ساعة إضافية سالبة تظهر للعروس. NOT VALID: تحمي كل كتابة جديدة دون أن تفشل على صفوف قديمة.
BEGIN;

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_refund_percent_range;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_refund_percent_range
  CHECK (deposit_refund_percent IS NULL OR deposit_refund_percent BETWEEN 0 AND 100) NOT VALID;

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_min_session_range;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_min_session_range
  CHECK (min_session_minutes BETWEEN 0 AND 1440) NOT VALID;

ALTER TABLE public.pricing_rules DROP CONSTRAINT IF EXISTS pricing_rules_numbers_sane;
ALTER TABLE public.pricing_rules ADD CONSTRAINT pricing_rules_numbers_sane
  CHECK (
        (hours IS NULL OR hours BETWEEN 0 AND 24)
    AND (deliverable_count IS NULL OR deliverable_count >= 0)
    AND (delivery_days IS NULL OR delivery_days BETWEEN 0 AND 365)
    AND (overtime_fee IS NULL OR overtime_fee >= 0)
    AND (revision_rounds IS NULL OR revision_rounds >= 0)
  ) NOT VALID;

COMMIT;
