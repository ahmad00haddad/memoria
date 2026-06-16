GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_subscription_active(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_photographer_busy_dates(uuid) TO anon, authenticated;

GRANT SELECT ON public.profiles TO anon, authenticated;
GRANT INSERT, UPDATE ON public.profiles TO authenticated;

GRANT SELECT ON public.pricing_rules TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.pricing_rules TO authenticated;

GRANT SELECT ON public.reviews TO anon, authenticated;
GRANT INSERT, UPDATE ON public.reviews TO authenticated;

GRANT SELECT, INSERT, UPDATE ON public.bookings TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.notifications TO authenticated;
GRANT SELECT ON public.subscriptions TO authenticated;
GRANT SELECT ON public.photographer_unavailability TO anon, authenticated;