
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS referral_code text UNIQUE DEFAULT substr(replace(gen_random_uuid()::text,'-',''),1,8),
  ADD COLUMN IF NOT EXISTS referred_by uuid,
  ADD COLUMN IF NOT EXISTS is_featured boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id uuid NOT NULL,
  referred_id uuid NOT NULL UNIQUE,
  reward_granted boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "referrer or referred read"
  ON public.referrals FOR SELECT
  USING (auth.uid() = referrer_id OR auth.uid() = referred_id);

CREATE POLICY "system insert referral"
  ON public.referrals FOR INSERT
  WITH CHECK (auth.uid() = referred_id);

-- when a confirmed booking happens, auto-feature top photographers (simple: avg rating >= 4.5 with >= 3 reviews)
CREATE OR REPLACE FUNCTION public.refresh_featured_photographers()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.profiles p
  SET is_featured = sub.featured
  FROM (
    SELECT pr.id,
      COALESCE(AVG(r.rating), 0) >= 4.5 AND COUNT(r.id) >= 3 AS featured
    FROM public.profiles pr
    LEFT JOIN public.reviews r ON r.photographer_id = pr.id AND r.is_published = true
    GROUP BY pr.id
  ) sub
  WHERE p.id = sub.id AND p.is_featured IS DISTINCT FROM sub.featured;
$$;
