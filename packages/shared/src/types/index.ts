export interface AudioTrack {
  id: string;
  title: string;
  file_path: string;
  file_name: string;
  duration_seconds: number | null;
  created_at: string;
  spotify_track_id: string | null;
  spotify_url: string | null;
  album_art_url: string | null;
  artist: string | null;
  tempo_bpm: number | null;
  musical_key: string | null;
  metadata_fetched_at: string | null;
}

// ─── Routines schema ──────────────────────────────────────────────────────────

export interface Routine {
  id: string;
  name: string;
  style: string | null;
  duration_sec: number;
  speed: number;
  pitch_lock: boolean;
  loop_on: boolean;
  loop_start_sec: number;
  loop_end_sec: number;
  delay_ms: number;
  audio_file_path: string | null;
  audio_file_name: string | null;
  audio_duration_sec: number | null;
  video_file_path: string | null;
  video_file_name: string | null;
  video_duration_sec: number | null;
  created_at: string;
  spotify_track_id: string | null;
  spotify_url: string | null;
  album_art_url: string | null;
  artist: string | null;
  tempo_bpm: number | null;
  musical_key: string | null;
  metadata_fetched_at: string | null;
}

export interface Section {
  id: string;
  routine_id: string;
  time_sec: number;
  name: string;
}

export type CueType = 'count' | 'formation' | 'movement' | 'entrance' | 'lift' | 'note';
export type Count = '1-2-3-4' | '5-6-7-8' | '&-1-&-2' | '1-a-2-a' | '';

export interface Cue {
  id: string;
  routine_id: string;
  time_sec: number;
  type: CueType;
  count: Count;
  note: string;
}

export interface Task {
  id: string;
  routine_id: string;
  label: string;
  done: boolean;
  progress_current: number | null;
  progress_total: number | null;
  sort_order: number;
}

// ─── Track metadata (Spotify / GetSongBPM) ────────────────────────────────────

export interface SpotifyMatchCandidate {
  spotifyTrackId: string;
  title: string;
  artist: string;
  albumArtUrl: string | null;
  spotifyUrl: string;
  /** ~30s MP3 preview from Spotify; null when unavailable */
  previewUrl: string | null;
}

export type TempoProvider = 'getsongbpm' | 'acousticbrainz' | 'preview';

export interface TempoMatch {
  title: string;
  artist: string;
  tempoBpm: number | null;
  musicalKey: string | null;
  songUrl: string | null;
  /** Which backend produced this tempo estimate */
  source?: TempoProvider;
  /** Beats per bar, e.g. 4 for 4/4 — from GetSongBPM or Spotify when available */
  timeSignature?: number | null;
  /** 0–1 danceability score (GetSongBPM uses 0–100; normalized here) */
  danceability?: number | null;
}

/** @deprecated Prefer TempoMatch — kept for existing imports */
export type GetSongBpmMatch = TempoMatch;

export type TrackMetadataStatus = 'matched' | 'ambiguous' | 'not_found';

// GET /api/track-metadata?title=  -> provider "spotify", candidates: SpotifyMatchCandidate[]
// GET /api/track-metadata?title=&artist=  -> tempo providers (getsongbpm | acousticbrainz | preview)
export interface TrackMetadataResponse {
  provider: 'spotify' | TempoProvider;
  status: TrackMetadataStatus;
  candidates: SpotifyMatchCandidate[] | TempoMatch[];
  /** Playable ~30s MP3 when looking up tempo (Deezer/Spotify preview) */
  audioPreviewUrl?: string | null;
}
