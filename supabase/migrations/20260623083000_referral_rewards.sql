-- ===================================================================
-- Migration: Referral Reward Engine (Phase 2)
-- File: 20260623083000_referral_rewards.sql
-- Description: Server-authoritative, idempotent referral reward system.
-- Policy: Referrer gets +14 days ONLY when referred makes first PAID
--         subscription (Option 1 — safest against abuse).
-- ===================================================================

-- 1) Central function to grant referral rewards (idempotent, server-only).
--    Called by: renew_subscription_paid(), admin_renew_subscription(),
--               and any future subscription activation path.
-- -------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.grant_referral_reward(_referred_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_referrer_id uuid;
  v_sub record;
  v_new_end timestamptz;
BEGIN
  -- Find the pending referral for this newly-paid photographer.
  -- reward_granted=false ensures idempotency (one reward per referral).
  SELECT referrer_id INTO v_referrer_id
  FROM public.referrals
  WHERE referred_id = _referred_id
    AND reward_granted = false;

  -- No pending referral → nothing to do.
  IF v_referrer_id IS NULL THEN
    RETURN;
  END IF;

  -- Atomically mark reward as granted to prevent race conditions.
  UPDATE public.referrals
  SET reward_granted = true,
      updated_at = now()
  WHERE referred_id = _referred_id
    AND reward_granted = false;

  -- If no row was updated, another call already processed it.
  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- Fetch referrer's subscription to determine extension target.
  SELECT * INTO v_sub
  FROM public.subscriptions
  WHERE photographer_id = v_referrer_id;

  -- If referrer has no subscription row, create one with a 14-day trial.
  IF v_sub IS NULL THEN
    INSERT INTO public.subscriptions
      (photographer_id, status, trial_ends_at, current_period_start, current_period_end)
    VALUES
      (v_referrer_id, 'trial', now() + interval '14 days', now(), now() + interval '14 days');
  ELSE
    -- Extend the appropriate end date by 14 days.
    -- If currently in trial → extend trial_ends_at.
    -- If active/paid → extend current_period_end.
    IF v_sub.status = 'trial' AND v_sub.trial_ends_at > now() THEN
      v_new_end := v_sub.trial_ends_at + interval '14 days';
      UPDATE public.subscriptions
      SET trial_ends_at = v_new_end,
          updated_at = now()
      WHERE photographer_id = v_referrer_id;
    ELSE
      v_new_end := GREATEST(COALESCE(v_sub.current_period_end, now()), now()) + interval '14 days';
      UPDATE public.subscriptions
      SET current_period_end = v_new_end,
          updated_at = now()
      WHERE photographer_id = v_referrer_id;
    END IF;
  END IF;

  -- Audit log: record the reward grant for transparency.
  PERFORM public.log_audit(
    'referral.reward_granted',
    'referral',
    _referred_id::text,
    jsonb_build_object('referrer_id', v_referrer_id, 'referred_id', _referred_id),
    jsonb_build_object('reward_days', 14, 'new_end_date', v_new_end)
  );
END;
$$;

-- Restrict execution to service_role (called from server functions only).
REVOKE ALL ON FUNCTION public.grant_referral_reward(uuid) FROM PUBLIC, anon, authenticated;


-- 2) Hook grant_referral_reward into renew_subscription_paid (webhook path).
--    Called when Stripe/HyperPay webhook confirms a subscription payment.
-- -------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.renew_subscription_paid(
  _photographer_id uuid,
  _months          int,
  _provider        text    DEFAULT 'stripe',
  _intent          text    DEFAULT NULL,
  _amount          numeric DEFAULT NULL,
  _currency        text    DEFAULT 'JOD'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_start timestamptz;
  v_end   timestamptz;
BEGIN
  IF _months IS NULL OR _months <= 0 THEN
    RAISE EXCEPTION 'INVALID_MONTHS';
  END IF;

  SELECT GREATEST(COALESCE(current_period_end, now()), now()) INTO v_start
  FROM public.subscriptions
  WHERE photographer_id = _photographer_id;

  IF v_start IS NULL THEN
    v_start := now();
  END IF;
  v_end := v_start + (_months || ' months')::interval;

  INSERT INTO public.subscriptions
    (photographer_id, status, current_period_start, current_period_end, trial_ends_at)
  VALUES
    (_photographer_id, 'active', now(), v_end, now())
  ON CONFLICT (photographer_id) DO UPDATE
    SET status               = 'active',
        current_period_start = COALESCE(public.subscriptions.current_period_start, now()),
        current_period_end   = v_end,
        updated_at           = now();

  -- Record payment in subscription_payments table.
  INSERT INTO public.subscription_payments
    (photographer_id, amount, currency, method, period_months, status, stripe_payment_intent_id)
  VALUES
    (_photographer_id, COALESCE(_amount, 0), _currency, _provider, _months, 'approved', _intent);

  -- Trigger referral reward if this is the first paid subscription for this user.
  PERFORM public.grant_referral_reward(_photographer_id);

  -- Audit log.
  PERFORM public.log_audit(
    'subscription.renew',
    'subscription',
    _photographer_id::text,
    NULL,
    jsonb_build_object('months', _months, 'current_period_end', v_end, 'provider', _provider)
  );

  RETURN jsonb_build_object('ok', true, 'current_period_end', v_end);
END;
$$;


-- 3) Hook grant_referral_reward into admin_renew_subscription (admin path).
--    Called when admin manually approves a subscription payment.
-- -------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_renew_subscription(_photographer_id uuid, _months int)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_start timestamptz;
  v_end   timestamptz;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  IF _months IS NULL OR _months <= 0 THEN
    RAISE EXCEPTION 'invalid months';
  END IF;

  SELECT GREATEST(COALESCE(current_period_end, now()), now()) INTO v_start
  FROM public.subscriptions WHERE photographer_id = _photographer_id;

  IF v_start IS NULL THEN v_start := now(); END IF;
  v_end := v_start + (_months || ' months')::interval;

  INSERT INTO public.subscriptions (photographer_id, status, current_period_start, current_period_end, trial_ends_at)
  VALUES (_photographer_id, 'active', now(), v_end, now())
  ON CONFLICT (photographer_id) DO UPDATE
    SET status = 'active',
        current_period_start = COALESCE(public.subscriptions.current_period_start, now()),
        current_period_end = v_end,
        updated_at = now();

  -- Trigger referral reward if this is the first paid subscription for this user.
  PERFORM public.grant_referral_reward(_photographer_id);

  -- Audit log.
  PERFORM public.log_audit(
    'subscription.renew',
    'subscription',
    _photographer_id::text,
    NULL,
    jsonb_build_object('months', _months, 'current_period_end', v_end, 'by_admin', true)
  );
END;
$$;
