-- New accounts (e.g. Google sign-up creates the profile instantly) must not be public
-- until onboarding finishes; onboarding.tsx sets is_published = true at the end.
ALTER TABLE public.profiles ALTER COLUMN is_published SET DEFAULT false;

-- Hide existing empty accounts: never finished onboarding and have no package.
UPDATE public.profiles p
SET is_published = false
WHERE p.is_published
  AND p.onboarding_completed_at IS NULL
  AND NOT COALESCE(p.is_demo, false)
  AND NOT EXISTS (SELECT 1 FROM public.pricing_rules r WHERE r.photographer_id = p.id);
