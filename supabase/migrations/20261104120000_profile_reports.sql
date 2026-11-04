-- بلاغات عن صفحات المصوّرات (انتحال، احتيال، صور ليست لها) — تُقرأ وتُكتب عبر دوال الخادم فقط
CREATE TABLE IF NOT EXISTS public.profile_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  photographer_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reason text NOT NULL CHECK (reason IN ('impersonation','scam','stolen_photos','other')),
  details text NOT NULL CHECK (length(details) BETWEEN 5 AND 2000),
  reporter_name text CHECK (length(reporter_name) <= 120),
  reporter_contact text NOT NULL CHECK (length(reporter_contact) BETWEEN 5 AND 200),
  real_account_url text CHECK (length(real_account_url) <= 500),
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new','reviewing','closed')),
  admin_notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS profile_reports_status_idx ON public.profile_reports(status, created_at DESC);
ALTER TABLE public.profile_reports ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.profile_reports FROM anon, authenticated;
