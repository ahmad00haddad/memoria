
-- REVOKE anon EXECUTE on sensitive SECURITY DEFINER functions.
-- Each function still validates the caller internally (has_role, auth.uid()),
-- but removing anon EXECUTE closes the "anyone can invoke and probe" surface.

REVOKE EXECUTE ON FUNCTION public.soft_delete_photographer(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.restore_photographer(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.delete_photographer_cascade(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_set_published(uuid, boolean) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_renew_subscription(uuid, integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.approve_review(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.reject_review(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.cancel_booking(uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.soft_delete_booking(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.regenerate_booking_token(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.seed_default_shot_list(uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.seed_default_whatsapp_templates(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.log_audit(text, text, uuid, jsonb, jsonb) FROM anon;
REVOKE EXECUTE ON FUNCTION public.renew_subscription_paid(uuid, integer, numeric, text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.refresh_featured_photographers() FROM anon;
REVOKE EXECUTE ON FUNCTION public.confirm_booking_deposit_paid(uuid, text, text, text) FROM anon;
