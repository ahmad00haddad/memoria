
CREATE TABLE IF NOT EXISTS public.email_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template text NOT NULL,
  recipient text NOT NULL,
  subject text,
  related_booking_id uuid REFERENCES public.bookings(id) ON DELETE SET NULL,
  related_user_id uuid,
  status text NOT NULL DEFAULT 'pending',
  provider_id text,
  error text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS email_log_created_idx ON public.email_log (created_at DESC);
CREATE INDEX IF NOT EXISTS email_log_recipient_idx ON public.email_log (recipient);
CREATE INDEX IF NOT EXISTS email_log_template_idx ON public.email_log (template);
GRANT ALL ON public.email_log TO service_role;
ALTER TABLE public.email_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins_read_email_log" ON public.email_log
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
