-- Google (OAuth) sign-ups carry no 'role' metadata, so handle_new_user skipped
-- them: no profile, no role, no trial. Every later save then failed with
-- "photographer_private_user_id_fkey". Only photographers have accounts
-- (clients book without one), so treat OAuth sign-ups as photographers too.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF (NEW.raw_user_meta_data->>'role') = 'photographer'
     OR COALESCE(NEW.raw_app_meta_data->>'provider', 'email') <> 'email' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'photographer') ON CONFLICT DO NOTHING;
    INSERT INTO public.profiles (id, username, display_name)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || substr(NEW.id::text, 1, 8)),
      COALESCE(NEW.raw_user_meta_data->>'display_name',
               NEW.raw_user_meta_data->>'full_name',
               NEW.raw_user_meta_data->>'name',
               NEW.email)
    ) ON CONFLICT DO NOTHING;
    INSERT INTO public.subscriptions (photographer_id, status, trial_ends_at)
    VALUES (NEW.id, 'trial', now() + interval '14 days')
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$function$;

-- Backfill OAuth users created before this fix.
INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'photographer' FROM auth.users u
WHERE COALESCE(u.raw_app_meta_data->>'provider', 'email') <> 'email'
ON CONFLICT DO NOTHING;

INSERT INTO public.profiles (id, username, display_name)
SELECT u.id,
       'user_' || substr(u.id::text, 1, 8),
       COALESCE(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name', u.email)
FROM auth.users u
WHERE COALESCE(u.raw_app_meta_data->>'provider', 'email') <> 'email'
ON CONFLICT DO NOTHING;

INSERT INTO public.subscriptions (photographer_id, status, trial_ends_at)
SELECT u.id, 'trial', now() + interval '14 days' FROM auth.users u
WHERE COALESCE(u.raw_app_meta_data->>'provider', 'email') <> 'email'
ON CONFLICT DO NOTHING;
