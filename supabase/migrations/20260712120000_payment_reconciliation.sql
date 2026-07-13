-- Migration to add reference_type to payment_events
ALTER TABLE public.payment_events ADD COLUMN IF NOT EXISTS reference_type text DEFAULT 'deposit';

-- Update existing records if necessary
UPDATE public.payment_events SET reference_type = 'subscription' WHERE related_user_id IS NOT NULL AND related_booking_id IS NULL;
