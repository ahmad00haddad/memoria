-- Google Calendar direct link (OAuth). Applied via the Supabase SQL editor.

-- One row per photographer. Holds the Google refresh token, so RLS is on with
-- no policies: only the service role (the Worker) can read or write it.
create table if not exists public.google_calendar_links (
  user_id uuid primary key references auth.users (id) on delete cascade,
  refresh_token text not null,
  google_email text,
  memoria_calendar_id text,
  connected_at timestamptz not null default now(),
  last_sync_at timestamptz,
  last_error text,
  busy_days int
);
alter table public.google_calendar_links enable row level security;
revoke all on public.google_calendar_links from anon, authenticated;

-- Shared secret for the booking-changed webhook, generated inside Vault.
select vault.create_secret(encode(extensions.gen_random_bytes(32), 'hex'), 'booking_hook_secret')
where not exists (select 1 from vault.secrets where name = 'booking_hook_secret');

create or replace function public.get_booking_hook_secret()
returns text
language sql
security definer
set search_path = ''
as $$
  select decrypted_secret from vault.decrypted_secrets where name = 'booking_hook_secret'
$$;
revoke execute on function public.get_booking_hook_secret() from public, anon, authenticated;
grant execute on function public.get_booking_hook_secret() to service_role;

-- Push a booking to the photographer's Google "Memoria" calendar as soon as it
-- changes. Only fires for photographers who linked Google.
create or replace function public.notify_booking_changed()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (select 1 from public.google_calendar_links l where l.user_id = new.photographer_id) then
    perform net.http_post(
      url := 'https://memoria-production.ahmad000haddad.workers.dev/api/public/hooks/booking-changed',
      headers := jsonb_build_object('Content-Type', 'application/json', 'x-hook-secret', public.get_booking_hook_secret()),
      body := jsonb_build_object('booking_id', new.id, 'photographer_id', new.photographer_id)
    );
  end if;
  return new;
end;
$$;

drop trigger if exists bookings_google_push on public.bookings;
create trigger bookings_google_push
  after insert or update of event_date, start_time, end_time, status, deleted_at, client_name, venue_name
  on public.bookings
  for each row execute function public.notify_booking_changed();
