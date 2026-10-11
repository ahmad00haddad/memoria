-- Demo photographer accounts (Layla and Noor, the AI characters).
-- They exist so real photographers can preview what their own profile will look like.
-- Booking works normally on them; paying the deposit does not (enforced in the server
-- functions through profiles.is_demo, and shown as a notice in the UI).

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_demo boolean NOT NULL DEFAULT false;

-- Regular users must not be able to flip the flag on their own profile.
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

  IF NEW.verification_status IS DISTINCT FROM OLD.verification_status
     AND NOT (NEW.verification_status = 'pending_review'
              AND COALESCE(OLD.verification_status, 'unverified') IN ('unverified', 'rejected')) THEN
    NEW.verification_status := OLD.verification_status;
  END IF;

  RETURN NEW;
END;
$$;

-- Auth users. handle_new_user (role = photographer) creates the profile, role and trial row.
-- The password is random and never shown: nobody signs in to these accounts.
INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, recovery_token, email_change_token_new, email_change)
SELECT '00000000-0000-0000-0000-000000000000'::uuid, t.id, 'authenticated', 'authenticated', t.email,
       extensions.crypt(gen_random_uuid()::text, extensions.gen_salt('bf')), now(),
       '{"provider":"email","providers":["email"]}'::jsonb,
       jsonb_build_object('role', 'photographer', 'username', t.username, 'display_name', t.display_name),
       now(), now(), '', '', '', ''
FROM (VALUES
  ('11111111-1111-4111-8111-000000000001'::uuid, 'layla-demo', 'ليلى (نسخة تجريبية)', 'layla.demo@memoria.invalid'),
  ('11111111-1111-4111-8111-000000000002'::uuid, 'noor-demo',  'نور (نسخة تجريبية)',  'noor.demo@memoria.invalid')
) AS t(id, username, display_name, email)
WHERE NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = t.id);

UPDATE public.profiles SET
  is_demo = true,
  is_published = true,
  username = 'layla-demo',
  display_name = 'ليلى (نسخة تجريبية)',
  city = 'عمّان',
  base_location = 'جبل اللويبدة، عمّان',
  tagline = 'تصوير أعراس بأسلوب سينمائي دافئ',
  bio = 'مصوّرة أعراس من عمّان، أحب اللقطات الصادقة والضوء الطبيعي والتفاصيل الصغيرة التي تُنسى في زحمة اليوم الكبير. هذا حساب تجريبي لتري المصوّرات كيف سيبدو حسابهن على ميموريا.',
  equipment = 'كاميرا ميرورليس، عدسة 35mm و85mm، إضاءة طبيعية',
  deposit_percent = 25, free_km = 20, travel_fee_per_km = 0.2, min_session_minutes = 120
WHERE id = '11111111-1111-4111-8111-000000000001';

UPDATE public.profiles SET
  is_demo = true,
  is_published = true,
  username = 'noor-demo',
  display_name = 'نور (نسخة تجريبية)',
  city = 'عمّان',
  base_location = 'عبدون، عمّان',
  tagline = 'مصوّرة محجّبة لأجواء عائلية مريحة وخاصة',
  bio = 'مصوّرة محجّبة تحب الأجواء الهادئة والخاصة، مناسبة للحفلات النسائية والعائلية. هذا حساب تجريبي لتري المصوّرات كيف سيبدو حسابهن على ميموريا.',
  equipment = 'كاميرا ميرورليس، عدسة 50mm و85mm',
  deposit_percent = 25, free_km = 20, travel_fee_per_km = 0.2, min_session_minutes = 120
WHERE id = '11111111-1111-4111-8111-000000000002';

-- The subscription must stay active or the profile disappears from search and booking stops.
INSERT INTO public.subscriptions (photographer_id, status, trial_ends_at, current_period_start, current_period_end)
SELECT id, 'active', now() + interval '100 years', now(), now() + interval '100 years'
FROM public.profiles WHERE is_demo
ON CONFLICT (photographer_id) DO UPDATE
  SET status = 'active', current_period_end = now() + interval '100 years',
      trial_ends_at = now() + interval '100 years';

-- Packages (idempotent: only when the account has none).
INSERT INTO public.pricing_rules (photographer_id, service, package, label, price, description)
SELECT p.id, v.service::public.service_type, v.package::public.package_type, v.label, v.price, v.description
FROM public.profiles p
CROSS JOIN (VALUES
  ('photography',     'hourly',   'جلسة تصوير ساعتان',         120, 'تصوير عروس أو عائلة لمدة ساعتين مع تعديل الألوان'),
  ('photography',     'full_day', 'تغطية عرس كاملة',            450, 'تغطية اليوم كاملاً من التحضير حتى الزفة'),
  ('cinematic_video', 'full_day', 'فيديو سينمائي للعرس',        650, 'فيلم سينمائي قصير مع أبرز لحظات اليوم'),
  ('photography',     'addon',    'ألبوم مطبوع',                 60, 'ألبوم فاخر 30 صفحة')
) AS v(service, package, label, price, description)
WHERE p.is_demo
  AND NOT EXISTS (SELECT 1 FROM public.pricing_rules r WHERE r.photographer_id = p.id);
