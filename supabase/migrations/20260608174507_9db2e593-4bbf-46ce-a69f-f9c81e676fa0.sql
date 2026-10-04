-- Removed: this migration used to seed an admin user with a hardcoded, publicly
-- known password. Grant admin to a real account instead:
--   INSERT INTO public.user_roles (user_id, role) VALUES (<uuid>, 'admin');
SELECT 1;
