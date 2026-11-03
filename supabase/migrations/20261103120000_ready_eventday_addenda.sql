-- تأكيد المصوّرة قبل المناسبة + استمارة يوم العرس + ملاحق الاتفاق
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS ready_confirmed_at timestamptz,
  ADD COLUMN IF NOT EXISTS event_day_info jsonb;

CREATE TABLE IF NOT EXISTS public.booking_addenda (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  description text NOT NULL CHECK (length(description) BETWEEN 2 AND 1000),
  amount numeric NOT NULL DEFAULT 0 CHECK (amount >= 0 AND amount <= 100000),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','declined','withdrawn')),
  created_at timestamptz NOT NULL DEFAULT now(),
  responded_at timestamptz
);
CREATE INDEX IF NOT EXISTS booking_addenda_booking_idx ON public.booking_addenda(booking_id);

ALTER TABLE public.booking_addenda ENABLE ROW LEVEL SECURITY;
-- المصوّرة تقرأ ملاحق حجوزاتها فقط؛ الكتابة كلها عبر دوال الخادم (service role)
DROP POLICY IF EXISTS "photographer reads own addenda" ON public.booking_addenda;
CREATE POLICY "photographer reads own addenda" ON public.booking_addenda
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.bookings b WHERE b.id = booking_id AND b.photographer_id = auth.uid()));
GRANT SELECT ON public.booking_addenda TO authenticated;
