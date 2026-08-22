-- Add new columns to photographer_profiles
ALTER TABLE "public"."photographer_profiles" 
ADD COLUMN IF NOT EXISTS "audio_url" text,
ADD COLUMN IF NOT EXISTS "income_goal" numeric DEFAULT 1000,
ADD COLUMN IF NOT EXISTS "completeness_score" numeric DEFAULT 0;

-- Add new columns to bookings
ALTER TABLE "public"."bookings"
ADD COLUMN IF NOT EXISTS "sneak_peek_url" text;

-- Create storage bucket for audio-intros if it doesn't exist
DO $$
BEGIN
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES (
        'audio-intros', 
        'audio-intros', 
        true, 
        5242880, -- 5MB limit
        ARRAY['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/webm', 'audio/mp4']
    )
    ON CONFLICT (id) DO UPDATE
    SET 
        public = true,
        file_size_limit = 5242880,
        allowed_mime_types = ARRAY['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/webm', 'audio/mp4'];
END $$;

-- Storage Policies for audio-intros
-- Public read access
CREATE POLICY "audio_intros_public_read" ON storage.objects FOR SELECT USING ( bucket_id = 'audio-intros' );

-- Authenticated users can upload their own audio
CREATE POLICY "audio_intros_insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (
    bucket_id = 'audio-intros' AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Authenticated users can update their own audio
CREATE POLICY "audio_intros_update" ON storage.objects FOR UPDATE TO authenticated USING (
    bucket_id = 'audio-intros' AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Authenticated users can delete their own audio
CREATE POLICY "audio_intros_delete" ON storage.objects FOR DELETE TO authenticated USING (
    bucket_id = 'audio-intros' AND (storage.foldername(name))[1] = auth.uid()::text
);
