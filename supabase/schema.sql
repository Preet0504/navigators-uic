-- ============================================================
--  NAVIGATORS HUB — Supabase schema, security & storage
--  Run this once in the Supabase SQL editor (Dashboard → SQL).
--  Idempotent & self-healing: safe to re-run, and it upgrades an
--  existing database (adds any missing columns) without data loss.
-- ============================================================

-- ---------- Tables (fresh projects) ----------
create table if not exists public.events (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  date        text,
  address     text,
  rsvp_url    text,
  description text,
  image       text,
  created_at  timestamptz not null default now()
);

create table if not exists public.bible_studies (
  id          uuid primary key default gen_random_uuid(),
  week        text,
  topic       text not null,
  verse       text,
  summary     text,
  created_at  timestamptz not null default now()
);

create table if not exists public.scores (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  game        text not null,
  date        text not null default to_char(current_date, 'YYYY-MM-DD'),
  score       integer not null default 0,
  created_at  timestamptz not null default now()
);

create table if not exists public.highlights (
  id          uuid primary key default gen_random_uuid(),
  event_id    uuid,
  type        text not null default 'image',
  url         text,
  path        text,
  created_at  timestamptz not null default now()
);

create table if not exists public.event_rsvps (
  id              uuid primary key default gen_random_uuid(),
  event_id        uuid,
  first_name      text,
  last_name       text,
  email           text,
  bringing_guests text,
  created_at      timestamptz not null default now()
);

create table if not exists public.leaders (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  role        text,
  bio         text,
  image       text,
  sort        integer not null default 99,
  created_at  timestamptz not null default now()
);

-- ---------- Heal existing tables (add any missing columns) ----------
-- This is what fixes the "column event_id does not exist" error on
-- databases created by the older version of the app.
alter table public.events        add column if not exists rsvp_url text;
alter table public.events        add column if not exists address text;
alter table public.events        add column if not exists image text;
alter table public.events        add column if not exists created_at timestamptz not null default now();

alter table public.bible_studies add column if not exists verse text;
alter table public.bible_studies add column if not exists week text;
alter table public.bible_studies add column if not exists created_at timestamptz not null default now();

alter table public.scores        add column if not exists created_at timestamptz not null default now();

alter table public.highlights    add column if not exists event_id uuid;
alter table public.highlights    add column if not exists type text not null default 'image';
alter table public.highlights    add column if not exists url text;
alter table public.highlights    add column if not exists path text;
alter table public.highlights    add column if not exists created_at timestamptz not null default now();

alter table public.event_rsvps   add column if not exists event_id uuid;
alter table public.event_rsvps   add column if not exists first_name text;
alter table public.event_rsvps   add column if not exists last_name text;
alter table public.event_rsvps   add column if not exists email text;
alter table public.event_rsvps   add column if not exists bringing_guests text;
-- Email replaced birthdate on the RSVP form; drop the old column if present.
alter table public.event_rsvps   drop column if exists birthdate;
alter table public.event_rsvps   add column if not exists created_at timestamptz not null default now();

-- ---------- Realign highlights.event_id to events.id's type ----------
-- The events table's primary key is uuid on fresh installs but bigint on
-- databases created through the Supabase dashboard (its default PK is int8).
-- If highlights.event_id is a different type than events.id, inserting an
-- event id throws "invalid input syntax for type uuid" on highlight upload.
-- highlights holds no valid rows until uploads work, so rebuilding the column
-- (drop + re-add with the matching type) is safe. event_rsvps is left alone —
-- its event_id already matches events.id and has a working foreign key.
do $$
declare
  ev_type text;
  he_type text;
begin
  select format_type(atttypid, atttypmod) into ev_type
    from pg_attribute where attrelid = 'public.events'::regclass and attname = 'id';
  select format_type(atttypid, atttypmod) into he_type
    from pg_attribute where attrelid = 'public.highlights'::regclass and attname = 'event_id';
  if he_type is distinct from ev_type then
    alter table public.highlights drop column if exists event_id cascade;
    execute format('alter table public.highlights add column event_id %s', ev_type);
  end if;
end $$;

-- ---------- Helpful indexes (scale) ----------
create index if not exists idx_highlights_event on public.highlights(event_id);
create index if not exists idx_rsvps_event      on public.event_rsvps(event_id);
create index if not exists idx_scores_game_date on public.scores(game, date);

-- ---------- Row Level Security ----------
-- Public can READ everything (the site is a public showcase).
-- Only AUTHENTICATED admins can write — this is the real security boundary,
-- so a leaked anon key / client password can never modify data.
alter table public.events        enable row level security;
alter table public.bible_studies enable row level security;
alter table public.scores        enable row level security;
alter table public.highlights    enable row level security;
alter table public.event_rsvps   enable row level security;
alter table public.leaders       enable row level security;

do $$
declare t text;
begin
  foreach t in array array['events','bible_studies','scores','highlights','leaders']
  loop
    execute format('drop policy if exists "%s_read"  on public.%I;', t, t);
    execute format('drop policy if exists "%s_write" on public.%I;', t, t);
    execute format('create policy "%s_read"  on public.%I for select using (true);', t, t);
    execute format('create policy "%s_write" on public.%I for all to authenticated using (true) with check (true);', t, t);
  end loop;
end $$;

-- RSVPs: anyone may submit (insert); admins may read/manage.
drop policy if exists "rsvps_insert" on public.event_rsvps;
drop policy if exists "rsvps_admin"  on public.event_rsvps;
create policy "rsvps_insert" on public.event_rsvps for insert with check (true);
create policy "rsvps_admin"  on public.event_rsvps for all to authenticated using (true) with check (true);

-- ---------- Storage bucket for highlights / images ----------
insert into storage.buckets (id, name, public)
values ('highlights', 'highlights', true)
on conflict (id) do nothing;

drop policy if exists "highlights_public_read" on storage.objects;
drop policy if exists "highlights_admin_write" on storage.objects;
create policy "highlights_public_read" on storage.objects
  for select using (bucket_id = 'highlights');
create policy "highlights_admin_write" on storage.objects
  for all to authenticated
  using (bucket_id = 'highlights') with check (bucket_id = 'highlights');

-- ---------- Realtime (ignore if a table is already published) ----------
do $$
declare t text;
begin
  foreach t in array array['events','bible_studies','scores','highlights','event_rsvps','leaders']
  loop
    begin
      execute format('alter publication supabase_realtime add table public.%I;', t);
    exception when duplicate_object then null;
    end;
  end loop;
end $$;

-- ============================================================
--  COMMUNITY FEATURES — world-map pins + feedback wall
--  (self-contained; idempotent; safe to re-run on existing DBs)
-- ============================================================

-- ---------- Map pins: visitors mark where they're from ----------
-- Identity is an anonymous per-browser token (visitor_id, a uuid kept in the
-- visitor's localStorage). One pin per browser; the visitor can update/remove
-- their own row. Pins are aggregated by location on the map, so the same
-- person on a second browser just makes their region's pin larger.
create table if not exists public.map_pins (
  id           uuid primary key default gen_random_uuid(),
  visitor_id   text,
  country      text not null,
  country_code text,
  state        text,
  state_code   text,
  lat          double precision,
  lng          double precision,
  created_at   timestamptz not null default now()
);
alter table public.map_pins add column if not exists visitor_id text;
alter table public.map_pins add column if not exists country_code text;
alter table public.map_pins add column if not exists state text;
alter table public.map_pins add column if not exists state_code text;
alter table public.map_pins add column if not exists lat double precision;
alter table public.map_pins add column if not exists lng double precision;
alter table public.map_pins add column if not exists created_at timestamptz not null default now();
create index if not exists idx_map_pins_visitor on public.map_pins(visitor_id);
create index if not exists idx_map_pins_loc     on public.map_pins(country_code, state_code);

-- ---------- Feedback wall: submissions await admin approval ----------
create table if not exists public.feedback (
  id          uuid primary key default gen_random_uuid(),
  name        text,
  message     text not null,
  status      text not null default 'pending',   -- 'pending' | 'approved'
  created_at  timestamptz not null default now()
);
alter table public.feedback add column if not exists name text;
alter table public.feedback add column if not exists status text not null default 'pending';
alter table public.feedback add column if not exists created_at timestamptz not null default now();
create index if not exists idx_feedback_status on public.feedback(status);

-- ---------- RLS ----------
alter table public.map_pins enable row level security;
alter table public.feedback enable row level security;

-- map_pins: everyone reads; a visitor adds/updates/removes their own pin
-- (the client scopes writes by the unguessable uuid + visitor_id). Admins
-- (authenticated) may manage everything.
drop policy if exists "map_pins_read"   on public.map_pins;
drop policy if exists "map_pins_insert" on public.map_pins;
drop policy if exists "map_pins_update" on public.map_pins;
drop policy if exists "map_pins_delete" on public.map_pins;
drop policy if exists "map_pins_admin"  on public.map_pins;
create policy "map_pins_read"   on public.map_pins for select using (true);
create policy "map_pins_insert" on public.map_pins for insert with check (true);
create policy "map_pins_update" on public.map_pins for update using (true) with check (true);
create policy "map_pins_delete" on public.map_pins for delete using (true);
create policy "map_pins_admin"  on public.map_pins for all to authenticated using (true) with check (true);

-- feedback: public may submit (as 'pending' only) and read only 'approved'
-- items; admins (authenticated) read + manage everything (the moderation queue).
drop policy if exists "feedback_read_public" on public.feedback;
drop policy if exists "feedback_insert"      on public.feedback;
drop policy if exists "feedback_admin"       on public.feedback;
create policy "feedback_read_public" on public.feedback for select using (status = 'approved');
create policy "feedback_insert"      on public.feedback for insert with check (status = 'pending');
create policy "feedback_admin"       on public.feedback for all to authenticated using (true) with check (true);

-- ---------- Realtime ----------
do $$
begin
  begin execute 'alter publication supabase_realtime add table public.map_pins'; exception when duplicate_object then null; end;
  begin execute 'alter publication supabase_realtime add table public.feedback'; exception when duplicate_object then null; end;
end $$;

-- ============================================================
--  EVENTS ENHANCEMENTS — rich description, FAQs, RSVP double opt-in
--  (append; idempotent; safe to re-run)
-- ============================================================

-- Rich (formatted) description HTML + a FAQ list per event.
alter table public.events add column if not exists description_html text;
alter table public.events add column if not exists faqs jsonb not null default '[]'::jsonb;

-- RSVP double opt-in: new RSVPs start 'pending' and become 'confirmed' only
-- when the attendee clicks the emailed link (proving they own the inbox).
-- Add status WITHOUT a default first so existing RSVPs stay NULL and are
-- grandfathered as confirmed by the app; new inserts default to 'pending'.
alter table public.event_rsvps add column if not exists status text;
alter table public.event_rsvps alter column status set default 'pending';
alter table public.event_rsvps add column if not exists token text;
create index if not exists idx_rsvps_token on public.event_rsvps(token);

-- One RSVP per email per event. First collapse any pre-existing duplicates
-- (keep the earliest row) so the unique index can be created, then enforce it
-- case-insensitively. NULL-email rows (legacy) are ignored.
delete from public.event_rsvps a
  using public.event_rsvps b
  where a.email is not null and b.email is not null
    and a.event_id = b.event_id
    and lower(a.email) = lower(b.email)
    and a.ctid > b.ctid;

create unique index if not exists uniq_rsvp_event_email
  on public.event_rsvps (event_id, lower(email))
  where email is not null;

-- ============================================================
--  RSVP verification v2 — 120s link expiry, resend, cancel, status
--  (append; idempotent; safe to re-run)
-- ============================================================

-- Records when the CURRENT confirm link was issued (for the 120s expiry).
alter table public.event_rsvps add column if not exists token_sent_at timestamptz default now();

-- confirm_rsvp now returns text and enforces the 120-second expiry.
-- Return type changed from boolean, so drop the old signature first.
drop function if exists public.confirm_rsvp(text);
create or replace function public.confirm_rsvp(p_token text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare r record;
begin
  if p_token is null or length(p_token) < 10 then return 'invalid'; end if;
  select status, token_sent_at into r from public.event_rsvps where token = p_token;
  if not found then return 'invalid'; end if;
  if r.status = 'confirmed' then return 'ok'; end if;                      -- idempotent re-click
  if r.token_sent_at is null or r.token_sent_at < now() - interval '120 seconds' then
    return 'expired';
  end if;
  update public.event_rsvps set status = 'confirmed' where token = p_token;
  return 'ok';
end $$;
grant execute on function public.confirm_rsvp(text) to anon, authenticated;

-- Current status for a token, so the card can show the true state on load.
create or replace function public.rsvp_status(p_token text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare s text;
begin
  if p_token is null then return null; end if;
  select status into s from public.event_rsvps where token = p_token;
  return s;   -- null when not found (cancelled / admin-removed)
end $$;
grant execute on function public.rsvp_status(text) to anon, authenticated;

-- Resend: rotate to a fresh token + reset the 120s clock (only while pending).
-- Returns the new token so the client can email the new link; null if the RSVP
-- is already confirmed or no longer exists.
create or replace function public.resend_rsvp(p_token text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare new_tok text;
begin
  if p_token is null then return null; end if;
  new_tok := gen_random_uuid()::text;
  update public.event_rsvps
    set token = new_tok, token_sent_at = now()
    where token = p_token and status = 'pending';
  if not found then return null; end if;
  return new_tok;
end $$;
grant execute on function public.resend_rsvp(text) to anon, authenticated;

-- Cancel: delete the RSVP identified by its token (the person's own browser
-- holds it). Returns whether a row was removed.
create or replace function public.cancel_rsvp(p_token text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare n int;
begin
  if p_token is null then return false; end if;
  delete from public.event_rsvps where token = p_token;
  get diagnostics n = row_count;
  return n > 0;
end $$;
grant execute on function public.cancel_rsvp(text) to anon, authenticated;

-- Re-RSVP recovery: when someone RSVPs again with an email that already has a
-- row for this event (e.g. an earlier attempt that was never confirmed — very
-- common while email delivery is down), don't dead-end them. If that row is
-- still pending, refresh it with a new token/clock and return the new token so
-- the client can (re)send the link. If it's already confirmed, say so. Uses
-- event_id::text so it works whatever the event_id column type is.
create or replace function public.reclaim_rsvp(p_event_id text, p_first text, p_last text, p_email text, p_guests text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare ex record; new_tok text;
begin
  if p_email is null or p_email = '' or p_event_id is null then return 'none'; end if;
  select id, status into ex from public.event_rsvps
    where event_id::text = p_event_id and lower(email) = lower(p_email)
    limit 1;
  if not found then return 'none'; end if;
  if ex.status = 'confirmed' then return 'confirmed'; end if;
  new_tok := gen_random_uuid()::text;
  update public.event_rsvps
    set first_name = coalesce(nullif(p_first, ''), first_name),
        last_name  = coalesce(nullif(p_last, ''), last_name),
        bringing_guests = coalesce(nullif(p_guests, ''), bringing_guests),
        token = new_tok, token_sent_at = now(), status = 'pending'
    where id = ex.id;
  return new_tok;
end $$;
grant execute on function public.reclaim_rsvp(text, text, text, text, text) to anon, authenticated;
