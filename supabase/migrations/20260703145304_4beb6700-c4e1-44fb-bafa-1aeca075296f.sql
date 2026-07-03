ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS onboarding_step SMALLINT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS quickstart_dismissed_at TIMESTAMPTZ;

-- Mark existing photographers who already have pricing rules as completed
UPDATE public.profiles p
SET onboarding_completed_at = COALESCE(p.onboarding_completed_at, now()),
    onboarding_step = 999
WHERE onboarding_completed_at IS NULL
  AND EXISTS (SELECT 1 FROM public.pricing_rules pr WHERE pr.photographer_id = p.id);