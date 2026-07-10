
-- Revoke EXECUTE from PUBLIC (which cascades to anon) on functions that must never
-- be called anonymously. Grant back to authenticated where the app needs it.

REVOKE EXECUTE ON FUNCTION public.restore_photographer(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.soft_delete_photographer(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.delete_photographer_cascade(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_set_published(uuid, boolean) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_renew_subscription(uuid, integer) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.approve_review(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.reject_review(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.cancel_booking(uuid, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.soft_delete_booking(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.regenerate_booking_token(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.seed_default_shot_list(uuid, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.seed_default_whatsapp_templates(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.renew_subscription_paid(uuid, integer, numeric, text, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.refresh_featured_photographers() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_subscription_active(uuid) FROM PUBLIC, anon;

-- Grant back to authenticated where signed-in users need to trigger the function.
GRANT EXECUTE ON FUNCTION public.seed_default_shot_list(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.seed_default_whatsapp_templates(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_booking(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.soft_delete_booking(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.regenerate_booking_token(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.restore_photographer(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.soft_delete_photographer(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_photographer_cascade(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_published(uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_renew_subscription(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_review(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_review(uuid) TO authenticated;
