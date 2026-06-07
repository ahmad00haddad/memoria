
-- ============ 1) Bookings: client tracking token + lifecycle timestamps ============
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS client_tracking_token text UNIQUE DEFAULT replace(gen_random_uuid()::text,'-',''),
  ADD COLUMN IF NOT EXISTS deposit_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS deposit_confirmed_at timestamptz,
  ADD COLUMN IF NOT EXISTS client_received_at timestamptz;

-- Backfill any rows missing a token
UPDATE public.bookings SET client_tracking_token = replace(gen_random_uuid()::text,'-','')
WHERE client_tracking_token IS NULL;

-- ============ 2) Tighten profiles public read (hide non-subscribed) ============
DROP POLICY IF EXISTS "profiles public read" ON public.profiles;
CREATE POLICY "profiles public read" ON public.profiles
FOR SELECT TO public
USING (
  (auth.uid() = id)
  OR public.has_role(auth.uid(), 'admin')
  OR (is_published = true AND public.is_subscription_active(id))
);

-- ============ 3) Admin: cascade-delete a photographer ============
CREATE OR REPLACE FUNCTION public.delete_photographer_cascade(_photographer_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  DELETE FROM public.messages WHERE booking_id IN (SELECT id FROM public.bookings WHERE photographer_id = _photographer_id);
  DELETE FROM public.reviews WHERE photographer_id = _photographer_id;
  DELETE FROM public.contracts WHERE photographer_id = _photographer_id;
  DELETE FROM public.contract_templates WHERE photographer_id = _photographer_id;
  DELETE FROM public.pricing_rules WHERE photographer_id = _photographer_id;
  DELETE FROM public.photographer_unavailability WHERE photographer_id = _photographer_id;
  DELETE FROM public.bookings WHERE photographer_id = _photographer_id;
  DELETE FROM public.subscription_payments WHERE photographer_id = _photographer_id;
  DELETE FROM public.subscriptions WHERE photographer_id = _photographer_id;
  DELETE FROM public.referrals WHERE referrer_id = _photographer_id OR referred_id = _photographer_id;
  DELETE FROM public.notifications WHERE user_id = _photographer_id;
  DELETE FROM public.user_roles WHERE user_id = _photographer_id;
  DELETE FROM public.profiles WHERE id = _photographer_id;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_photographer_cascade(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_photographer_cascade(uuid) TO authenticated;

-- ============ 4) Admin: renew subscription by N months ============
CREATE OR REPLACE FUNCTION public.admin_renew_subscription(_photographer_id uuid, _months int)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_start timestamptz;
  v_end   timestamptz;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  IF _months IS NULL OR _months <= 0 THEN
    RAISE EXCEPTION 'invalid months';
  END IF;

  SELECT GREATEST(COALESCE(current_period_end, now()), now()) INTO v_start
  FROM public.subscriptions WHERE photographer_id = _photographer_id;

  IF v_start IS NULL THEN v_start := now(); END IF;
  v_end := v_start + (_months || ' months')::interval;

  INSERT INTO public.subscriptions (photographer_id, status, current_period_start, current_period_end, trial_ends_at)
  VALUES (_photographer_id, 'active', now(), v_end, now())
  ON CONFLICT (photographer_id) DO UPDATE
    SET status = 'active',
        current_period_start = COALESCE(public.subscriptions.current_period_start, now()),
        current_period_end = v_end,
        updated_at = now();

  INSERT INTO public.subscription_payments (photographer_id, amount, method, status, period_months, notes, reviewed_at, reviewed_by)
  VALUES (_photographer_id, 0, 'cliq', 'approved', _months, 'تجديد يدوي من الأدمن', now(), auth.uid());
END;
$$;

REVOKE ALL ON FUNCTION public.admin_renew_subscription(uuid, int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_renew_subscription(uuid, int) TO authenticated;

-- ============ 5) Add UNIQUE constraint on subscriptions.photographer_id (needed for ON CONFLICT) ============
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'subscriptions_photographer_id_key'
  ) THEN
    BEGIN
      ALTER TABLE public.subscriptions ADD CONSTRAINT subscriptions_photographer_id_key UNIQUE (photographer_id);
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END IF;
END $$;

-- ============ 6) Admin: toggle profile published ============
CREATE OR REPLACE FUNCTION public.admin_set_published(_photographer_id uuid, _published boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  UPDATE public.profiles SET is_published = _published, updated_at = now() WHERE id = _photographer_id;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_set_published(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_published(uuid, boolean) TO authenticated;

-- ============ 7) Public client tracking by token (SECURITY DEFINER RPCs) ============
CREATE OR REPLACE FUNCTION public.get_booking_by_token(_token text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v jsonb;
BEGIN
  SELECT jsonb_build_object(
    'id', b.id,
    'status', b.status,
    'production_stage', b.production_stage,
    'event_date', b.event_date,
    'start_time', b.start_time,
    'end_time', b.end_time,
    'service', b.service,
    'venue_address', b.venue_address,
    'base_price', b.base_price,
    'total_price', b.total_price,
    'deposit_amount', b.deposit_amount,
    'deposit_sent_at', b.deposit_sent_at,
    'deposit_confirmed_at', b.deposit_confirmed_at,
    'delivered_at', b.delivered_at,
    'client_received_at', b.client_received_at,
    'client_notes', b.client_notes,
    'client_name', b.client_name,
    'addons', b.addons,
    'photographer', jsonb_build_object(
      'display_name', p.display_name,
      'username', p.username,
      'whatsapp', p.whatsapp,
      'phone', p.phone,
      'cliq_alias', p.cliq_alias,
      'bank_info', p.bank_info,
      'fixed_deposit', p.fixed_deposit,
      'avatar_url', p.avatar_url
    )
  ) INTO v
  FROM public.bookings b
  JOIN public.profiles p ON p.id = b.photographer_id
  WHERE b.client_tracking_token = _token;

  RETURN v;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_booking_by_token(text) TO anon, authenticated;

-- Client marks deposit sent (with optional proof path + reference + note)
CREATE OR REPLACE FUNCTION public.client_mark_deposit_sent(_token text, _proof_path text, _reference text, _note text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking_id uuid;
  v_photographer uuid;
BEGIN
  SELECT id, photographer_id INTO v_booking_id, v_photographer
  FROM public.bookings WHERE client_tracking_token = _token;
  IF v_booking_id IS NULL THEN RAISE EXCEPTION 'invalid token'; END IF;

  UPDATE public.bookings
  SET deposit_sent_at = now(),
      deposit_proof_url = COALESCE(_proof_path, deposit_proof_url),
      client_notes = CASE
        WHEN _note IS NULL OR _note = '' THEN client_notes
        ELSE COALESCE(client_notes || E'\n', '') || _note
      END,
      updated_at = now()
  WHERE id = v_booking_id;

  INSERT INTO public.notifications (user_id, title, body, link)
  VALUES (v_photographer, 'العميل أرسل العربون',
          'تمت الإشارة إلى إرسال العربون. راجعي الإثبات.' || COALESCE(' المرجع: ' || _reference, ''),
          '/dashboard/bookings/' || v_booking_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.client_mark_deposit_sent(text, text, text, text) TO anon, authenticated;

-- Client confirms photos received
CREATE OR REPLACE FUNCTION public.client_mark_received(_token text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking_id uuid;
  v_photographer uuid;
BEGIN
  SELECT id, photographer_id INTO v_booking_id, v_photographer
  FROM public.bookings WHERE client_tracking_token = _token;
  IF v_booking_id IS NULL THEN RAISE EXCEPTION 'invalid token'; END IF;

  UPDATE public.bookings
  SET client_received_at = now(), status = 'completed', updated_at = now()
  WHERE id = v_booking_id;

  INSERT INTO public.notifications (user_id, title, body, link)
  VALUES (v_photographer, 'العميل أكّد استلام الصور', 'تم إغلاق الحجز كمكتمل.',
          '/dashboard/bookings/' || v_booking_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.client_mark_received(text) TO anon, authenticated;

-- Client appends a note
CREATE OR REPLACE FUNCTION public.client_add_note(_token text, _note text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking_id uuid;
  v_photographer uuid;
BEGIN
  IF _note IS NULL OR length(trim(_note)) = 0 THEN RETURN; END IF;
  SELECT id, photographer_id INTO v_booking_id, v_photographer
  FROM public.bookings WHERE client_tracking_token = _token;
  IF v_booking_id IS NULL THEN RAISE EXCEPTION 'invalid token'; END IF;

  UPDATE public.bookings
  SET client_notes = COALESCE(client_notes || E'\n', '') || '[' || to_char(now(), 'YYYY-MM-DD HH24:MI') || '] ' || _note,
      updated_at = now()
  WHERE id = v_booking_id;

  INSERT INTO public.notifications (user_id, title, body, link)
  VALUES (v_photographer, 'ملاحظة جديدة من العميل', LEFT(_note, 140),
          '/dashboard/bookings/' || v_booking_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.client_add_note(text, text) TO anon, authenticated;

-- ============ 8) Allow public uploads of deposit proofs under bookings/{token}/ via a returned upload-ready path ============
-- Storage already has deposit-proofs bucket; allow anon insert into deposit-proofs/public-tokens/{token}/
DROP POLICY IF EXISTS "anon upload deposit proof via token" ON storage.objects;
CREATE POLICY "anon upload deposit proof via token" ON storage.objects
FOR INSERT TO anon, authenticated
WITH CHECK (
  bucket_id = 'deposit-proofs'
  AND (storage.foldername(name))[1] = 'public-tokens'
);
