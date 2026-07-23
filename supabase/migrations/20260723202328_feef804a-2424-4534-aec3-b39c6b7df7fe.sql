-- Tighten SECURITY DEFINER function exposure & block payment_events writes
-- 1) Revoke execute on internal-only functions (should never be called by clients)
REVOKE EXECUTE ON FUNCTION public.log_audit(text, text, uuid, jsonb, jsonb) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.refresh_featured_photographers() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.renew_subscription_paid(uuid, integer, numeric, text, text) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_referrer_id(text) FROM anon, authenticated, PUBLIC;

-- 2) payment_events: RLS enabled with zero policies denies all Data API access, which is correct
--    (only supabaseAdmin/service_role writes via server routes). Add an explicit deny-all policy
--    to satisfy the linter and document intent.
DROP POLICY IF EXISTS "payment_events_deny_all" ON public.payment_events;
CREATE POLICY "payment_events_deny_all" ON public.payment_events
  AS RESTRICTIVE FOR ALL TO anon, authenticated
  USING (false) WITH CHECK (false);

-- 3) pg_net extension: keep in place but revoke default public access so anon cannot invoke http_* helpers
REVOKE ALL ON SCHEMA net FROM PUBLIC, anon, authenticated;