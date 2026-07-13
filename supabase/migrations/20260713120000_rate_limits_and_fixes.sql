CREATE TABLE IF NOT EXISTS public.rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text NOT NULL,
  action text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS rate_limits_token_action_idx ON public.rate_limits (token, action);

ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;
