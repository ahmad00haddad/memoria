-- Phase 4 (LOGIC_FIX_PLAN 2026-11-16): اعتماد دفعة الاشتراك ذرّياً + مكافأة الإحالة لمن انتهت تجربتها
BEGIN;

-- 4.1 مسار واحد لكل «دفعة اشتراك قُبلت»
CREATE OR REPLACE FUNCTION public.apply_subscription_payment(
  _payment_id uuid, _months int, _actor uuid,
  _reference text DEFAULT NULL, _notes text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_pid uuid;
  v_tier text;
  v_sub public.subscriptions%ROWTYPE;
  v_start timestamptz;
  v_end timestamptz;
BEGIN
  IF _months IS NULL OR _months < 1 OR _months > 36 THEN RAISE EXCEPTION 'invalid months'; END IF;

  -- يُقلب الصف مرة واحدة فقط؛ أي نداء ثانٍ (تزامن/إعادة) يرجع already دون أي أثر
  UPDATE public.subscription_payments
     SET status = 'approved',
         reviewed_at = now(),
         reviewed_by = _actor,
         period_months = _months,
         payment_reference = COALESCE(_reference, payment_reference),
         notes = COALESCE(_notes, notes)
   WHERE id = _payment_id AND status = 'pending'
  RETURNING photographer_id, tier INTO v_pid, v_tier;

  IF v_pid IS NULL THEN
    RETURN jsonb_build_object('ok', true, 'already', true);
  END IF;
  v_tier := COALESCE(v_tier, 'pro');

  SELECT * INTO v_sub FROM public.subscriptions WHERE photographer_id = v_pid FOR UPDATE;

  -- نبدأ من آخر ما هو أبعد: الآن / نهاية الفترة الحالية / نهاية التجربة (لو ما زالت تجربة)
  v_start := GREATEST(
    now(),
    COALESCE(v_sub.current_period_end, now()),
    CASE WHEN v_sub.status = 'trial' THEN COALESCE(v_sub.trial_ends_at, now()) ELSE now() END
  );
  v_end := v_start + make_interval(months => _months);

  INSERT INTO public.subscriptions
    (photographer_id, status, tier, current_period_start, current_period_end, trial_ends_at, updated_at)
  VALUES (v_pid, 'active', v_tier, now(), v_end, now(), now())
  ON CONFLICT (photographer_id) DO UPDATE
    SET status = 'active',
        tier = EXCLUDED.tier,
        current_period_start = EXCLUDED.current_period_start,
        current_period_end = EXCLUDED.current_period_end,
        updated_at = now();

  PERFORM public.grant_referral_reward(v_pid);

  INSERT INTO public.audit_logs (action, actor_id, entity_type, entity_id, after_data)
  VALUES ('subscription.approve', _actor, 'subscription_payment', _payment_id,
          jsonb_build_object('months', _months, 'photographer_id', v_pid,
                             'period_end', v_end, 'tier', v_tier, 'reference', _reference));

  RETURN jsonb_build_object('ok', true, 'already', false, 'period_end', v_end,
                            'photographer_id', v_pid, 'tier', v_tier);
END;
$$;

REVOKE ALL ON FUNCTION public.apply_subscription_payment(uuid, int, uuid, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apply_subscription_payment(uuid, int, uuid, text, text) TO service_role;

-- 4.2 مكافأة الإحالة: 14 يوماً قابلة للاستعمال فعلاً حتى لو انتهت تجربة المُحيلة
CREATE OR REPLACE FUNCTION public.grant_referral_reward(_referred_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_referrer_id uuid;
  v_sub record;
  v_new_end timestamptz;
BEGIN
  SELECT referrer_id INTO v_referrer_id
  FROM public.referrals
  WHERE referred_id = _referred_id
    AND reward_granted = false;

  IF v_referrer_id IS NULL THEN
    RETURN;
  END IF;

  UPDATE public.referrals
  SET reward_granted = true,
      updated_at = now()
  WHERE referred_id = _referred_id
    AND reward_granted = false;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  SELECT * INTO v_sub
  FROM public.subscriptions
  WHERE photographer_id = v_referrer_id;

  IF v_sub IS NULL THEN
    v_new_end := now() + interval '14 days';
    INSERT INTO public.subscriptions
      (photographer_id, status, trial_ends_at, current_period_start, current_period_end)
    VALUES
      (v_referrer_id, 'trial', v_new_end, now(), v_new_end);
  ELSIF v_sub.status = 'trial' AND v_sub.trial_ends_at IS NOT NULL AND v_sub.trial_ends_at > now() THEN
    -- تجربة جارية: نمدّدها
    v_new_end := v_sub.trial_ends_at + interval '14 days';
    UPDATE public.subscriptions
    SET trial_ends_at = v_new_end, updated_at = now()
    WHERE photographer_id = v_referrer_id;
  ELSIF v_sub.status = 'trial' THEN
    -- تجربة منتهية: 14 يوماً تجريبياً جديدة (الحالة تبقى trial فتعدّها is_subscription_active فعّالة)
    v_new_end := now() + interval '14 days';
    UPDATE public.subscriptions
    SET trial_ends_at = v_new_end, updated_at = now()
    WHERE photographer_id = v_referrer_id;
  ELSE
    v_new_end := GREATEST(COALESCE(v_sub.current_period_end, now()), now()) + interval '14 days';
    UPDATE public.subscriptions
    SET current_period_end = v_new_end,
        status = CASE WHEN status = 'expired' THEN 'active'::public.subscription_status ELSE status END,
        updated_at = now()
    WHERE photographer_id = v_referrer_id;
  END IF;

  PERFORM public.log_audit(
    'referral.reward_granted',
    'referral',
    _referred_id::text,
    jsonb_build_object('referrer_id', v_referrer_id, 'referred_id', _referred_id),
    jsonb_build_object('reward_days', 14, 'new_end_date', v_new_end)
  );
END;
$function$;

-- 4.3 (تخطّيناه عمداً): لم نُعِد نشر الملفات — get_public_profile_data لا يفحص is_subscription_active.

COMMIT;
