import type { GetSongBpmMatch } from '@dancer-hub/shared';

// GetSongBPM's terms require a visible "Powered by GetSongBPM" attribution
// link wherever results are shown — handled in the web UI.

interface GetSongBpmSearchResponse {
  search:
    | Array<{
        title: string;
        artist: { name: string };
        tempo: string;
        key_of: string | null;
        uri: string | null;
        time_sig?: string | number | null;
        danceability?: number | string | null;
      }>
    | string // GetSongBPM returns a string here on error/no-match
    | { error?: string };
}

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeTitle(title: string): string {
  return title
    // "Cold Heart - PNAU Remix" -> "Cold Heart"
    .replace(/\s*[-(].*?\b(remix|edit|version|remaster(ed)?|live|acoustic)\b.*$/i, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function artistVariants(artist: string): string[] {
  const variants: string[] = [];
  const full = artist.trim();
  if (full) variants.push(full);

  // Spotify often returns "Elton John, Dua Lipa, PNAU"
  for (const part of full.split(',').map((p) => p.trim()).filter(Boolean)) {
    if (!variants.includes(part)) variants.push(part);
  }

  // "Elton John & Dua Lipa"
  for (const part of full.split(/\s*(?:&|feat\.?|ft\.?)\s*/i).map((p) => p.trim()).filter(Boolean)) {
    if (!variants.includes(part)) variants.push(part);
  }

  return variants;
}

function artistMatches(candidateArtist: string, queryArtist: string): boolean {
  const cand = normalizeText(candidateArtist);
  if (!cand) return false;
  return artistVariants(queryArtist)
    .map(normalizeText)
    .filter(Boolean)
    .some((variant) => cand.includes(variant) || variant.includes(cand));
}

function titleMatches(candidateTitle: string, queryTitle: string): boolean {
  const cand = normalizeText(candidateTitle);
  const query = normalizeText(normalizeTitle(queryTitle));
  if (!cand || !query) return false;
  return cand === query || cand.includes(query) || query.includes(cand);
}

function parseTimeSignature(value: string | number | null | undefined): number | null {
  if (value == null) return null;
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return Math.round(value);
  }
  const match = String(value).match(/(\d+)\s*\/\s*\d+/);
  if (match) return Number(match[1]);
  const asNum = Number(value);
  return Number.isFinite(asNum) && asNum > 0 ? Math.round(asNum) : null;
}

function parseDanceability(value: number | string | null | undefined): number | null {
  if (value == null || value === '') return null;
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return null;
  // GetSongBPM uses 0–100; Spotify used 0–1
  if (n > 1) return Math.max(0, Math.min(1, n / 100));
  return Math.max(0, Math.min(1, n));
}

function mapResults(data: GetSongBpmSearchResponse): GetSongBpmMatch[] {
  if (typeof data.search === 'string' || !Array.isArray(data.search)) {
    return [];
  }

  return data.search.map((item) => ({
    title: item.title,
    artist: item.artist.name,
    tempoBpm: item.tempo ? Number(item.tempo) : null,
    musicalKey: item.key_of ?? null,
    songUrl: item.uri,
    source: 'getsongbpm' as const,
    timeSignature: parseTimeSignature(item.time_sig),
    danceability: parseDanceability(item.danceability),
  }));
}

async function searchOnce(
  apiKey: string,
  type: 'both' | 'song',
  lookup: string,
): Promise<GetSongBpmMatch[]> {
  const url = new URL('https://api.getsong.co/search/');
  url.searchParams.set('api_key', apiKey);
  url.searchParams.set('type', type);
  url.searchParams.set('lookup', lookup);

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`GetSongBPM search failed: ${res.status} ${await res.text()}`);
  }

  return mapResults((await res.json()) as GetSongBpmSearchResponse);
}

export async function searchGetSongBpm(title: string, artist: string): Promise<GetSongBpmMatch[]> {
  const apiKey = process.env.GETSONGBPM_API_KEY;
  if (!apiKey) {
    throw new Error('GETSONGBPM_API_KEY is not set');
  }

  const titles = [title.trim(), normalizeTitle(title)].filter(
    (value, index, all) => value && all.indexOf(value) === index,
  );
  const artists = artistVariants(artist);

  // Try exact-ish lookups first, then progressively looser ones.
  for (const songTitle of titles) {
    for (const songArtist of artists) {
      const matches = await searchOnce(apiKey, 'both', `song:${songTitle} artist:${songArtist}`);
      if (matches.length > 0) return matches;
    }
  }

  // Title-only search, but require artist + title agreement so unrelated
  // catalog hits don't block AcousticBrainz / preview fallbacks.
  for (const songTitle of titles) {
    const matches = (await searchOnce(apiKey, 'song', songTitle)).filter(
      (match) =>
        artistMatches(match.artist, artist) && titleMatches(match.title, songTitle),
    );
    if (matches.length > 0) return matches;
  }

  return [];
}
