-- إعدادات الصفحة العامة (ثيم، خط، لغة افتراضية، إظهار الأقسام...).
-- القيم تُنظّف في الكود (src/lib/page-settings.ts) عند الحفظ والعرض؛ هنا فقط حدود أمان.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS page_settings jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_page_settings_shape
  CHECK (jsonb_typeof(page_settings) = 'object' AND pg_column_size(page_settings) < 4000);

GRANT SELECT (page_settings) ON public.profiles TO anon;
