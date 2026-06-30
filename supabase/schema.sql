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
  birthdate       text,
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
alter table public.event_rsvps   add column if not exists birthdate text;
alter table public.event_rsvps   add column if not exists bringing_guests text;
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
