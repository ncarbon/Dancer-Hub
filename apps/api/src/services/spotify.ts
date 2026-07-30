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
      preview_url: string | null;
    }>;
  };
}

export async function searchSpotifyTracks(title: string): Promise<SpotifyMatchCandidate[]> {
  const token = await getAccessToken();

  const url = new URL('https://api.spotify.com/v1/search');
  // Free-text query so "song artist" searches work for upload selection
  url.searchParams.set('q', title);
  url.searchParams.set('type', 'track');
  url.searchParams.set('limit', '8');

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
    previewUrl: item.preview_url,
  }));
}

export interface SpotifyAudioFeatures {
  danceability: number | null;
  timeSignature: number | null;
  tempo: number | null;
}

/**
 * Optional enrichment. New Spotify apps often get 403 on /audio-features —
 * return null in that case so callers can fall back to GetSongBPM signals.
 */
export async function getSpotifyAudioFeatures(
  trackId: string,
): Promise<SpotifyAudioFeatures | null> {
  try {
    const token = await getAccessToken();
    const res = await fetch(`https://api.spotify.com/v1/audio-features/${trackId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.status === 403 || res.status === 404) return null;
    if (!res.ok) {
      console.warn(`[spotify] audio-features ${res.status}`);
      return null;
    }

    const data = (await res.json()) as {
      danceability?: number;
      time_signature?: number;
      tempo?: number;
    };

    return {
      danceability:
        typeof data.danceability === 'number' ? data.danceability : null,
      timeSignature:
        typeof data.time_signature === 'number' ? data.time_signature : null,
      tempo: typeof data.tempo === 'number' ? data.tempo : null,
    };
  } catch (err) {
    console.warn('[spotify] audio-features failed:', err);
    return null;
  }
}
