
DROP VIEW IF EXISTS public.profiles_public;
DROP VIEW IF EXISTS public.unavailability_public;

-- Restore the public read policy on profiles (filters by is_published or owner)
DROP POLICY IF EXISTS "profiles owner read" ON public.profiles;
CREATE POLICY "profiles public read" ON public.profiles
  FOR SELECT USING ((is_published = true) OR (auth.uid() = id));

-- Restore the public read policy on photographer_unavailability
CREATE POLICY "unavail public read" ON public.photographer_unavailability
  FOR SELECT USING (true);

-- Hide sensitive columns from anonymous visitors
REVOKE SELECT (ical_token, referral_code) ON public.profiles FROM anon;
REVOKE SELECT (reason) ON public.photographer_unavailability FROM anon;

-- Lock down the helper functions
REVOKE EXECUTE ON FUNCTION public.get_referrer_id(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_referrer_id(text) TO authenticated;
