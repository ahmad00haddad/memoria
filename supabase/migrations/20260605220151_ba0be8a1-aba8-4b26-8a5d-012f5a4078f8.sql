
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS delivery_due_at date,
  ADD COLUMN IF NOT EXISTS delivery_days_promised integer DEFAULT 30,
  ADD COLUMN IF NOT EXISTS photos_promised integer,
  ADD COLUMN IF NOT EXISTS overtime_fee_per_hour numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS final_paid_at timestamptz,
  ADD COLUMN IF NOT EXISTS final_paid_amount numeric,
  ADD COLUMN IF NOT EXISTS privacy_level text NOT NULL DEFAULT 'public' CHECK (privacy_level IN ('public','no_publish','private_only')),
  ADD COLUMN IF NOT EXISTS photographer_can_publish boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS delivered_at timestamptz;

-- حساب تاريخ التسليم تلقائيًا عند الإنشاء أو التعديل
CREATE OR REPLACE FUNCTION public.set_booking_delivery_due()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.delivery_due_at IS NULL AND NEW.event_date IS NOT NULL THEN
    NEW.delivery_due_at := NEW.event_date + (COALESCE(NEW.delivery_days_promised, 30) || ' days')::interval;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS booking_set_delivery_due ON public.bookings;
CREATE TRIGGER booking_set_delivery_due
BEFORE INSERT OR UPDATE OF event_date, delivery_days_promised
ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public.set_booking_delivery_due();
