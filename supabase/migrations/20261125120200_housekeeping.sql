-- PROPOSED (not applied). Small, safe housekeeping.
BEGIN;

-- 1) rate_limits grows forever today (no purge found in any migration)
CREATE EXTENSION IF NOT EXISTS pg_cron;
DO $$ BEGIN PERFORM cron.unschedule('purge-rate-limits'); EXCEPTION WHEN OTHERS THEN NULL; END $$;
SELECT cron.schedule('purge-rate-limits', '17 3 * * *',
  $q$DELETE FROM public.rate_limits WHERE created_at < now() - interval '2 days'$q$);

-- 2) indexes for per-request lookups used by submitBookingRequest and recoverTrackingLinks
CREATE INDEX IF NOT EXISTS bookings_client_phone_idx
  ON public.bookings (client_phone, event_date) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS bookings_client_email_lower_idx
  ON public.bookings (lower(client_email)) WHERE deleted_at IS NULL;

-- 3) one referral per referred user.
--    FIRST check for duplicates (must return 0 rows), otherwise this fails:
--      SELECT referred_id, count(*) FROM public.referrals GROUP BY 1 HAVING count(*) > 1;
CREATE UNIQUE INDEX IF NOT EXISTS referrals_referred_id_key ON public.referrals (referred_id);

COMMIT;

-- ROLLBACK:
--   BEGIN;
--   SELECT cron.unschedule('purge-rate-limits');
--   DROP INDEX IF EXISTS public.bookings_client_phone_idx;
--   DROP INDEX IF EXISTS public.bookings_client_email_lower_idx;
--   DROP INDEX IF EXISTS public.referrals_referred_id_key;
--   COMMIT;
