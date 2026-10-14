-- ============================================================================
-- Zbooni subscription payments (phase 1 — payment links + admin approval)
-- ----------------------------------------------------------------------------
-- * payment_method gains 'zbooni'.
-- * payment_reference: short code (MEM-XXXXXX) shown to the photographer and
--   used by the admin to match the payment in the Zbooni dashboard.
-- * payer_confirmed_at: set when the photographer says "I paid". Unconfirmed
--   zbooni rows are just opened checkouts and must not lock the subscription
--   page into "pending review".
-- Rows are written only by server functions (service role); the existing
-- owner-insert policy is left untouched for the legacy CliQ flow.
-- ============================================================================

ALTER TYPE public.payment_method ADD VALUE IF NOT EXISTS 'zbooni';

ALTER TABLE public.subscription_payments
  ADD COLUMN IF NOT EXISTS payment_reference text,
  ADD COLUMN IF NOT EXISTS payer_confirmed_at timestamptz;

CREATE UNIQUE INDEX IF NOT EXISTS subscription_payments_payment_reference_key
  ON public.subscription_payments (payment_reference)
  WHERE payment_reference IS NOT NULL;
