-- Adds Spotify/GetSongBPM metadata columns to audio_tracks
-- Run this in Supabase Dashboard > SQL Editor

alter table audio_tracks
  add column if not exists spotify_track_id    text,
  add column if not exists spotify_url         text,
  add column if not exists album_art_url       text,
  add column if not exists artist              text,
  add column if not exists tempo_bpm           numeric,
  add column if not exists musical_key         text,
  add column if not exists metadata_fetched_at timestamptz;

-- No RLS changes needed — the existing "public_all" policy on audio_tracks
-- already permits update.
