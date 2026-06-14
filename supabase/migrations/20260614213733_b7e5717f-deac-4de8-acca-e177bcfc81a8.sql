ALTER TABLE public.photographer_private ADD COLUMN IF NOT EXISTS external_ical_auto_sync boolean NOT NULL DEFAULT false;

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

DO $$ BEGIN
  PERFORM cron.unschedule('ical-auto-sync-30min');
EXCEPTION WHEN OTHERS THEN NULL; END $$;

SELECT cron.schedule(
  'ical-auto-sync-30min',
  '*/30 * * * *',
  $$ SELECT net.http_post(
       url := 'https://project--7bd5f253-4c5b-448c-8e90-d0c390e715d9.lovable.app/api/public/hooks/ical-sync',
       headers := '{"Content-Type":"application/json","apikey":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVramtnaWFodHBuZXZxZG9ndWlxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgyNTIzNDEsImV4cCI6MjA5MzgyODM0MX0.D1ApSVtDwljekdkO-1EE0X0O4igzjmy5MtwTLYSTqeY"}'::jsonb,
       body := '{}'::jsonb
     ); $$
);