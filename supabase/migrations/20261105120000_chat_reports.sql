-- بلاغ إساءة من داخل محادثة الحجز (العروس عن المصوّرة، أو المصوّرة عن العروس) — نفس جدول بلاغات الصفحات
ALTER TABLE public.profile_reports
  ADD COLUMN IF NOT EXISTS booking_id uuid REFERENCES public.bookings(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reporter_role text NOT NULL DEFAULT 'visitor' CHECK (reporter_role IN ('visitor','bride','photographer'));

ALTER TABLE public.profile_reports DROP CONSTRAINT IF EXISTS profile_reports_reason_check;
ALTER TABLE public.profile_reports
  ADD CONSTRAINT profile_reports_reason_check CHECK (reason IN ('impersonation','scam','stolen_photos','chat_abuse','other'));
