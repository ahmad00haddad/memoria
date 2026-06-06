
-- bookings: production stage tracking
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS production_stage text NOT NULL DEFAULT 'awaiting',
  ADD COLUMN IF NOT EXISTS editing_started_at timestamptz,
  ADD COLUMN IF NOT EXISTS editing_completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS selection_link text;

ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_production_stage_check;
ALTER TABLE public.bookings ADD CONSTRAINT bookings_production_stage_check
  CHECK (production_stage IN ('awaiting','shooting','selecting','editing','ready','delivered'));

-- messages: read state + attachments
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS read_at timestamptz,
  ADD COLUMN IF NOT EXISTS attachment_url text;

-- allow recipients to mark messages as read
DROP POLICY IF EXISTS "messages update read by recipient" ON public.messages;
CREATE POLICY "messages update read by recipient" ON public.messages
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.bookings b
    WHERE b.id = messages.booking_id
      AND (auth.uid() = b.photographer_id OR auth.uid() = b.client_user_id)
      AND auth.uid() <> COALESCE(messages.sender_id, '00000000-0000-0000-0000-000000000000'::uuid)
  ));

-- profiles: session min duration + external iCal
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS min_session_minutes integer NOT NULL DEFAULT 60,
  ADD COLUMN IF NOT EXISTS external_ical_url text,
  ADD COLUMN IF NOT EXISTS external_ical_synced_at timestamptz;

-- realtime
ALTER TABLE public.messages REPLICA IDENTITY FULL;
ALTER TABLE public.bookings REPLICA IDENTITY FULL;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='messages') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='bookings') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.bookings;
  END IF;
END $$;

-- notification trigger on new message → notify the other party
CREATE OR REPLACE FUNCTION public.notify_message_recipient()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_photographer uuid;
  v_client uuid;
  v_recipient uuid;
BEGIN
  SELECT photographer_id, client_user_id INTO v_photographer, v_client
  FROM public.bookings WHERE id = NEW.booking_id;
  IF NEW.sender_id = v_photographer THEN v_recipient := v_client;
  ELSE v_recipient := v_photographer;
  END IF;
  IF v_recipient IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, title, body, link)
    VALUES (v_recipient, 'رسالة جديدة من ' || COALESCE(NEW.sender_name,'مستخدم'),
            LEFT(NEW.body, 140), '/dashboard/bookings/' || NEW.booking_id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_message_recipient ON public.messages;
CREATE TRIGGER trg_notify_message_recipient
AFTER INSERT ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.notify_message_recipient();
