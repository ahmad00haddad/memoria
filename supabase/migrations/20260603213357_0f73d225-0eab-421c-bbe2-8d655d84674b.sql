ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS tagline text,
  ADD COLUMN IF NOT EXISTS booking_notes text,
  ADD COLUMN IF NOT EXISTS bank_info text,
  ADD COLUMN IF NOT EXISTS fixed_deposit numeric;