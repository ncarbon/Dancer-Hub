-- Run this in Supabase Dashboard > SQL Editor
--
-- ALSO required (cannot be done via SQL):
--   Storage > New bucket: "video-tracks", Public bucket ON
--   (the "audio-tracks" bucket already exists from migration 001)
--
-- Storage INSERT policies (public read is automatic on public buckets,
-- but uploads need explicit policies):
--
--   create policy "public insert video-tracks"
--     on storage.objects for insert
--     with check (bucket_id = 'video-tracks');
--
--   create policy "public insert audio-tracks"
--     on storage.objects for insert
--     with check (bucket_id = 'audio-tracks');

-- ─── routines ────────────────────────────────────────────────────────────────

create table if not exists routines (
  id               uuid    default gen_random_uuid() primary key,
  name             text    not null,
  style            text,                         -- 'Ballet' | 'Contemporary' | etc.
  duration_sec     float   not null default 0,

  -- playback preferences
  speed            float   not null default 1.0,
  pitch_lock       boolean not null default true,
  loop_on          boolean not null default false,
  loop_start_sec   float   not null default 0,
  loop_end_sec     float   not null default 0,
  delay_ms         integer not null default 0,

  -- attached media (stored in Supabase Storage)
  audio_file_path  text,
  audio_file_name  text,
  audio_duration_sec float,
  video_file_path  text,
  video_file_name  text,
  video_duration_sec float,

  created_at       timestamptz default now() not null
);

alter table routines enable row level security;

create policy "public_all" on routines
  for all using (true) with check (true);

-- ─── sections ────────────────────────────────────────────────────────────────

create table if not exists sections (
  id         uuid  default gen_random_uuid() primary key,
  routine_id uuid  not null references routines(id) on delete cascade,
  time_sec   float not null,
  name       text  not null
);

alter table sections enable row level security;

create policy "public_all" on sections
  for all using (true) with check (true);

create index sections_routine_id on sections(routine_id);

-- ─── cues ────────────────────────────────────────────────────────────────────
-- type: 'count' | 'formation' | 'movement' | 'entrance' | 'lift' | 'note'
-- count: '1-2-3-4' | '5-6-7-8' | '&-1-&-2' | '1-a-2-a' | '' (empty = none)

create table if not exists cues (
  id         uuid  default gen_random_uuid() primary key,
  routine_id uuid  not null references routines(id) on delete cascade,
  time_sec   float not null,
  type       text  not null,
  count      text  not null default '',
  note       text  not null default ''
);

alter table cues enable row level security;

create policy "public_all" on cues
  for all using (true) with check (true);

create index cues_routine_id on cues(routine_id);

-- ─── tasks ───────────────────────────────────────────────────────────────────

create table if not exists tasks (
  id               uuid    default gen_random_uuid() primary key,
  routine_id       uuid    not null references routines(id) on delete cascade,
  label            text    not null,
  done             boolean not null default false,
  progress_current integer,           -- null = no progress bar
  progress_total   integer,
  sort_order       integer not null default 0
);

alter table tasks enable row level security;

create policy "public_all" on tasks
  for all using (true) with check (true);

create index tasks_routine_id on tasks(routine_id);
