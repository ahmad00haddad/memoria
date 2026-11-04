-- حماية من حساب مخترق: أي تغيير على طرق استلام العربون يُسجَّل، والـ cron يرسل إيميلاً للمصوّرة.
-- الـ trigger بقاعدة البيانات حتى لا يتجاوزه أحد بتعديل مباشر من المتصفح.
CREATE TABLE IF NOT EXISTS public.payment_change_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  old_methods jsonb,
  new_methods jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  notified_at timestamptz
);
CREATE INDEX IF NOT EXISTS payment_change_events_pending_idx ON public.payment_change_events(created_at) WHERE notified_at IS NULL;
ALTER TABLE public.payment_change_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.payment_change_events FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.log_payment_method_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- أول إعداد (لا طرق سابقة) ليس تغييراً يستدعي تنبيهاً
  IF COALESCE(jsonb_array_length(CASE WHEN jsonb_typeof(OLD.payment_methods) = 'array' THEN OLD.payment_methods END), 0) = 0 THEN
    RETURN NEW;
  END IF;
  IF NEW.payment_methods IS DISTINCT FROM OLD.payment_methods THEN
    INSERT INTO public.payment_change_events (user_id, old_methods, new_methods)
    VALUES (NEW.user_id, OLD.payment_methods, NEW.payment_methods);
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_log_payment_method_change ON public.photographer_private;
CREATE TRIGGER trg_log_payment_method_change
  AFTER UPDATE ON public.photographer_private
  FOR EACH ROW EXECUTE FUNCTION public.log_payment_method_change();
