
-- 1. notifications.type
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS type text NOT NULL DEFAULT 'general';

-- 2. email_log.sent_at
ALTER TABLE public.email_log ADD COLUMN IF NOT EXISTS sent_at timestamptz;
UPDATE public.email_log SET sent_at = created_at WHERE sent_at IS NULL;

-- 3. booking_disputes table
CREATE TABLE IF NOT EXISTS public.booking_disputes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  raised_by uuid NOT NULL,
  raised_by_role text NOT NULL CHECK (raised_by_role IN ('client','photographer','admin')),
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','under_review','resolved','dismissed')),
  resolution text,
  resolved_at timestamptz,
  resolved_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.booking_disputes TO authenticated;
GRANT ALL ON public.booking_disputes TO service_role;

ALTER TABLE public.booking_disputes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins manage disputes" ON public.booking_disputes
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "participants view own disputes" ON public.booking_disputes
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = booking_id
        AND (b.photographer_id = auth.uid() OR b.client_user_id = auth.uid())
    )
  );

CREATE POLICY "participants raise dispute" ON public.booking_disputes
  FOR INSERT TO authenticated
  WITH CHECK (
    raised_by = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = booking_id
        AND (b.photographer_id = auth.uid() OR b.client_user_id = auth.uid())
    )
  );

CREATE INDEX IF NOT EXISTS booking_disputes_booking_idx ON public.booking_disputes(booking_id);
CREATE INDEX IF NOT EXISTS booking_disputes_status_idx ON public.booking_disputes(status);

CREATE TRIGGER update_booking_disputes_updated_at
  BEFORE UPDATE ON public.booking_disputes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
