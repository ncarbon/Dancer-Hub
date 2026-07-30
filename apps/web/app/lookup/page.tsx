'use client';

import { useEffect, useState } from 'react';
import { fetchTrackMetadata } from '@/lib/api';
import SpotifyPreviewButton, {
  playSharedPreview,
  stopSharedPreview,
  unlockPreviewAudio,
} from '@/components/SpotifyPreviewButton';
import StyleDemo from '@/components/StyleDemo';
import {
  matchDanceStyles,
  type DanceStyleMatch,
  type TempoMatch,
  type TempoProvider,
  type SpotifyMatchCandidate,
} from '@dancer-hub/shared';

type Step = 'search' | 'bpm' | 'results';

function tempoSourceLabel(provider: TempoProvider | null, match: TempoMatch | null): string {
  const source = match?.source ?? provider;
  switch (source) {
    case 'acousticbrainz':
      return 'AcousticBrainz';
    case 'preview':
      return 'Preview analysis';
    case 'getsongbpm':
    default:
      return 'GetSongBPM';
  }
}

function tempoFeelHint(candidate: TempoMatch, all: TempoMatch[]): string | null {
  const bpm = candidate.tempoBpm;
  if (bpm == null) return null;

  const related = all.filter(
    (other) =>
      other !== candidate &&
      other.tempoBpm != null &&
      (other.source ?? null) === (candidate.source ?? null) &&
      (other.tempoBpm === bpm * 2 || other.tempoBpm * 2 === bpm),
  );
  if (related.length === 0) return null;

  const hasDouble = related.some((other) => other.tempoBpm === bpm * 2);
  return hasDouble ? 'Half-time feel (slower count)' : 'Full-time / double-time feel';
}

export default function SongLookupPage() {
  const [query, setQuery] = useState('');
  const [step, setStep] = useState<Step>('search');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [hasSearched, setHasSearched] = useState(false);
  const [spotifyCandidates, setSpotifyCandidates] = useState<SpotifyMatchCandidate[]>([]);
  const [selectedSpotify, setSelectedSpotify] = useState<SpotifyMatchCandidate | null>(null);

  const [bpmCandidates, setBpmCandidates] = useState<TempoMatch[]>([]);
  const [selectedBpm, setSelectedBpm] = useState<TempoMatch | null>(null);
  const [tempoProvider, setTempoProvider] = useState<TempoProvider | null>(null);
  const [audioPreviewUrl, setAudioPreviewUrl] = useState<string | null>(null);
  const [manualBpm, setManualBpm] = useState('');
  const [bpmNotFound, setBpmNotFound] = useState(false);

  const resolvedBpm =
    selectedBpm?.tempoBpm ??
    (manualBpm.trim() && Number.isFinite(Number(manualBpm)) ? Number(manualBpm) : null);

  const styleMatches: DanceStyleMatch[] =
    resolvedBpm != null
      ? matchDanceStyles(resolvedBpm, {
          timeSignature: selectedBpm?.timeSignature,
          danceability: selectedBpm?.danceability,
        })
      : [];

  useEffect(() => {
    if (step !== 'results' || !selectedSpotify) return;

    console.groupCollapsed(
      `[lookup] ${selectedSpotify.title} — ${selectedSpotify.artist}`,
    );
    console.log('spotify', {
      id: selectedSpotify.spotifyTrackId,
      title: selectedSpotify.title,
      artist: selectedSpotify.artist,
      previewUrl: selectedSpotify.previewUrl,
    });
    console.log('selected tempo match', selectedBpm);
    console.log('resolved BPM', resolvedBpm);
    console.log('tempo provider', tempoProvider);
    console.log('all tempo candidates', bpmCandidates);
    console.log(
      'style ranking',
      styleMatches.map((s, i) => ({
        rank: i + 1,
        style: s.name,
        fit: Number(s.fit.toFixed(3)),
        bpmRange: `${s.bpmMin}–${s.bpmMax}`,
        sweetSpot: s.bpmSweetSpot,
        rankWeight: s.rankWeight ?? 1,
        danceabilityBias: s.danceabilityBias,
        reasons: s.matchReasons,
      })),
    );
    console.groupEnd();
  }, [
    step,
    selectedSpotify,
    selectedBpm,
    resolvedBpm,
    tempoProvider,
    bpmCandidates,
    styleMatches,
  ]);

  async function searchSpotify(e?: React.FormEvent) {
    e?.preventDefault();
    const q = query.trim();
    if (!q) {
      setError('Enter a song name to search');
      return;
    }

    setError(null);
    setLoading(true);
    setHasSearched(true);
    setSelectedSpotify(null);
    setSelectedBpm(null);
    setBpmCandidates([]);
    setTempoProvider(null);
    setAudioPreviewUrl(null);
    setBpmNotFound(false);
    setManualBpm('');
    setStep('search');

    try {
      const result = await fetchTrackMetadata({ title: q });
      setSpotifyCandidates(result.candidates as SpotifyMatchCandidate[]);
    } catch (err) {
      setSpotifyCandidates([]);
      setError(err instanceof Error ? err.message : 'Failed to search Spotify');
    } finally {
      setLoading(false);
    }
  }

  async function selectSpotifyTrack(candidate: SpotifyMatchCandidate) {
    setSelectedSpotify(candidate);
    setQuery(`${candidate.title} ${candidate.artist}`);
    setError(null);
    setLoading(true);

    // Unlock audio during the click so playback after the BPM request is allowed.
    unlockPreviewAudio();

    try {
      const result = await fetchTrackMetadata({
        title: candidate.title,
        artist: candidate.artist,
        spotifyTrackId: candidate.spotifyTrackId,
      });
      console.log('[lookup] raw tempo API response', {
        title: candidate.title,
        artist: candidate.artist,
        spotifyTrackId: candidate.spotifyTrackId,
        result,
      });
      const candidates = result.candidates as TempoMatch[];
      const preview =
        candidate.previewUrl ?? result.audioPreviewUrl ?? null;
      setBpmCandidates(candidates);
      setTempoProvider(
        result.provider === 'spotify' ? null : (result.provider as TempoProvider),
      );
      setAudioPreviewUrl(preview);
      setBpmNotFound(candidates.length === 0);

      if (preview) {
        void playSharedPreview(preview).catch(() => undefined);
      }

      if (candidates.length === 1) {
        setSelectedBpm(candidates[0]);
        setStep('results');
      } else if (candidates.length === 0) {
        setSelectedBpm(null);
        setStep('results');
      } else {
        setSelectedBpm(null);
        setStep('bpm');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch BPM');
      setBpmNotFound(true);
      setSelectedBpm(null);
      setTempoProvider(null);
      setAudioPreviewUrl(candidate.previewUrl);
      setStep('results');
    } finally {
      setLoading(false);
    }
  }

  function chooseBpm(candidate: TempoMatch) {
    unlockPreviewAudio();
    setSelectedBpm(candidate);
    setManualBpm('');
    setStep('results');
    if (audioPreviewUrl) {
      void playSharedPreview(audioPreviewUrl).catch(() => undefined);
    }
  }

  function reset() {
    stopSharedPreview();
    setStep('search');
    setSelectedSpotify(null);
    setSelectedBpm(null);
    setBpmCandidates([]);
    setTempoProvider(null);
    setAudioPreviewUrl(null);
    setBpmNotFound(false);
    setManualBpm('');
    setError(null);
  }

  if (step === 'bpm') {
    return (
      <div className="max-w-lg mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Confirm tempo</h1>
          <p className="text-sm text-gray-500 mt-1">
            Multiple BPM matches for {selectedSpotify?.artist}. Pick one.
          </p>
        </div>

        <ul className="space-y-2">
          {bpmCandidates.map((candidate, index) => {
            const feel = tempoFeelHint(candidate, bpmCandidates);
            const source = tempoSourceLabel(tempoProvider, candidate);
            return (
              <li key={`${candidate.title}-${candidate.artist}-${candidate.tempoBpm}-${index}`}>
                <button
                  type="button"
                  onClick={() => chooseBpm(candidate)}
                  className="w-full border border-gray-200 rounded-xl p-4 text-left hover:border-brand-500 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900 truncate">{candidate.title}</p>
                      <p className="text-sm text-gray-500 truncate">{candidate.artist}</p>
                    </div>
                    <span className="shrink-0 rounded-md bg-gray-100 px-2 py-1 text-[11px] font-medium text-gray-600">
                      {source}
                    </span>
                  </div>
                  <p className="text-sm text-brand-600 mt-2 font-medium">
                    {candidate.tempoBpm ? `${candidate.tempoBpm} BPM` : 'BPM unknown'}
                    {candidate.musicalKey ? ` · ${candidate.musicalKey}` : ''}
                  </p>
                  {feel && <p className="text-xs text-gray-400 mt-1">{feel}</p>}
                </button>
              </li>
            );
          })}
        </ul>

        <p className="text-xs text-gray-400">
          {tempoProvider === 'acousticbrainz' || tempoProvider === 'preview'
            ? 'Multiple tempo readings (often half-time vs full-time). Pick the one that matches the groove.'
            : (
              <>
                Tempo data powered by{' '}
                <a
                  href="https://getsongbpm.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-gray-500"
                >
                  GetSongBPM
                </a>
              </>
            )}
        </p>

        <button
          type="button"
          onClick={() => {
            setBpmNotFound(true);
            setSelectedBpm(null);
            setStep('results');
          }}
          className="text-sm text-gray-500 hover:text-gray-800"
        >
          None of these — enter BPM manually
        </button>
      </div>
    );
  }

  if (step === 'results' && selectedSpotify) {
    return (
      <div className="max-w-lg mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Song lookup</h1>
          <p className="text-sm text-gray-500 mt-1">
            Suggested styles are based on typical tempo ranges — always check the groove.
          </p>
        </div>

        <div className="border border-gray-200 rounded-xl p-4 bg-white space-y-3">
          <div className="flex items-center gap-3">
            {selectedSpotify.albumArtUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={selectedSpotify.albumArtUrl}
                alt=""
                className="w-16 h-16 rounded-md object-cover shrink-0"
              />
            ) : (
              <div className="w-16 h-16 rounded-md bg-brand-100 text-brand-600 flex items-center justify-center shrink-0 text-xl">
                ♪
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-gray-900 truncate">{selectedSpotify.title}</p>
              <p className="text-sm text-gray-500 truncate">{selectedSpotify.artist}</p>
              {selectedBpm?.tempoBpm != null && (
                <p className="text-sm text-brand-600 font-medium mt-1">
                  {selectedBpm.tempoBpm} BPM
                  {selectedBpm.timeSignature ? ` · ${selectedBpm.timeSignature}/4` : ''}
                  {selectedBpm.danceability != null
                    ? ` · danceability ${Math.round(selectedBpm.danceability * 100)}`
                    : ''}
                  {selectedBpm.musicalKey ? ` · ${selectedBpm.musicalKey}` : ''}
                  <span className="text-gray-400 font-normal">
                    {' '}
                    · {tempoSourceLabel(tempoProvider, selectedBpm)}
                  </span>
                </p>
              )}
            </div>
          </div>
          <SpotifyPreviewButton
            variant="block"
            spotifyTrackId={selectedSpotify.spotifyTrackId}
            previewUrl={audioPreviewUrl ?? selectedSpotify.previewUrl}
            spotifyUrl={selectedSpotify.spotifyUrl}
          />
        </div>

        {(bpmNotFound || selectedBpm?.tempoBpm == null) && (
          <div>
            <label htmlFor="manual-bpm" className="block text-xs font-medium text-gray-600 mb-1">
              BPM {bpmNotFound ? '(not found — enter manually)' : '(optional)'}
            </label>
            <input
              id="manual-bpm"
              type="number"
              min={40}
              max={300}
              value={manualBpm}
              onChange={(e) => setManualBpm(e.target.value)}
              placeholder="e.g. 118"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
        )}

        {resolvedBpm != null && (
          <div>
            <h2 className="text-sm font-semibold text-gray-700 mb-3">
              Compatible styles around {resolvedBpm} BPM
            </h2>
            {styleMatches.length === 0 ? (
              <p className="text-sm text-gray-500">
                No styles in our list match this tempo closely. Try adjusting the BPM or picking a
                different track version.
              </p>
            ) : (
              <ul className="space-y-3">
                {styleMatches.map((style) => (
                  <li
                    key={style.id}
                    className="border border-gray-200 rounded-xl p-4 bg-white"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-gray-900">{style.name}</p>
                        <p className="text-sm text-brand-600 mt-0.5">Count: {style.countLabel}</p>
                      </div>
                      <span className="shrink-0 text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded-md">
                        {style.bpmMin}–{style.bpmMax} BPM
                      </span>
                    </div>
                    <StyleDemo
                      name={style.name}
                      countLabel={style.countLabel}
                      demoUrl={style.demoUrl}
                      demoPosterUrl={style.demoPosterUrl}
                      demoCredit={style.demoCredit}
                    />
                    <p className="text-sm text-gray-600 mt-2">{style.musicNotes}</p>
                    {style.matchReasons && style.matchReasons.length > 0 && (
                      <p className="text-xs text-gray-400 mt-1">
                        Why: {style.matchReasons.join(' · ')}
                      </p>
                    )}
                    {style.tip && (
                      <p className="text-xs text-gray-400 mt-2">{style.tip}</p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {resolvedBpm == null && !bpmNotFound && selectedBpm && (
          <p className="text-sm text-gray-500">
            This match didn’t include a tempo. Enter a BPM above to see style suggestions.
          </p>
        )}

        {selectedBpm && (
          <p className="text-xs text-gray-400">
            Tempo estimate from {tempoSourceLabel(tempoProvider, selectedBpm)}
            {tempoProvider === 'getsongbpm' || selectedBpm.source === 'getsongbpm' ? (
              <>
                {' '}
                (
                <a
                  href="https://getsongbpm.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-gray-500"
                >
                  GetSongBPM
                </a>
                )
              </>
            ) : null}
            . Always confirm against the groove.
          </p>
        )}

        {error && <p className="text-red-500 text-sm">{error}</p>}

        <button
          type="button"
          onClick={reset}
          className="w-full border border-gray-300 text-gray-700 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50"
        >
          Look up another song
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Song lookup</h1>
        <p className="text-sm text-gray-500 mt-1">
          Find a song’s BPM and see which dance styles often fit that tempo.
        </p>
      </div>

      <form onSubmit={searchSpotify} className="space-y-4">
        <div>
          <label htmlFor="lookup-query" className="block text-sm font-medium text-gray-700 mb-1">
            Search Spotify
          </label>
          <div className="flex gap-2">
            <input
              id="lookup-query"
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Song or artist — e.g. Levitating Dua Lipa"
              className="flex-1 border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            <button
              type="submit"
              disabled={loading || !query.trim()}
              className="shrink-0 px-4 py-2.5 rounded-lg text-sm font-medium bg-gray-900 text-white hover:bg-gray-800 disabled:opacity-50"
            >
              {loading ? 'Searching…' : 'Search'}
            </button>
          </div>
        </div>
      </form>

      {error && <p className="text-red-500 text-sm">{error}</p>}

      {hasSearched && !loading && spotifyCandidates.length === 0 && (
        <p className="text-sm text-gray-500">No Spotify matches. Try a different search.</p>
      )}

      {spotifyCandidates.length > 0 && (
        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">Select a track</p>
          <ul className="space-y-2 max-h-96 overflow-y-auto">
            {spotifyCandidates.map((candidate) => (
              <li key={candidate.spotifyTrackId}>
                <div className="border border-gray-200 rounded-xl p-3 hover:border-brand-500 transition-colors">
                  <div className="flex flex-wrap items-start gap-2">
                    <button
                      type="button"
                      onClick={() => selectSpotifyTrack(candidate)}
                      disabled={loading}
                      className="min-w-0 flex-1 flex items-center gap-3 text-left disabled:opacity-50"
                    >
                      {candidate.albumArtUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={candidate.albumArtUrl}
                          alt=""
                          className="w-12 h-12 rounded-md object-cover shrink-0"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-md bg-brand-100 text-brand-600 flex items-center justify-center shrink-0">
                          ♪
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900 truncate">{candidate.title}</p>
                        <p className="text-sm text-gray-500 truncate">{candidate.artist}</p>
                      </div>
                    </button>
                    <SpotifyPreviewButton
                      spotifyTrackId={candidate.spotifyTrackId}
                      previewUrl={candidate.previewUrl}
                      spotifyUrl={candidate.spotifyUrl}
                    />
                  </div>
                </div>
              </li>
            ))}
          </ul>
          {loading && (
            <p className="text-sm text-gray-400 mt-3 text-center">Looking up BPM…</p>
          )}
        </div>
      )}
    </div>
  );
}
