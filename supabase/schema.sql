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

-- ---------- Accounts: public login + admin allowlist ----------
-- Members now sign in (Google) to RSVP, so "logged in" no longer means "admin".
-- Admins must be listed in public.admins; every admin write policy below checks
-- public.is_admin(). Without this, any signed-in member would inherit admin
-- rights.
create table if not exists public.admins ( email text primary key );

-- >>> EDIT ME before running: seed your admin email(s). Idempotent.
insert into public.admins(email) values ('kingpreetpatel@gmail.com')
  on conflict (email) do nothing;

-- Is the current user an admin? SECURITY DEFINER so it can read the allowlist
-- under RLS. Used by the client (rpc) and by every admin policy in this file.
create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.admins
    where lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;
grant execute on function public.is_admin() to anon, authenticated;

-- Everyone who has signed in (mirrored from auth by the client on login). Gives
-- admins a member list to email when a new event is posted.
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  created_at timestamptz default now()
);

alter table public.admins   enable row level security;
alter table public.profiles enable row level security;

drop policy if exists "admins_admin" on public.admins;
create policy "admins_admin" on public.admins for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "profiles_self"       on public.profiles;
drop policy if exists "profiles_admin_read" on public.profiles;
-- Each user manages only their own profile row…
create policy "profiles_self" on public.profiles for all to authenticated
  using (id = auth.uid()) with check (id = auth.uid());
-- …and admins can read the whole member list (to email everyone).
create policy "profiles_admin_read" on public.profiles for select to authenticated
  using (public.is_admin());

do $$
declare t text;
begin
  foreach t in array array['events','bible_studies','scores','highlights','leaders']
  loop
    execute format('drop policy if exists "%s_read"  on public.%I;', t, t);
    execute format('drop policy if exists "%s_write" on public.%I;', t, t);
    execute format('create policy "%s_read"  on public.%I for select using (true);', t, t);
    execute format('create policy "%s_write" on public.%I for all to authenticated using (public.is_admin()) with check (public.is_admin());', t, t);
  end loop;
end $$;

-- RSVPs now require login. A member manages only their own RSVP row (identified
-- by user_id); admins (allowlist) can read/manage all of them.
alter table public.event_rsvps add column if not exists user_id uuid references auth.users(id) on delete cascade;
create unique index if not exists uniq_rsvp_event_user on public.event_rsvps(event_id, user_id) where user_id is not null;

drop policy if exists "rsvps_insert" on public.event_rsvps;
drop policy if exists "rsvps_admin"  on public.event_rsvps;
drop policy if exists "rsvps_self"   on public.event_rsvps;
create policy "rsvps_self"  on public.event_rsvps for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "rsvps_admin" on public.event_rsvps for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

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
  using (bucket_id = 'highlights' and public.is_admin())
  with check (bucket_id = 'highlights' and public.is_admin());

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

-- ---------- Map pins: members mark where they're from ----------
-- One pin per signed-in member; they can update/remove their own row. Pins
-- are aggregated by location on the map, so a second pin from the same
-- region just makes that dot bigger.
--
-- Identity used to be an anonymous per-browser token (visitor_id in
-- localStorage) with insert/update/delete policies of `using (true)` —
-- meaning ANY visitor could modify or delete ANY pin via a direct API call,
-- not just their own (the ownership check only existed client-side). Now that
-- the app has real sign-in, pins are owned by auth.uid() and RLS enforces it
-- server-side. visitor_id is kept only so old rows aren't orphaned by a
-- dropped column; the app no longer reads or writes it.
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
alter table public.map_pins add column if not exists user_id uuid references auth.users(id) on delete cascade;
create unique index if not exists uniq_map_pins_user on public.map_pins(user_id) where user_id is not null;
create index if not exists idx_map_pins_loc on public.map_pins(country_code, state_code);

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

-- map_pins: everyone reads (browsing the map needs no login); a signed-in
-- member manages only their own pin (user_id = auth.uid(), enforced server
-- side — not just checked client-side like the old visitor_id scheme).
-- Admins (allowlist) may manage everything.
drop policy if exists "map_pins_read"   on public.map_pins;
drop policy if exists "map_pins_insert" on public.map_pins;
drop policy if exists "map_pins_update" on public.map_pins;
drop policy if exists "map_pins_delete" on public.map_pins;
drop policy if exists "map_pins_self"   on public.map_pins;
drop policy if exists "map_pins_admin"  on public.map_pins;
create policy "map_pins_read"   on public.map_pins for select using (true);
create policy "map_pins_self"   on public.map_pins for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "map_pins_admin"  on public.map_pins for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- feedback: public may submit (as 'pending' only) and read only 'approved'
-- items; admins (authenticated) read + manage everything (the moderation queue).
drop policy if exists "feedback_read_public" on public.feedback;
drop policy if exists "feedback_insert"      on public.feedback;
drop policy if exists "feedback_admin"       on public.feedback;
create policy "feedback_read_public" on public.feedback for select using (status = 'approved');
create policy "feedback_insert"      on public.feedback for insert with check (status = 'pending');
create policy "feedback_admin"       on public.feedback for all to authenticated using (public.is_admin()) with check (public.is_admin());

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

-- Uniqueness is now per (event_id, user_id) — see the accounts section above.
-- The old email-based unique index is retired: it would fight the login model
-- (and its dedup DELETE could remove a real logged-in RSVP whose email matches
-- a legacy anonymous row). Drop it if a previous run created it.
drop index if exists public.uniq_rsvp_event_email;

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

-- ============================================================
--  RSVP CUSTOM QUESTIONS — per-event Q&A instead of a fixed guest count
--  (append; idempotent; safe to re-run)
-- ============================================================

-- Each event defines its own RSVP questions: a JSON array of
--   { id, type: 'text' | 'choice', label, required, options: [] (choice only) }
-- Replaces the old fixed "how many guests" field — admins build whatever
-- questions they want per event (a guest-count question included, if wanted).
alter table public.events add column if not exists rsvp_questions jsonb not null default '[]'::jsonb;

-- Answers are stored as { [questionId]: answerValue }, matched against the
-- event's rsvp_questions at render time. The old bringing_guests column is
-- kept (not dropped) so historical RSVPs from before this change aren't lost.
alter table public.event_rsvps add column if not exists answers jsonb not null default '{}'::jsonb;

-- ============================================================
--  HIGHLIGHT SOCIAL — likes + comments on event highlights
--  (append; idempotent; safe to re-run)
-- ============================================================

-- Both tables carry a foreign key to highlights.id — and its type CANNOT be
-- assumed. The create-table above declares it uuid, but that only ever runs on
-- a fresh project: a database created through the Supabase dashboard gets its
-- default int8 primary key instead, exactly like events.id (see the
-- realignment block near the top of this file). Hard-coding `highlight_id uuid`
-- here fails on such a database with:
--   42804: Key columns "highlight_id" and "id" are of incompatible types:
--          uuid and bigint
-- So both tables are built dynamically against whatever type highlights.id
-- actually is. ON DELETE CASCADE means removing a highlight takes its likes and
-- comments with it, so deleting a photo never strands orphaned rows.
--
-- author_name / author_avatar on comments are DENORMALIZED on purpose. Comments
-- are read by everyone, but public.profiles is locked down to "your own row,
-- plus admins read all" — so resolving a commenter's name through a join would
-- come back empty for every regular member. Stamping the display name onto the
-- row at insert time renders correctly for everyone without loosening profiles.
do $$
declare
  hl_type text;
  t       text;
begin
  select format_type(atttypid, atttypmod) into hl_type
    from pg_attribute
    where attrelid = 'public.highlights'::regclass
      and attname = 'id' and attnum > 0 and not attisdropped;

  -- Self-heal: if an earlier run built either table against a different key
  -- type, rebuild it. A mismatched column can't carry the foreign key, so any
  -- rows it holds were never validated against highlights and aren't worth
  -- keeping — the same reasoning the events/highlights realignment uses.
  foreach t in array array['highlight_likes', 'highlight_comments']
  loop
    if to_regclass('public.' || t) is not null
       and (select format_type(atttypid, atttypmod) from pg_attribute
              where attrelid = to_regclass('public.' || t)
                and attname = 'highlight_id' and attnum > 0 and not attisdropped)
           is distinct from hl_type
    then
      execute format('drop table public.%I', t);
    end if;
  end loop;

  -- Likes: the composite primary key IS the uniqueness rule — a member can't
  -- like the same highlight twice, enforced server-side rather than by client
  -- bookkeeping.
  execute format($f$
    create table if not exists public.highlight_likes (
      highlight_id %s not null references public.highlights(id) on delete cascade,
      user_id      uuid not null references auth.users(id)      on delete cascade,
      created_at   timestamptz not null default now(),
      primary key (highlight_id, user_id)
    )$f$, hl_type);

  execute format($f$
    create table if not exists public.highlight_comments (
      id            uuid primary key default gen_random_uuid(),
      highlight_id  %s not null references public.highlights(id) on delete cascade,
      user_id       uuid not null references auth.users(id)      on delete cascade,
      author_name   text,
      author_avatar text,
      body          text not null,
      created_at    timestamptz not null default now()
    )$f$, hl_type);
end $$;

alter table public.highlight_comments add column if not exists author_avatar text;

create index if not exists idx_hl_likes_highlight    on public.highlight_likes(highlight_id);
create index if not exists idx_hl_comments_highlight on public.highlight_comments(highlight_id, created_at);

-- ---------- RLS ----------
alter table public.highlight_likes    enable row level security;
alter table public.highlight_comments enable row level security;

-- Likes: anyone may READ (counts render for logged-out visitors), but only a
-- signed-in member may add/remove, and only their own row — so nobody can
-- inflate a count or un-like someone else's like through a direct API call.
drop policy if exists "hl_likes_read" on public.highlight_likes;
drop policy if exists "hl_likes_self" on public.highlight_likes;
create policy "hl_likes_read" on public.highlight_likes for select using (true);
create policy "hl_likes_self" on public.highlight_likes for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Comments: public read; a member writes/edits/deletes only their own; admins
-- may delete anything (moderation).
drop policy if exists "hl_comments_read"  on public.highlight_comments;
drop policy if exists "hl_comments_self"  on public.highlight_comments;
drop policy if exists "hl_comments_admin" on public.highlight_comments;
create policy "hl_comments_read"  on public.highlight_comments for select using (true);
create policy "hl_comments_self"  on public.highlight_comments for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "hl_comments_admin" on public.highlight_comments for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ---------- Realtime ----------
do $$
begin
  begin execute 'alter publication supabase_realtime add table public.highlight_likes';    exception when duplicate_object then null; end;
  begin execute 'alter publication supabase_realtime add table public.highlight_comments'; exception when duplicate_object then null; end;
end $$;
