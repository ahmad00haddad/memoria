-- 20260915_security_fixes.sql

-- 1. booking_disputes role spoofing
DROP POLICY IF EXISTS "participants raise dispute" ON public.booking_disputes;
CREATE POLICY "participants raise dispute" ON public.booking_disputes
  FOR INSERT TO authenticated
  WITH CHECK (
    raised_by = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = booking_id
        AND (
          (raised_by_role = 'client' AND b.client_user_id = auth.uid()) OR
          (raised_by_role = 'photographer' AND b.photographer_id = auth.uid())
        )
    )
  );

-- 2. messages generic spoofing
DROP POLICY IF EXISTS "authenticated insert own messages" ON public.messages;
DROP POLICY IF EXISTS "messages insert by parties" ON public.messages;
CREATE POLICY "messages insert by parties" ON public.messages
  FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = booking_id
        AND (auth.uid() = b.photographer_id OR auth.uid() = b.client_user_id)
    )
  );

-- 3. photographer_private input protection
DROP POLICY IF EXISTS "owner insert private" ON public.photographer_private;
CREATE POLICY "owner insert private" ON public.photographer_private
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
