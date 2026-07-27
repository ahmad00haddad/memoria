-- Audit Log for Production Board Stage Moves

CREATE TABLE IF NOT EXISTS public.production_stage_audit (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
    photographer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    from_stage TEXT NOT NULL,
    to_stage TEXT NOT NULL,
    moved_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    moved_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    reason TEXT
);

-- Enable RLS
ALTER TABLE public.production_stage_audit ENABLE ROW LEVEL SECURITY;

-- Select policy: Photographers can view their own audit logs
CREATE POLICY "Photographers can view their own production audit logs"
    ON public.production_stage_audit
    FOR SELECT
    USING (auth.uid() = photographer_id);

-- Insert policy: Only via service_role or specific function, but for safety allow auth users to insert if it's their own booking
CREATE POLICY "Photographers can insert their own production audit logs"
    ON public.production_stage_audit
    FOR INSERT
    WITH CHECK (auth.uid() = photographer_id AND auth.uid() = moved_by);

-- Create RPC function to log moves
CREATE OR REPLACE FUNCTION log_production_stage_move(
    p_booking_id UUID,
    p_from_stage TEXT,
    p_to_stage TEXT,
    p_reason TEXT DEFAULT NULL
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_photographer_id UUID;
    v_user_id UUID;
BEGIN
    v_user_id := auth.uid();
    
    -- Ensure user is logged in
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- Get photographer_id from booking
    SELECT photographer_id INTO v_photographer_id
    FROM public.bookings
    WHERE id = p_booking_id;

    -- Ensure booking exists and user owns it
    IF v_photographer_id IS NULL THEN
        RAISE EXCEPTION 'Booking not found';
    END IF;
    
    IF v_photographer_id != v_user_id THEN
        RAISE EXCEPTION 'Not authorized';
    END IF;

    -- Insert log
    INSERT INTO public.production_stage_audit (booking_id, photographer_id, from_stage, to_stage, moved_by, reason)
    VALUES (p_booking_id, v_photographer_id, p_from_stage, p_to_stage, v_user_id, p_reason);
END;
$$;
