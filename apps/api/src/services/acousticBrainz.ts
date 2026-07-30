import type { TempoMatch } from '@dancer-hub/shared';

const USER_AGENT = 'DancerHub/0.1 (tempo lookup; https://github.com/dancer-hub)';

interface MusicBrainzRecording {
  id: string;
  title: string;
  score?: number;
  'artist-credit'?: Array<{ name?: string; artist?: { name?: string } }>;
}

interface MusicBrainzSearchResponse {
  recordings?: MusicBrainzRecording[];
}

interface AcousticBrainzLowLevel {
  rhythm?: { bpm?: number };
  message?: string;
}

function artistCreditName(recording: MusicBrainzRecording): string {
  const credit = recording['artist-credit'];
  if (!credit?.length) return '';
  return credit
    .map((part) => part.name ?? part.artist?.name ?? '')
    .filter(Boolean)
    .join(', ');
}

function expandHalfTimeCandidates(bpm: number): number[] {
  const rounded = Math.round(bpm);
  if (!Number.isFinite(rounded) || rounded <= 0) return [];

  const tempos = [rounded];
  // AcousticBrainz often reports half-time for four-on-the-floor pop.
  if (rounded >= 60 && rounded <= 110) {
    tempos.push(rounded * 2);
  } else if (rounded >= 140 && rounded <= 220) {
    tempos.push(Math.round(rounded / 2));
  }
  return [...new Set(tempos)];
}

async function fetchLowLevelBpm(mbid: string): Promise<number | null> {
  const res = await fetch(`https://acousticbrainz.org/api/v1/${mbid}/low-level`, {
    headers: { 'User-Agent': USER_AGENT },
  });
  if (res.status === 404) return null;
  if (!res.ok) {
    throw new Error(`AcousticBrainz failed: ${res.status}`);
  }

  const data = (await res.json()) as AcousticBrainzLowLevel;
  const bpm = data.rhythm?.bpm;
  return typeof bpm === 'number' && Number.isFinite(bpm) && bpm > 0 ? bpm : null;
}

/** Lookup tempo via MusicBrainz → AcousticBrainz. */
export async function searchAcousticBrainz(
  title: string,
  artist: string,
): Promise<TempoMatch[]> {
  const primaryArtist = artist.trim().split(',')[0]?.trim() || artist.trim();
  const query = `recording:"${title.trim()}" AND artist:"${primaryArtist}"`;
  const url = new URL('https://musicbrainz.org/ws/2/recording/');
  url.searchParams.set('query', query);
  url.searchParams.set('fmt', 'json');
  url.searchParams.set('limit', '8');

  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
  if (!res.ok) {
    throw new Error(`MusicBrainz search failed: ${res.status}`);
  }

  const data = (await res.json()) as MusicBrainzSearchResponse;
  const recordings = data.recordings ?? [];

  for (const recording of recordings) {
    const bpm = await fetchLowLevelBpm(recording.id);
    if (bpm == null) continue;

    const matchedArtist = artistCreditName(recording) || artist;
    const tempos = expandHalfTimeCandidates(bpm);

    return tempos.map((tempoBpm) => ({
      title: recording.title || title,
      artist: matchedArtist,
      tempoBpm,
      musicalKey: null,
      songUrl: `https://musicbrainz.org/recording/${recording.id}`,
      source: 'acousticbrainz' as const,
    }));
  }

  return [];
}
