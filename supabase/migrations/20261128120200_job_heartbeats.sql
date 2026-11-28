-- نبض المهام المجدولة: آخر تشغيل وآخر نجاح وعدد الإخفاقات المتتالية، ليعرف الأدمن أن cron توقف.
BEGIN;

CREATE TABLE IF NOT EXISTS public.job_heartbeats (
  job          text PRIMARY KEY,
  last_run_at  timestamptz NOT NULL DEFAULT now(),
  last_ok_at   timestamptz,
  last_status  integer,
  fail_streak  integer NOT NULL DEFAULT 0,
  last_error   text,
  alerted_at   timestamptz
);

ALTER TABLE public.job_heartbeats ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.job_heartbeats FROM anon, authenticated;
GRANT SELECT ON public.job_heartbeats TO authenticated;
DROP POLICY IF EXISTS "heartbeats admin read" ON public.job_heartbeats;
CREATE POLICY "heartbeats admin read" ON public.job_heartbeats
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

COMMIT;

-- ROLLBACK: DROP TABLE IF EXISTS public.job_heartbeats;
