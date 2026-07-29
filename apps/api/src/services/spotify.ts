import type { SpotifyMatchCandidate } from '@dancer-hub/shared';

// Client Credentials flow — no user auth needed for search-only access.
// https://developer.spotify.com/documentation/web-api/tutorials/client-credentials-flow
let cachedToken: { value: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now()) {
    return cachedToken.value;
  }

  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error('SPOTIFY_CLIENT_ID / SPOTIFY_CLIENT_SECRET are not set');
  }

  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
    },
    body: 'grant_type=client_credentials',
  });

  if (!res.ok) {
    throw new Error(`Spotify token request failed: ${res.status} ${await res.text()}`);
  }

  const data = (await res.json()) as { access_token: string; expires_in: number };
  cachedToken = {
    value: data.access_token,
    // refresh a little early to avoid edge-of-expiry failures
    expiresAt: Date.now() + (data.expires_in - 60) * 1000,
  };
  return cachedToken.value;
}

interface SpotifySearchResponse {
  tracks: {
    items: Array<{
      id: string;
      name: string;
      artists: Array<{ name: string }>;
      album: { images: Array<{ url: string }> };
      external_urls: { spotify: string };
    }>;
  };
}

export async function searchSpotifyTracks(title: string): Promise<SpotifyMatchCandidate[]> {
  const token = await getAccessToken();

  const url = new URL('https://api.spotify.com/v1/search');
  url.searchParams.set('q', `track:${title}`);
  url.searchParams.set('type', 'track');
  url.searchParams.set('limit', '5');

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    throw new Error(`Spotify search failed: ${res.status} ${await res.text()}`);
  }

  const data = (await res.json()) as SpotifySearchResponse;

  return data.tracks.items.map((item) => ({
    spotifyTrackId: item.id,
    title: item.name,
    artist: item.artists.map((a) => a.name).join(', '),
    albumArtUrl: item.album.images[0]?.url ?? null,
    spotifyUrl: item.external_urls.spotify,
  }));
}
