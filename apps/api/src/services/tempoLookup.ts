import type { TempoMatch, TempoProvider, TrackMetadataStatus } from '@dancer-hub/shared';
import { searchGetSongBpm } from './getSongBpm';
import { searchAcousticBrainz } from './acousticBrainz';
import { detectBpmFromPreview, searchDeezerPreview } from './previewBpm';
import { getSpotifyAudioFeatures } from './spotify';

export interface TempoLookupResult {
  provider: TempoProvider;
  status: TrackMetadataStatus;
  candidates: TempoMatch[];
  /** Playable ~30s MP3 preview (usually Deezer), when available */
  audioPreviewUrl: string | null;
}

function withSource(matches: TempoMatch[], source: TempoProvider): TempoMatch[] {
  return matches.map((match) => ({ ...match, source: match.source ?? source }));
}

function statusFor(candidates: TempoMatch[]): TrackMetadataStatus {
  if (candidates.length === 0) return 'not_found';
  if (candidates.length === 1) return 'matched';
  return 'ambiguous';
}

function enrichWithSpotifyFeatures(
  matches: TempoMatch[],
  features: Awaited<ReturnType<typeof getSpotifyAudioFeatures>>,
): TempoMatch[] {
  if (!features) return matches;

  return matches.map((match) => ({
    ...match,
    // Prefer Spotify features when present; keep catalog values otherwise.
    timeSignature: features.timeSignature ?? match.timeSignature ?? null,
    danceability: features.danceability ?? match.danceability ?? null,
  }));
}

/**
 * Resolve tempo with cascading fallbacks:
 * 1. GetSongBPM catalog
 * 2. AcousticBrainz (via MusicBrainz)
 * 3. Beat detection on a Deezer preview clip
 *
 * Always tries to resolve a playable preview URL in parallel.
 * Optionally enriches with Spotify audio-features when the track id is known
 * (may 403 on newer Spotify apps — handled gracefully).
 */
export async function lookupTempo(
  title: string,
  artist: string,
  spotifyTrackId?: string,
): Promise<TempoLookupResult> {
  const previewPromise = searchDeezerPreview(title, artist)
    .then((track) => track?.previewUrl ?? null)
    .catch(() => null);

  const featuresPromise = spotifyTrackId
    ? getSpotifyAudioFeatures(spotifyTrackId)
    : Promise.resolve(null);

  try {
    const catalog = withSource(await searchGetSongBpm(title, artist), 'getsongbpm');
    if (catalog.length > 0) {
      const features = await featuresPromise;
      return {
        provider: 'getsongbpm',
        status: statusFor(catalog),
        candidates: enrichWithSpotifyFeatures(catalog, features),
        audioPreviewUrl: await previewPromise,
      };
    }
  } catch (err) {
    console.warn('[tempo] GetSongBPM failed, trying AcousticBrainz:', err);
  }

  try {
    const brainz = await searchAcousticBrainz(title, artist);
    if (brainz.length > 0) {
      const features = await featuresPromise;
      return {
        provider: 'acousticbrainz',
        status: statusFor(brainz),
        candidates: enrichWithSpotifyFeatures(brainz, features),
        audioPreviewUrl: await previewPromise,
      };
    }
  } catch (err) {
    console.warn('[tempo] AcousticBrainz failed, trying preview analysis:', err);
  }

  try {
    const preview = await detectBpmFromPreview(title, artist);
    if (preview.length > 0) {
      const features = await featuresPromise;
      return {
        provider: 'preview',
        status: statusFor(preview),
        candidates: enrichWithSpotifyFeatures(preview, features),
        audioPreviewUrl: await previewPromise,
      };
    }
  } catch (err) {
    console.warn('[tempo] Preview BPM detection failed:', err);
  }

  return {
    provider: 'getsongbpm',
    status: 'not_found',
    candidates: [],
    audioPreviewUrl: await previewPromise,
  };
}
