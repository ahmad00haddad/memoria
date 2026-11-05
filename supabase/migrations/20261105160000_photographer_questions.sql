-- سؤال قبل الحجز: العروس تسأل من صفحة المصوّرة بدون ما يظهر رقم أي طرف.
-- الرد يظهر للعروس على رابط خاص (/ask/<token>). كل القراءة والكتابة عبر دوال الخادم.
CREATE TABLE IF NOT EXISTS public.photographer_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  photographer_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE DEFAULT replace(gen_random_uuid()::text, '-', ''),
  asker_name text NOT NULL CHECK (length(asker_name) BETWEEN 2 AND 120),
  asker_email text CHECK (length(asker_email) <= 200),
  question text NOT NULL CHECK (length(question) BETWEEN 5 AND 1500),
  answer text CHECK (length(answer) <= 2000),
  answered_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS photographer_questions_pid_idx ON public.photographer_questions(photographer_id, created_at DESC);
ALTER TABLE public.photographer_questions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.photographer_questions FROM anon, authenticated;
