import { Router } from 'express';
import type { TrackMetadataResponse } from '@dancer-hub/shared';
import { searchSpotifyTracks } from '../services/spotify';
import { lookupTempo } from '../services/tempoLookup';

export const trackMetadataRouter: Router = Router();

// GET /api/track-metadata?title=          -> Spotify candidates (step 1)
// GET /api/track-metadata?title=&artist=  -> tempo candidates with fallbacks:
//   GetSongBPM → AcousticBrainz → Deezer preview analysis
// Optional: &spotifyTrackId= to try Spotify audio-features enrichment
trackMetadataRouter.get('/', async (req, res) => {
  const title = typeof req.query.title === 'string' ? req.query.title.trim() : '';
  const artist = typeof req.query.artist === 'string' ? req.query.artist.trim() : '';
  const spotifyTrackId =
    typeof req.query.spotifyTrackId === 'string' ? req.query.spotifyTrackId.trim() : '';

  if (!title) {
    return res.status(400).json({ error: 'title query param is required' });
  }

  try {
    if (artist) {
      const result = await lookupTempo(title, artist, spotifyTrackId || undefined);
      const response: TrackMetadataResponse = {
        provider: result.provider,
        status: result.status,
        candidates: result.candidates,
        audioPreviewUrl: result.audioPreviewUrl,
      };
      return res.json(response);
    }

    const candidates = await searchSpotifyTracks(title);
    const response: TrackMetadataResponse = {
      provider: 'spotify',
      status: candidates.length === 0 ? 'not_found' : candidates.length === 1 ? 'matched' : 'ambiguous',
      candidates,
    };
    return res.json(response);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return res.status(502).json({ error: message });
  }
});
