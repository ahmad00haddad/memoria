-- جدول رسائل التواصل من صفحة /contact
-- يتم مراجعتها يدوياً من لوحة الأدمن
CREATE TABLE IF NOT EXISTS public.contact_messages (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  email text NOT NULL,
  phone text,
  message text NOT NULL,
  status text DEFAULT 'new' NOT NULL CHECK (status IN ('new', 'read', 'replied', 'spam')),
  admin_notes text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- RLS: لا يستطيع أحد القراءة من الخارج إلا service_role
ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;

-- السماح للزوار بالإدراج فقط (بدون قراءة)
CREATE POLICY "allow_public_insert_contact"
  ON public.contact_messages
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- القراءة للمشرفين فقط عبر service_role
CREATE POLICY "allow_admin_select_contact"
  ON public.contact_messages
  FOR SELECT
  USING (auth.role() = 'service_role');

CREATE POLICY "allow_admin_update_contact"
  ON public.contact_messages
  FOR UPDATE
  USING (auth.role() = 'service_role');

-- فهرس للبحث السريع في لوحة الأدمن
CREATE INDEX IF NOT EXISTS idx_contact_messages_status
  ON public.contact_messages (status, created_at DESC);

-- trigger لتحديث updated_at تلقائياً
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_contact_messages_updated_at ON public.contact_messages;
CREATE TRIGGER trg_contact_messages_updated_at
  BEFORE UPDATE ON public.contact_messages
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
