-- Photographers could set is_featured / verification_status = 'verified' on
-- their own profile through the normal "update own profile" RLS policy.
-- Lock admin-owned columns for regular users; admins and the service role
-- (server functions) are unaffected. Requesting review stays allowed.

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

  -- The only self-service status change is asking for review.
  IF NEW.verification_status IS DISTINCT FROM OLD.verification_status
     AND NOT (NEW.verification_status = 'pending_review'
              AND COALESCE(OLD.verification_status, 'unverified') IN ('unverified', 'rejected')) THEN
    NEW.verification_status := OLD.verification_status;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_profile_admin_columns ON public.profiles;
CREATE TRIGGER trg_protect_profile_admin_columns
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_profile_admin_columns();
