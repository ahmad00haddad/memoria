-- Public copy of the photographer's own form of address (it lived only in the
-- account's user_metadata), so her public page and package lines say مصوّر or
-- مصوّرة correctly. The dashboard setting writes both.
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS gender text NOT NULL DEFAULT 'female';
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_gender_check') THEN
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_gender_check CHECK (gender IN ('female', 'male'));
  END IF;
END $$;

UPDATE public.profiles p SET gender = 'male'
FROM auth.users u
WHERE u.id = p.id AND u.raw_user_meta_data->>'gender' = 'male' AND p.gender <> 'male';

GRANT SELECT (gender) ON public.profiles TO anon, authenticated;
GRANT UPDATE (gender) ON public.profiles TO authenticated;
