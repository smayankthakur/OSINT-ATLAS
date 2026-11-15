-- OSINT ATLAS — source registry + camera store (Postgres / Supabase)

-- One row per provider. This curated list is the product's value.
create table if not exists sources (
  id            text primary key,          -- 'tfl', 'windy', 'orendor'
  name          text not null,
  country       text,                      -- ISO-2, or 'GLOBAL'
  licence       text,                      -- e.g. 'TfL open data', 'Windy API ToS'
  adapter       text not null,             -- matches a file in src/lib/sources
  kind          text not null default 'image', -- image | stream
  refresh_secs  integer not null default 300,
  enabled       boolean not null default true,
  attribution   text,
  last_run      timestamptz,
  last_count    integer
);

-- One row per camera, normalised across all sources.
create table if not exists cameras (
  id            text primary key,          -- '{source}:{native_id}'
  source_id     text not null references sources(id) on delete cascade,
  name          text,
  lat           double precision not null,
  lon           double precision not null,
  country       text,
  kind          text not null default 'image',  -- image | stream
  image_url     text,                      -- upstream still (proxied, never exposed)
  stream_url    text,                      -- upstream hls/mp4 if any
  available     boolean default true,
  updated_at    timestamptz not null default now()
);

create index if not exists cameras_geo on cameras (lat, lon);
create index if not exists cameras_source on cameras (source_id);

-- Seed the sources we support. Cameras get filled by /api/ingest.
-- NOTE: orendor seeded as disabled below; set enabled=false after insert if desired.
insert into sources (id,name,country,licence,adapter,kind,refresh_secs,attribution) values
  ('tfl','TfL JamCams (London)','GB','TfL open data','tfl','image',300,'© Transport for London'),
  ('windy','Windy Webcams (global)','GLOBAL','Windy API ToS','windy','image',600,'© Windy.com'),
  ('orendor','Orenburg road CCTV (Infodor) — DEFUNCT','RU','n/a','orendor','stream',120,'© orendor.ru')
on conflict (id) do nothing;

-- Opt-in camera submissions (consent path). A property OWNER submits their own
-- public-facing camera; an admin approves it into `cameras` with source 'optin'.
insert into sources (id,name,country,licence,adapter,kind,refresh_secs,attribution) values
  ('optin','Opt-in submissions','GLOBAL','Owner consent on submission','optin','image',300,'Submitted by owner')
on conflict (id) do nothing;

create table if not exists camera_submissions (
  id             uuid primary key default gen_random_uuid(),
  property_name  text not null,
  property_type  text not null,         -- hotel | hostel | university | business | other
  city           text,
  country        text,
  contact_email  text not null,
  lat            double precision not null,
  lon            double precision not null,
  image_url      text,
  stream_url     text,
  owner_attested boolean not null default false,  -- MUST be true to accept
  status         text not null default 'pending', -- pending | approved | rejected
  created_at     timestamptz not null default now()
);

-- Row Level Security. All app DB access is via the service_role key (server
-- only), which bypasses RLS; these policies make the tables safe even if the
-- anon/publishable key is ever used from the client.
alter table sources             enable row level security;
alter table cameras             enable row level security;
alter table camera_submissions  enable row level security;

-- Public map may read approved cameras (anon). Nothing else is anon-readable.
drop policy if exists cameras_public_read on cameras;
create policy cameras_public_read on cameras
  for select to anon using (available = true);

-- Submissions: no anon access at all (insert goes through the server route
-- using the service_role key, which bypasses RLS).
-- (No anon policies on camera_submissions or sources = anon denied by default.)
