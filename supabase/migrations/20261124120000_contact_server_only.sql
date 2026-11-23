-- الفورم صار يمرّ عبر دالة سيرفر (sendContactMessage) مع حدّ معدّل؛ نغلق الإدراج المباشر من المتصفح.
DROP POLICY IF EXISTS "allow_public_insert_contact" ON public.contact_messages;
REVOKE INSERT ON public.contact_messages FROM anon, authenticated;
