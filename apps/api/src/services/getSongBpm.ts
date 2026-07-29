import type { GetSongBpmMatch } from '@dancer-hub/shared';

// TODO(phase-A verification): this implementation is built against GetSongBPM's
// published docs (https://getsongbpm.com/api), not a live-tested response —
// no API key was available yet when this was written. Before relying on it,
// run a real `curl` against /search/ with a known title+artist and confirm:
//   - the exact `lookup` string format for type=both (title/artist ordering,
//     whether spaces need URL-encoding beyond the standard encodeURIComponent)
//   - the shape of `key_of` vs `key`/`open_key` fields for musical key
//   - the zero-match response shape (currently assumed to be `{ search: 'error message' }`
//     or an empty `search` array — GetSongBPM's docs are inconsistent on this)
// GetSongBPM's terms require a visible "Powered by GetSongBPM" attribution
// link wherever results are shown — add that in the web UI, not here.

interface GetSongBpmSearchResponse {
  search:
    | Array<{
        title: string;
        artist: { name: string };
        tempo: string;
        key_of: string | null;
        uri: string | null;
      }>
    | string; // GetSongBPM returns a string here on error/no-match
}

export async function searchGetSongBpm(title: string, artist: string): Promise<GetSongBpmMatch[]> {
  const apiKey = process.env.GETSONGBPM_API_KEY;
  if (!apiKey) {
    throw new Error('GETSONGBPM_API_KEY is not set');
  }

  const url = new URL('https://api.getsong.co/search/');
  url.searchParams.set('api_key', apiKey);
  url.searchParams.set('type', 'both');
  url.searchParams.set('lookup', `song:${title} artist:${artist}`);

  const res = await fetch(url);

  if (!res.ok) {
    throw new Error(`GetSongBPM search failed: ${res.status} ${await res.text()}`);
  }

  const data = (await res.json()) as GetSongBpmSearchResponse;

  if (typeof data.search === 'string' || !Array.isArray(data.search)) {
    return [];
  }

  return data.search.map((item) => ({
    title: item.title,
    artist: item.artist.name,
    tempoBpm: item.tempo ? Number(item.tempo) : null,
    musicalKey: item.key_of ?? null,
    songUrl: item.uri,
  }));
}
