
-- 1) Remove tables from realtime publication (no client subscribes; re-added with authorization later)
ALTER PUBLICATION supabase_realtime DROP TABLE public.bookings;
ALTER PUBLICATION supabase_realtime DROP TABLE public.messages;

-- 2) Restrict pricing_rules public SELECT to published + active photographers, or the owner
DROP POLICY IF EXISTS "pricing public read" ON public.pricing_rules;
CREATE POLICY "pricing public read" ON public.pricing_rules
  FOR SELECT
  USING (
    auth.uid() = photographer_id
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = pricing_rules.photographer_id
        AND p.is_published = true
        AND public.is_subscription_active(p.id)
    )
  );

-- 3) Reviews: enforce one review per booking, and only allow inserts via server (supabaseAdmin bypasses RLS).
--    Drop the open authenticated INSERT policy — clients are anonymous; server fn handles it.
DROP POLICY IF EXISTS "client insert review" ON public.reviews;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'reviews_booking_id_unique'
  ) THEN
    -- de-dupe before adding the unique constraint
    DELETE FROM public.reviews r
    USING public.reviews r2
    WHERE r.booking_id = r2.booking_id AND r.created_at > r2.created_at;

    ALTER TABLE public.reviews
      ADD CONSTRAINT reviews_booking_id_unique UNIQUE (booking_id);
  END IF;
END $$;

-- 4) Tighten anon upload to deposit-proofs: require the second path segment to be a real booking token
DROP POLICY IF EXISTS "anon upload deposit proof via token" ON storage.objects;
CREATE POLICY "anon upload deposit proof via token" ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'deposit-proofs'
    AND (storage.foldername(name))[1] = 'public-tokens'
    AND (storage.foldername(name))[2] IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.client_tracking_token = (storage.foldername(name))[2]
    )
  );

-- 5) Revoke EXECUTE from anon on admin/internal SECURITY DEFINER functions that aren't meant for public token flow
REVOKE EXECUTE ON FUNCTION public.admin_set_published(uuid, boolean) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.admin_renew_subscription(uuid, integer) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.delete_photographer_cascade(uuid) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.get_referrer_id(text) FROM anon, public;

-- Keep RLS helper functions executable by authenticated (used inside policies) but lock from anon
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.is_subscription_active(uuid) FROM anon, public;

-- The client-token functions (get_booking_by_token, client_add_note, client_mark_deposit_sent, client_mark_received)
-- are intentionally callable by anon via the unguessable tracking token — keep as-is.
