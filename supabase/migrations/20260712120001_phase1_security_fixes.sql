-- =====================================================================
-- Migration: Phase 1 Quick Fire Security Fixes
-- Description: Hardening RLS policies for messages and disputes
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) Fix messages INSERT policy (Prevent sender spoofing)
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS "messages insert by parties" ON public.messages;
CREATE POLICY "messages insert by parties" ON public.messages
  FOR INSERT TO authenticated
  WITH CHECK (
    -- Critical Fix: Enforce the sender_id to be the authenticated user
    sender_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.bookings b 
      WHERE b.id = booking_id 
        AND (auth.uid() = b.photographer_id OR auth.uid() = b.client_user_id)
    )
  );

-- Note: System messages (sender_id IS NULL) must now be inserted using service_role only.
-- The previous policy allowed any user to insert messages with sender_id IS NULL.

-- ---------------------------------------------------------------------
-- 2) Fix booking_disputes INSERT policy (Prevent role spoofing)
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS "participants raise dispute" ON public.booking_disputes;
CREATE POLICY "participants raise dispute" ON public.booking_disputes
  FOR INSERT TO authenticated
  WITH CHECK (
    raised_by = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = booking_id
        AND (
          -- If claiming to be the client, you must be the actual client
          (raised_by_role = 'client' AND b.client_user_id = auth.uid())
          OR 
          -- If claiming to be the photographer, you must be the actual photographer
          (raised_by_role = 'photographer' AND b.photographer_id = auth.uid())
        )
    )
  );

-- ---------------------------------------------------------------------
-- 3) Ensure notifications cannot be arbitrarily inserted by authenticated users
-- ---------------------------------------------------------------------
-- Remove any remaining open insert policies on notifications
DROP POLICY IF EXISTS "system insert notif" ON public.notifications;
DROP POLICY IF EXISTS "auth insert notif" ON public.notifications;
DROP POLICY IF EXISTS "auth insert own notif" ON public.notifications;

-- We allow users to mark their own notifications as read, but not create new ones.
-- Notifications should only be created by triggers or service_role functions.

-- ---------------------------------------------------------------------
-- 4) Harden photographer_private policy (Prevent generic access)
-- ---------------------------------------------------------------------
-- Explicitly lock down the photographer_private table
DROP POLICY IF EXISTS "owner insert private" ON public.photographer_private;
CREATE POLICY "owner insert private" ON public.photographer_private
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "owner update private" ON public.photographer_private;
CREATE POLICY "owner update private" ON public.photographer_private
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
