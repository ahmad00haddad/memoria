-- ===================================================================
-- Migration: RLS Security Hardening (Phase 3 / PR3)
-- File: 20260623090000_rls_security_hardening.sql
-- Description: Fix two security vulnerabilities found in audit:
--   A) notifications INSERT WITH CHECK (true) → remove, use service_role
--   B) contracts SELECT USING (true) → restrict to owner + token holder
-- ===================================================================

-- =================================================================
-- FIX A: notifications INSERT policy
-- ---------------------------------------------------------------
-- PROBLEM: Any authenticated user could INSERT a notification for
--          ANY user_id (not just their own). This allows
--          notification spam / social engineering attacks.
-- FIX:    Drop the broad INSERT policy. All notification inserts
--          happen via service_role (which bypasses RLS entirely),
--          so no authenticated INSERT policy is needed.
-- =================================================================
DROP POLICY IF EXISTS "system insert notif" ON public.notifications;

-- Verify no other INSERT policies exist
-- (INSERT is now exclusively via service_role from server functions)


-- =================================================================
-- FIX B: contracts SELECT USING (true)
-- ---------------------------------------------------------------
-- PROBLEM: USING (true) allowed ANY anon/authenticated user to
--          read ALL contracts, exposing client PII (names, amounts,
--          contract terms) and photographer business data.
-- FIX:    Replace with two specific policies:
--         1) Photographer can read their own contracts.
--         2) Public can read a specific contract ONLY if they know
--            the signing token (unguessable UUID column).
--            This preserves the "sign via link" flow.
-- =================================================================
DROP POLICY IF EXISTS "public read by token" ON public.contracts;

-- Policy 1: Photographer reads all their own contracts.
CREATE POLICY "photographer read own contracts"
  ON public.contracts FOR SELECT
  TO authenticated
  USING (auth.uid() = photographer_id);

-- Policy 2: Public (anon) reads a single contract only by knowing
--           the exact signing_token. This is the token embedded in
--           the client's signing link — unguessable, UUID-level entropy.
CREATE POLICY "client read by signing token"
  ON public.contracts FOR SELECT
  TO anon, authenticated
  USING (
    signing_token IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.contracts c2
      WHERE c2.id = contracts.id
        AND c2.signing_token = current_setting('request.jwt.claims', true)::jsonb->>'sub'
      -- Note: actual token matching is done at application level via the
      -- /contracts/:token route. This policy ensures the row is readable
      -- if the user's session matches OR falls through to the app-level check.
      -- For true token-only access, the server function uses supabaseAdmin
      -- (service-role) to bypass RLS — this policy adds a second layer for
      -- direct client queries on the public profile.
    )
    OR auth.uid() = photographer_id
  );

-- Simpler & safer alternative (recommended for Lovable AI compatibility):
-- Let server functions use supabaseAdmin for all contract reads,
-- and restrict direct client access to photographer only.
DROP POLICY IF EXISTS "client read by signing token" ON public.contracts;

CREATE POLICY "photographer read own contracts only"
  ON public.contracts FOR SELECT
  TO authenticated
  USING (auth.uid() = photographer_id);

-- For the public signing route (/contracts/:token), the existing server
-- function already uses supabaseAdmin (bypasses RLS) — so no anon policy needed.


-- =================================================================
-- VERIFICATION NOTES (run after applying this migration):
-- =================================================================
-- SELECT tablename, policyname, cmd, qual
-- FROM pg_policies
-- WHERE tablename IN ('contracts', 'notifications')
-- ORDER BY tablename, cmd;
--
-- Expected result for notifications:
--   SELECT  → "owner read notif"   → auth.uid() = user_id
--   UPDATE  → "owner update notif" → auth.uid() = user_id
--   INSERT  → (none) — handled by service_role only
--
-- Expected result for contracts:
--   ALL     → "owner manage contracts"        → auth.uid() = photographer_id
--   SELECT  → "photographer read own contracts only" → auth.uid() = photographer_id
--   UPDATE  → "public sign by token"          → status = 'pending'
-- =================================================================
