-- أنواع ملاحق الاتفاق: عام، مصوّرة بديلة (مرض/ظرف)، نقل الموعد (بدل الإلغاء)، تخفيض (مبلغ بالسالب)
ALTER TABLE public.booking_addenda
  ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'general' CHECK (kind IN ('general','substitute','reschedule','discount')),
  ADD COLUMN IF NOT EXISTS substitute_name text CHECK (length(substitute_name) <= 120),
  ADD COLUMN IF NOT EXISTS substitute_link text CHECK (length(substitute_link) <= 500),
  ADD COLUMN IF NOT EXISTS new_event_date date,
  ADD COLUMN IF NOT EXISTS new_start_time time,
  ADD COLUMN IF NOT EXISTS new_end_time time;

-- التخفيض يُخزَّن كمبلغ سالب
ALTER TABLE public.booking_addenda DROP CONSTRAINT IF EXISTS booking_addenda_amount_check;
ALTER TABLE public.booking_addenda
  ADD CONSTRAINT booking_addenda_amount_check CHECK (amount >= -100000 AND amount <= 100000);
