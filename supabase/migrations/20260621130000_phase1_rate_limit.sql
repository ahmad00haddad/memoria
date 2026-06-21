-- =====================================================================
-- Phase 1 — Rate limiting backstop for public actions
-- =====================================================================
-- A lightweight DB-backed sliding-window counter. Used by the public
-- booking endpoint to cap abusive submission loops even if a client
-- bypasses Turnstile / the UI. Keyed by an opaque string (e.g.
-- 'booking:<photographer_id>:<email>').
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.rate_limit_hits (
  key         text NOT NULL,
  hit_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS rate_limit_hits_key_time_idx
  ON public.rate_limit_hits (key, hit_at);

-- RLS: never readable/writable by clients directly; only SECURITY DEFINER fn.
ALTER TABLE public.rate_limit_hits ENABLE ROW LEVEL SECURITY;

-- Returns TRUE when the action is allowed (and records the hit); FALSE when
-- the limit for the window has been exceeded.
CREATE OR REPLACE FUNCTION public.app_rate_limit(
  _key text,
  _max int,
  _window_seconds int
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count int;
BEGIN
  -- opportunistic cleanup of old rows for this key
  DELETE FROM public.rate_limit_hits
   WHERE key = _key
     AND hit_at < now() - make_interval(secs => _window_seconds);

  SELECT count(*) INTO v_count
    FROM public.rate_limit_hits
   WHERE key = _key
     AND hit_at >= now() - make_interval(secs => _window_seconds);

  IF v_count >= _max THEN
    RETURN false;
  END IF;

  INSERT INTO public.rate_limit_hits (key) VALUES (_key);
  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.app_rate_limit(text, int, int) TO anon, authenticated;
