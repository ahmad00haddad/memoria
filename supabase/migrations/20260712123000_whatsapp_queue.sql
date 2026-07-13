-- =====================================================================
-- Migration: Phase 3 Notification Queue (WhatsApp)
-- Description: Creates the whatsapp_log table to ensure reliability
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.whatsapp_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  photographer_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  recipient_phone text NOT NULL,
  template_name text NOT NULL,
  payload jsonb NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  error_message text,
  retry_count int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.whatsapp_log ENABLE ROW LEVEL SECURITY;

-- Service role bypasses RLS anyway, but explicitly defined for clarity
CREATE POLICY "service_role_manage_whatsapp_log" ON public.whatsapp_log 
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "admin_manage_whatsapp_log" ON public.whatsapp_log 
  FOR ALL 
  USING (public.has_role(auth.uid(), 'admin')) 
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Only the owner can view their own logs
CREATE POLICY "owner_view_whatsapp_log" ON public.whatsapp_log 
  FOR SELECT TO authenticated 
  USING (photographer_id = auth.uid());

CREATE INDEX idx_whatsapp_log_status ON public.whatsapp_log(status);
CREATE INDEX idx_whatsapp_log_created_at ON public.whatsapp_log(created_at);

CREATE TRIGGER update_whatsapp_log_updated_at
  BEFORE UPDATE ON public.whatsapp_log
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
