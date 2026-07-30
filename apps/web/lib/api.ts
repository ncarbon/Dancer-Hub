import type { TrackMetadataResponse } from '@dancer-hub/shared';

function getApiBaseUrl(): string {
  const base = process.env.NEXT_PUBLIC_API_URL;
  if (!base) {
    throw new Error('NEXT_PUBLIC_API_URL is not set');
  }
  return base.replace(/\/$/, '');
}

export async function fetchTrackMetadata(params: {
  title: string;
  artist?: string;
  spotifyTrackId?: string;
}): Promise<TrackMetadataResponse> {
  const url = new URL(`${getApiBaseUrl()}/api/track-metadata`);
  url.searchParams.set('title', params.title);
  if (params.artist) {
    url.searchParams.set('artist', params.artist);
  }
  if (params.spotifyTrackId) {
    url.searchParams.set('spotifyTrackId', params.spotifyTrackId);
  }

  const res = await fetch(url.toString());
  if (!res.ok) {
    let message = `Metadata request failed (${res.status})`;
    try {
      const body = (await res.json()) as { error?: string };
      if (body.error) message = body.error;
    } catch {
      // ignore non-JSON error bodies
    }
    throw new Error(message);
  }

  return res.json() as Promise<TrackMetadataResponse>;
}
