-- ============================================================================
-- Basic / Pro subscription tiers
-- ----------------------------------------------------------------------------
-- * Prices (server side, src/lib/plans.ts): Basic 15/month · 180/year,
--   Pro 20/month · 200/year.
-- * subscriptions.tier: the tier the photographer last paid for. The free
--   trial is always full Pro (photographer_tier()).
-- * legacy_price_until: photographers who already paid before the new prices
--   keep Pro at the old price (7/month · 70/year) for a year.
-- * subscription_payments.tier: which tier the payment buys; applied on
--   approval (admin, PayTabs).
-- * Basic limits enforced here, not only in the UI: 3 main packages, 20 photos.
-- ============================================================================

ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS tier text NOT NULL DEFAULT 'pro' CHECK (tier IN ('basic', 'pro')),
  ADD COLUMN IF NOT EXISTS legacy_price_until timestamptz;

ALTER TABLE public.subscription_payments
  ADD COLUMN IF NOT EXISTS tier text CHECK (tier IN ('basic', 'pro'));

-- Current paying subscribers: old price, Pro features, for one year.
UPDATE public.subscriptions s
SET legacy_price_until = '2027-10-27T00:00:00Z'
WHERE s.legacy_price_until IS NULL
  AND EXISTS (
    SELECT 1 FROM public.subscription_payments p
    WHERE p.photographer_id = s.photographer_id AND p.status = 'approved'
  );

-- 'pro' during the trial or an active Pro period; 'basic' otherwise.
CREATE OR REPLACE FUNCTION public.photographer_tier(_pid uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE((
    SELECT CASE
      WHEN s.status = 'trial' AND s.trial_ends_at > now() THEN 'pro'
      WHEN s.status = 'active' AND (s.current_period_end IS NULL OR s.current_period_end > now()) THEN s.tier
      ELSE 'basic'
    END
    FROM public.subscriptions s
    WHERE s.photographer_id = _pid
  ), 'basic');
$$;

-- Which of these photographers are Pro (verified badge, search ranking).
CREATE OR REPLACE FUNCTION public.pro_photographers(_ids uuid[])
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM unnest(_ids) AS id WHERE public.photographer_tier(id) = 'pro';
$$;

GRANT EXECUTE ON FUNCTION public.photographer_tier(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.pro_photographers(uuid[]) TO anon, authenticated;

-- Basic: at most 3 main packages (add-ons are not counted).
CREATE OR REPLACE FUNCTION public.enforce_basic_package_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.package::text <> 'addon'
     AND public.photographer_tier(NEW.photographer_id) = 'basic'
     AND (SELECT count(*) FROM public.pricing_rules r
          WHERE r.photographer_id = NEW.photographer_id AND r.package::text <> 'addon') >= 3 THEN
    RAISE EXCEPTION 'الباقة الأساسية تسمح بـ3 باقات فقط — رقّي لـPro لباقات بلا حد'
      USING ERRCODE = 'P0001', HINT = 'BASIC_PACKAGE_LIMIT';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS pricing_rules_basic_limit ON public.pricing_rules;
CREATE TRIGGER pricing_rules_basic_limit
  BEFORE INSERT ON public.pricing_rules
  FOR EACH ROW EXECUTE FUNCTION public.enforce_basic_package_limit();

-- Portfolio cap per tier: Basic 20, Pro 60 (replaces the flat 20 of
-- enforce_portfolio_limit). Only blocks growth, so a photographer who moves
-- from Pro to Basic keeps what she already has.
DROP TRIGGER IF EXISTS profiles_basic_photo_limit ON public.profiles;
DROP FUNCTION IF EXISTS public.enforce_basic_photo_limit();

CREATE OR REPLACE FUNCTION public.enforce_portfolio_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  n int := COALESCE(cardinality(NEW.portfolio_urls), 0);
  cap int;
BEGIN
  IF n <= 20 OR n <= COALESCE(cardinality(OLD.portfolio_urls), 0) THEN
    RETURN NEW;
  END IF;
  cap := CASE WHEN public.photographer_tier(NEW.id) = 'pro' THEN 60 ELSE 20 END;
  IF n > cap THEN
    IF cap = 20 THEN
      RAISE EXCEPTION 'الباقة الأساسية تسمح بـ20 صورة — رقّي لـPro لحتى 60 صورة'
        USING ERRCODE = 'P0001', HINT = 'BASIC_PHOTO_LIMIT';
    END IF;
    RAISE EXCEPTION 'الحد الأقصى لمعرض الأعمال هو 60 صورة';
  END IF;
  RETURN NEW;
END;
$$;
