-- Subscription status enum
CREATE TYPE public.subscription_status AS ENUM ('trial', 'active', 'pending_review', 'expired', 'canceled');
CREATE TYPE public.subscription_plan AS ENUM ('starter');
CREATE TYPE public.payment_method AS ENUM ('cliq', 'stripe');
CREATE TYPE public.payment_status AS ENUM ('pending', 'approved', 'rejected');

-- Subscriptions table
CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  photographer_id UUID NOT NULL UNIQUE,
  status subscription_status NOT NULL DEFAULT 'trial',
  plan subscription_plan NOT NULL DEFAULT 'starter',
  trial_ends_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '14 days'),
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner read subscription" ON public.subscriptions
  FOR SELECT USING (auth.uid() = photographer_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admin manage subscription" ON public.subscriptions
  FOR ALL USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "system insert subscription" ON public.subscriptions
  FOR INSERT WITH CHECK (auth.uid() = photographer_id);

-- Subscription payments
CREATE TABLE public.subscription_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  photographer_id UUID NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 9,
  currency TEXT NOT NULL DEFAULT 'USD',
  method payment_method NOT NULL,
  status payment_status NOT NULL DEFAULT 'pending',
  proof_url TEXT,
  cliq_reference TEXT,
  stripe_payment_intent_id TEXT,
  period_months INTEGER NOT NULL DEFAULT 1,
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.subscription_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner read payments" ON public.subscription_payments
  FOR SELECT USING (auth.uid() = photographer_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "owner insert payment" ON public.subscription_payments
  FOR INSERT WITH CHECK (auth.uid() = photographer_id);

CREATE POLICY "admin update payment" ON public.subscription_payments
  FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

-- Helper: check if subscription is active (trial or paid)
CREATE OR REPLACE FUNCTION public.is_subscription_active(_photographer_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.subscriptions
    WHERE photographer_id = _photographer_id
      AND (
        (status = 'trial' AND trial_ends_at > now())
        OR (status = 'active' AND (current_period_end IS NULL OR current_period_end > now()))
      )
  );
$$;

-- Auto-create trial subscription on photographer signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF (NEW.raw_user_meta_data->>'role') = 'photographer' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'photographer') ON CONFLICT DO NOTHING;
    INSERT INTO public.profiles (id, username, display_name)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || substr(NEW.id::text, 1, 8)),
      COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email)
    ) ON CONFLICT DO NOTHING;
    INSERT INTO public.subscriptions (photographer_id, status, trial_ends_at)
    VALUES (NEW.id, 'trial', now() + interval '14 days')
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

-- Ensure trigger exists on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Backfill trial subscriptions for existing photographers
INSERT INTO public.subscriptions (photographer_id, status, trial_ends_at)
SELECT ur.user_id, 'trial', now() + interval '14 days'
FROM public.user_roles ur
WHERE ur.role = 'photographer'
ON CONFLICT (photographer_id) DO NOTHING;

-- Storage bucket for payment proofs
INSERT INTO storage.buckets (id, name, public)
VALUES ('payment-proofs', 'payment-proofs', false)
ON CONFLICT DO NOTHING;

CREATE POLICY "owner upload proof" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'payment-proofs' AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "owner read own proof" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'payment-proofs' AND (
      auth.uid()::text = (storage.foldername(name))[1]
      OR public.has_role(auth.uid(), 'admin')
    )
  );