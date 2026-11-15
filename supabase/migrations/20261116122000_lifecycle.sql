-- Phase 3.1 (LOGIC_FIX_PLAN 2026-11-16): العلامة المائية تتبع الدفع لا التسليم.
-- نثبّت الحجوزات المسلَّمة سابقاً كمدفوعة حتى لا تظهر العلامة فجأة لعرائس استلمن صورهن.
-- (guard_booking_direct_updates لا يمنع: يستثني أي جلسة غير 'authenticated' مثل محرر SQL)
BEGIN;

UPDATE public.bookings
   SET final_paid_at = COALESCE(delivered_at, updated_at, now())
 WHERE status = 'completed' AND final_paid_at IS NULL AND deleted_at IS NULL;

COMMIT;
