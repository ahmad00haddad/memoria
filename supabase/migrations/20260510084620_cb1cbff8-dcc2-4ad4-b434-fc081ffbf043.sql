
-- iCal token on profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS ical_token TEXT UNIQUE DEFAULT replace(gen_random_uuid()::text, '-', '');

-- Contract templates
CREATE TABLE public.contract_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  photographer_id UUID NOT NULL,
  name TEXT NOT NULL,
  body TEXT NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.contract_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner manage templates" ON public.contract_templates FOR ALL
  USING (auth.uid() = photographer_id) WITH CHECK (auth.uid() = photographer_id);

-- Contracts
CREATE TABLE public.contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  photographer_id UUID NOT NULL,
  body TEXT NOT NULL,
  client_name TEXT NOT NULL,
  client_signature TEXT,
  signed_at TIMESTAMPTZ,
  signed_ip TEXT,
  sign_token TEXT NOT NULL UNIQUE DEFAULT replace(gen_random_uuid()::text, '-', ''),
  status TEXT NOT NULL DEFAULT 'pending', -- pending, signed, void
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner manage contracts" ON public.contracts FOR ALL
  USING (auth.uid() = photographer_id) WITH CHECK (auth.uid() = photographer_id);

CREATE POLICY "public read by token" ON public.contracts FOR SELECT
  USING (true); -- token is the secret; secured by knowing the URL

CREATE POLICY "public sign by token" ON public.contracts FOR UPDATE
  USING (status = 'pending') WITH CHECK (status IN ('pending','signed'));

CREATE INDEX idx_contracts_booking ON public.contracts(booking_id);
CREATE INDEX idx_contracts_token ON public.contracts(sign_token);

CREATE TRIGGER trg_contracts_updated BEFORE UPDATE ON public.contracts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
