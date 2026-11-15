-- Phase 2.1 (LOGIC_FIX_PLAN 2026-11-16): الحجز المعتمد بانتظار العربون يحجز يومه حتى يُؤكَّد أو يُلغى
BEGIN;

CREATE OR REPLACE FUNCTION public.booking_holds(b public.bookings)
RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT b.status IN ('confirmed', 'completed')
      OR (b.status IN ('quote', 'pending_deposit') AND (
            -- not verified yet: short hold
            (b.phone_verified_at IS NULL AND b.created_at >= now() - interval '30 minutes')
            -- waiting for the photographer: 24h from verification
         OR (b.phone_verified_at IS NOT NULL AND b.needs_approval AND b.approved_at IS NULL
             AND b.phone_verified_at >= now() - interval '24 hours')
            -- waiting for the deposit: holds until confirmed or cancelled (no timeout)
         OR (b.phone_verified_at IS NOT NULL AND (NOT b.needs_approval OR b.approved_at IS NOT NULL))));
$$;

COMMIT;
