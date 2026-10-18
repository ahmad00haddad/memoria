-- زوار الموقع (anon) يقرؤون فقط الأعمدة العامة من profiles.
-- الواجهة العامة تختار أعمدة صريحة ولا تستخدم select(*).
-- ملاحظة: REVOKE على عمود لا يعمل مع GRANT على مستوى الجدول، لذلك نسحب الجدول كله ثم نمنح قائمة بيضاء.
REVOKE SELECT ON public.profiles FROM anon;
GRANT SELECT (id, username, display_name, bio, city, base_location, instagram, avatar_url, cover_url,
              equipment, deposit_percent, travel_fee_per_km, is_published, created_at, updated_at,
              portfolio_urls, free_km, is_featured, tagline, booking_notes, fixed_deposit,
              min_session_minutes, deposit_refund_policy, deposit_refund_percent,
              verification_status, verified_at, seo_title, seo_description, audio_url, is_demo)
  ON public.profiles TO anon;
