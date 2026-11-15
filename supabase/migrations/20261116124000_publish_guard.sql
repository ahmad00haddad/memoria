-- Phase 5.2 (LOGIC_FIX_PLAN 2026-11-16): الصفحة التي أخفتها الإدارة لا تعيد المصوّرة نشرها
BEGIN;

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS moderation_hidden_at timestamptz;

-- نسخة الأعمدة المحمية الأخيرة (20261011100000) + moderation_hidden_at (is_demo محمي فيها أصلاً)
CREATE OR REPLACE FUNCTION public.protect_profile_admin_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF COALESCE(auth.role(), '') <> 'authenticated'
     OR public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;

  NEW.is_featured   := OLD.is_featured;
  NEW.verified_at   := OLD.verified_at;
  NEW.verified_by   := OLD.verified_by;
  NEW.referral_code := OLD.referral_code;
  NEW.referred_by   := OLD.referred_by;
  NEW.deleted_at    := OLD.deleted_at;
  NEW.is_demo       := OLD.is_demo;
  NEW.moderation_hidden_at := OLD.moderation_hidden_at;

  IF NEW.verification_status IS DISTINCT FROM OLD.verification_status
     AND NOT (NEW.verification_status = 'pending_review'
              AND COALESCE(OLD.verification_status, 'unverified') IN ('unverified', 'rejected')) THEN
    NEW.verification_status := OLD.verification_status;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.profiles_publish_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF COALESCE(auth.role(), '') <> 'authenticated'
     OR public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;

  IF NEW.is_published AND NOT COALESCE(OLD.is_published, false) THEN
    IF NEW.moderation_hidden_at IS NOT NULL THEN
      RAISE EXCEPTION 'PROFILE_HIDDEN_BY_ADMIN' USING ERRCODE = '42501';
    END IF;
    IF NOT public.is_subscription_active(NEW.id) THEN
      RAISE EXCEPTION 'SUBSCRIPTION_INACTIVE' USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_publish_guard ON public.profiles;
CREATE TRIGGER trg_profiles_publish_guard
  BEFORE UPDATE OF is_published ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.profiles_publish_guard();

-- الصفحات المخفية حالياً بقرار إدارة/بلاغات لا نعرف سببها بأثر رجعي: لا نلمسها.

COMMIT;
