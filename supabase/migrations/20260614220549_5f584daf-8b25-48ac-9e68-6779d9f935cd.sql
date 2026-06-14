
-- ============================================================
-- Phase 6: Security hardening — lock down SECURITY DEFINER fns
-- and tighten public storage bucket listing.
-- ============================================================

-- 1) Revoke EXECUTE on all SECURITY DEFINER functions from anon/authenticated/public.
--    service_role always retains access (bypasses grants); trigger and RLS-policy
--    callers run with definer privileges and don't need EXECUTE either.
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_subscription_active(uuid) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.refresh_featured_photographers() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_referrer_id(text) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.set_booking_delivery_due() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.notify_message_recipient() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.delete_photographer_cascade(uuid) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.admin_set_published(uuid, boolean) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.client_mark_received(text) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_booking_by_token(text) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.ensure_photographer_private_row() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.admin_renew_subscription(uuid, integer) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.client_add_note(text, text) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.client_mark_deposit_sent(text, text, text, text) FROM anon, authenticated, PUBLIC;

-- get_photographer_busy_dates is needed by the public profile page (anon caller)
-- to render the calendar; keep it callable but restrict to the safe set of roles.
REVOKE EXECUTE ON FUNCTION public.get_photographer_busy_dates(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_photographer_busy_dates(uuid) TO anon, authenticated;

-- 2) Remove broad listing on the avatars bucket. Public URL serving via
--    /object/public/* does NOT require this SELECT policy, so direct
--    image viewing still works; only file enumeration is removed.
DROP POLICY IF EXISTS "avatars public read" ON storage.objects;
