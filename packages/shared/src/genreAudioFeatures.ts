/**
 * Reference audio-feature averages by Spotify seed genre.
 *
 * Source: the `maharshipandya/spotify-tracks-dataset` dataset (114,000 tracks
 * across Spotify's 114 seed genres, ~1,000 tracks/genre), collected from the
 * Spotify Web API's `/audio-features` endpoint.
 * - https://huggingface.co/datasets/maharshipandya/spotify-tracks-dataset
 * - https://www.kaggle.com/datasets/maharshipandya/-spotify-tracks-dataset
 *
 * Values are the per-genre mean of each field, computed directly from that
 * dataset — see `scripts/compute-genre-audio-features.py` to reproduce or
 * update them. (Spotify's `/audio-features` endpoint is the original source
 * of these numbers; it's now gated behind extended-quota app review for new
 * apps, which is why per-genre lookups here are a static snapshot rather
 * than a live call — see `apps/api/src/services/spotify.ts`, which already
 * falls back gracefully when that endpoint 403s for a given track.)
 */
export interface GenreAudioFeatures {
  /** 0-1, Spotify's "how suitable for dancing" score */
  danceability: number;
  /** 0-1, perceptual intensity/activity */
  energy: number;
  /** 0-1, musical positiveness conveyed */
  valence: number;
  /** beats per minute */
  tempo: number;
  /** 0-1, confidence the track is acoustic */
  acousticness: number;
  /** number of tracks the average was computed over */
  sampleSize: number;
}

export const GENRE_AUDIO_FEATURES_SOURCE =
  'maharshipandya/spotify-tracks-dataset — Spotify Web API audio-features, ~1,000 tracks/genre (https://huggingface.co/datasets/maharshipandya/spotify-tracks-dataset)';

/** Keyed by Spotify seed-genre id. */
export const GENRE_AUDIO_FEATURES: Record<string, GenreAudioFeatures> = {
  salsa: { danceability: 0.668, energy: 0.725, valence: 0.815, tempo: 119.9, acousticness: 0.469, sampleSize: 1000 },
  reggaeton: { danceability: 0.759, energy: 0.739, valence: 0.643, tempo: 118.9, acousticness: 0.165, sampleSize: 1000 },
  samba: { danceability: 0.575, energy: 0.673, valence: 0.693, tempo: 118.1, acousticness: 0.49, sampleSize: 1000 },
  tango: { danceability: 0.538, energy: 0.373, valence: 0.584, tempo: 114.6, acousticness: 0.846, sampleSize: 1000 },
  latin: { danceability: 0.722, energy: 0.727, valence: 0.631, tempo: 119.8, acousticness: 0.183, sampleSize: 1000 },
  latino: { danceability: 0.757, energy: 0.732, valence: 0.63, tempo: 119.4, acousticness: 0.172, sampleSize: 1000 },
  disco: { danceability: 0.677, energy: 0.738, valence: 0.671, tempo: 122.0, acousticness: 0.166, sampleSize: 1000 },
  funk: { danceability: 0.678, energy: 0.633, valence: 0.6, tempo: 117.8, acousticness: 0.3, sampleSize: 1000 },
  house: { danceability: 0.669, energy: 0.755, valence: 0.495, tempo: 121.1, acousticness: 0.109, sampleSize: 1000 },
  'deep-house': { danceability: 0.71, energy: 0.742, valence: 0.447, tempo: 120.9, acousticness: 0.102, sampleSize: 1000 },
  'hip-hop': { danceability: 0.736, energy: 0.683, valence: 0.551, tempo: 116.8, acousticness: 0.194, sampleSize: 1000 },
  pop: { danceability: 0.63, energy: 0.606, valence: 0.506, tempo: 120.9, acousticness: 0.344, sampleSize: 1000 },
  'r-n-b': { danceability: 0.614, energy: 0.638, valence: 0.633, tempo: 124.0, acousticness: 0.371, sampleSize: 1000 },
  dancehall: { danceability: 0.734, energy: 0.685, valence: 0.629, tempo: 112.9, acousticness: 0.216, sampleSize: 1000 },
  afrobeat: { danceability: 0.67, energy: 0.703, valence: 0.699, tempo: 119.2, acousticness: 0.271, sampleSize: 1000 },
  classical: { danceability: 0.382, energy: 0.19, valence: 0.381, tempo: 108.0, acousticness: 0.92, sampleSize: 1000 },
  'new-age': { danceability: 0.348, energy: 0.215, valence: 0.183, tempo: 108.0, acousticness: 0.824, sampleSize: 1000 },
  'world-music': { danceability: 0.415, energy: 0.533, valence: 0.25, tempo: 121.4, acousticness: 0.3, sampleSize: 1000 },
};

/**
 * Dance styles (see `DANCE_STYLES` in `danceStyles.ts`) whose music doesn't
 * have its own Spotify seed genre — Spotify's taxonomy has no "bachata" or
 * "kizomba" entry, for example. Maps each to the closest available genre.
 * Treat lookups through this map as an approximation, not a same-genre
 * average — flag that distinction anywhere these numbers are shown.
 */
export const GENRE_AUDIO_FEATURES_PROXY: Record<string, keyof typeof GENRE_AUDIO_FEATURES> = {
  bachata: 'latino',
  kizomba: 'afrobeat',
  hustle: 'disco',
  // Spotify's seed genre is "afrobeat" (no s); "afrobeats" is the modern Afropop style.
  afrobeats: 'afrobeat',
  // ballroom had no good proxy once jazz was dropped (too umbrella/complicated) — revisit.
  ballet: 'classical',
  contemporary: 'new-age',
};

/**
 * Looks up genre audio features by Spotify genre id or dance-style id,
 * following `GENRE_AUDIO_FEATURES_PROXY` when there's no direct genre match.
 * Returns `isProxy: true` when the result came from the proxy map, so
 * callers can label it as an approximation.
 */
export function getGenreAudioFeatures(
  genreOrStyleId: string,
): (GenreAudioFeatures & { isProxy: boolean }) | null {
  const direct = GENRE_AUDIO_FEATURES[genreOrStyleId];
  if (direct) return { ...direct, isProxy: false };

  const proxyKey = GENRE_AUDIO_FEATURES_PROXY[genreOrStyleId];
  const proxied = proxyKey ? GENRE_AUDIO_FEATURES[proxyKey] : undefined;
  return proxied ? { ...proxied, isProxy: true } : null;
}
