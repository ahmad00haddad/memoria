-- WhatsApp templates table
CREATE TABLE public.whatsapp_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  photographer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  body TEXT NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT false,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.whatsapp_templates TO authenticated;
GRANT ALL ON public.whatsapp_templates TO service_role;

ALTER TABLE public.whatsapp_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Photographers manage own templates"
  ON public.whatsapp_templates FOR ALL
  USING (auth.uid() = photographer_id)
  WITH CHECK (auth.uid() = photographer_id);

CREATE TRIGGER update_whatsapp_templates_updated_at
  BEFORE UPDATE ON public.whatsapp_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_whatsapp_templates_photographer ON public.whatsapp_templates(photographer_id, sort_order);

-- Function to seed default templates for a photographer
CREATE OR REPLACE FUNCTION public.seed_default_whatsapp_templates(_photographer_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF _photographer_id != auth.uid() AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  INSERT INTO public.whatsapp_templates (photographer_id, name, category, body, is_default, sort_order) VALUES
  (_photographer_id, 'ترحيب بالعميلة', 'welcome',
   'مرحباً {{client_name}} 🌸' || E'\n' ||
   'شكراً لتواصلك معي! استلمت طلب الحجز للتاريخ {{event_date}}.' || E'\n' ||
   'سأراجع التفاصيل وأرد عليكِ خلال ساعات.' || E'\n\n' ||
   'يمكنكِ متابعة حالة الحجز من هنا: {{tracking_url}}',
   true, 1),

  (_photographer_id, 'طلب العربون', 'deposit',
   'مرحباً {{client_name}} 💕' || E'\n' ||
   'لتثبيت حجزك بتاريخ {{event_date}}، يرجى تحويل العربون بقيمة {{deposit_amount}} د.أ.' || E'\n\n' ||
   'بعد التحويل ارفعي إثبات الدفع من صفحة التتبع:' || E'\n' ||
   '{{tracking_url}}',
   true, 2),

  (_photographer_id, 'تأكيد الحجز', 'confirmed',
   'مبارك {{client_name}} 🎉' || E'\n' ||
   'تم تأكيد حجزك بتاريخ {{event_date}}.' || E'\n' ||
   'سأتواصل معك قبل الموعد بأيام لتأكيد التفاصيل النهائية.' || E'\n\n' ||
   'تفاصيل الحجز: {{tracking_url}}',
   true, 3),

  (_photographer_id, 'تذكير قبل الموعد', 'reminder',
   'مرحباً {{client_name}} ✨' || E'\n' ||
   'تذكير بموعد التصوير غداً بتاريخ {{event_date}}.' || E'\n' ||
   'الموقع: {{venue}}' || E'\n\n' ||
   'لأي استفسار راسليني هنا. بانتظارك! 📸',
   true, 4),

  (_photographer_id, 'جاهزية الصور', 'delivery',
   'مرحباً {{client_name}} 🌟' || E'\n' ||
   'صور جلستك جاهزة! 📸' || E'\n' ||
   'يمكنك تحميلها من هنا: {{tracking_url}}' || E'\n\n' ||
   'أتمنى تنال إعجابك 💕',
   true, 5),

  (_photographer_id, 'طلب تقييم', 'review',
   'مرحباً {{client_name}} 💐' || E'\n' ||
   'سعدت بالعمل معك! إذا أعجبتك تجربتك يسعدني تقييمك من هنا:' || E'\n' ||
   '{{tracking_url}}' || E'\n\n' ||
   'بانتظارك في حجوزات قادمة 🌸',
   true, 6)
  ON CONFLICT DO NOTHING;
END;
$$;