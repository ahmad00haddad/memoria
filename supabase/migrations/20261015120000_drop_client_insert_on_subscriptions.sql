-- Subscriptions are activated only by server code (service role) or admins.
-- Clients could previously insert their own payment rows (any status) and,
-- if no subscription row existed, their own subscription. Both removed.
-- Subscription rows for new photographers are still created by the
-- SECURITY DEFINER signup trigger.
DROP POLICY IF EXISTS "owner insert payment" ON public.subscription_payments;
DROP POLICY IF EXISTS "system insert subscription" ON public.subscriptions;
