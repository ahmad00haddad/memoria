-- PR1 — Dashboard hygiene: allow photographers to permanently dismiss the
-- "حالة الجاهزية" (QuickStart readiness) panel once they finish onboarding.
--
-- The panel auto-hides on the client when all steps are complete, and the
-- photographer can also press a button to hide it forever. We persist that
-- choice server-side (not just localStorage) so it stays hidden across all
-- devices. The existing "owner update profile" RLS policy already lets a user
-- update their own row, so no new policy or RPC is required.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS quickstart_dismissed_at timestamptz;

COMMENT ON COLUMN public.profiles.quickstart_dismissed_at IS
  'When set, the dashboard QuickStart (readiness) panel is permanently hidden for this photographer.';
