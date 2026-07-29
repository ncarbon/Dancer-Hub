-- Run this in Supabase Dashboard > SQL Editor
--
-- ALSO required (cannot be done via SQL):
--   1. Go to Storage > New bucket
--   2. Name it exactly: audio-tracks
--   3. Make it PUBLIC (toggle on "Public bucket")

create table if not exists audio_tracks (
  id               uuid        default gen_random_uuid() primary key,
  title            text        not null,
  file_path        text        not null,
  file_name        text        not null,
  duration_seconds integer,
  created_at       timestamptz default now() not null
);

alter table audio_tracks enable row level security;

-- Open access — tighten this when you add auth
create policy "public_all" on audio_tracks
  for all
  using (true)
  with check (true);
