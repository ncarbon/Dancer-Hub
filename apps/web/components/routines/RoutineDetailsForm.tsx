'use client';

import { useRef, useState } from 'react';
import { fetchTrackMetadata } from '@/lib/api';
import type { SpotifyMatchCandidate, TempoMatch } from '@dancer-hub/shared';
import { ROUTINE_STYLES } from '@/lib/routineStyles';
import { probeMediaDuration } from '@/lib/mediaProbe';
import { fmtTime } from '@/lib/routineStore';
import HatchPlaceholder from './HatchPlaceholder';
import AudioRecorderModal from './AudioRecorderModal';

export interface RoutineDetails {
  name: string;
  style: string | null;
  audioFile: File | null;
  audioDurationSec: number;
  videoFile: File | null;
  videoDurationSec: number;
  spotifyTrackId: string | null;
  spotifyUrl: string | null;
  albumArtUrl: string | null;
  artist: string | null;
  tempoBpm: number | null;
  musicalKey: string | null;
}

function MediaDrop({
  label,
  hint,
  accept,
  file,
  durationSec,
  loading,
  onPick,
  extraAction,
}: {
  label: string;
  hint: string;
  accept: string;
  file: File | null;
  durationSec: number;
  loading: boolean;
  onPick: (file: File) => void;
  extraAction?: { label: string; onClick: () => void };
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div>
      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-brand-600">{label}</p>
      {file ? (
        <div className="relative h-28 overflow-hidden rounded-xl">
          <HatchPlaceholder className="absolute inset-0" />
          <div className="absolute inset-x-3 bottom-2.5 flex items-center justify-between gap-2">
            <p className="min-w-0 truncate text-xs text-gray-800">
              {file.name} · {fmtTime(durationSec)}
            </p>
            <span className="shrink-0 rounded-full border border-emerald-600 px-2 py-0.5 text-[10px] font-medium text-emerald-700 bg-white/80">
              ✓ Attached
            </span>
          </div>
        </div>
      ) : (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={loading}
            className="flex h-20 flex-1 flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-gray-300 hover:border-brand-500 transition-colors disabled:opacity-50"
          >
            {loading ? (
              <span className="text-xs text-gray-400">Loading…</span>
            ) : (
              <>
                <span className="text-xl text-brand-600">＋</span>
                <span className="text-xs text-gray-400">{hint}</span>
              </>
            )}
          </button>
          {extraAction && (
            <button
              type="button"
              onClick={extraAction.onClick}
              disabled={loading}
              className="w-28 shrink-0 rounded-xl border-2 border-dashed border-gray-300 text-xs text-gray-500 hover:border-brand-500 transition-colors disabled:opacity-50"
            >
              {extraAction.label}
            </button>
          )}
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onPick(f);
          e.target.value = '';
        }}
      />
    </div>
  );
}

function tempoSourceLabel(source: TempoMatch['source']): string {
  switch (source) {
    case 'acousticbrainz':
      return 'AcousticBrainz';
    case 'preview':
      return 'Preview analysis';
    default:
      return 'GetSongBPM';
  }
}

export default function RoutineDetailsForm({ onContinue }: { onContinue: (details: RoutineDetails) => void }) {
  const [formStep, setFormStep] = useState<'details' | 'bpm'>('details');
  const [name, setName] = useState('');
  const [style, setStyle] = useState<string | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoDurationSec, setVideoDurationSec] = useState(0);
  const [videoLoading, setVideoLoading] = useState(false);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioDurationSec, setAudioDurationSec] = useState(0);
  const [audioLoading, setAudioLoading] = useState(false);
  const [recorderOpen, setRecorderOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Spotify / BPM lookup (optional), via apps/api's /api/track-metadata endpoint
  const [spotifyQuery, setSpotifyQuery] = useState('');
  const [loadingMeta, setLoadingMeta] = useState(false);
  const [hasSearchedSpotify, setHasSearchedSpotify] = useState(false);
  const [spotifyCandidates, setSpotifyCandidates] = useState<SpotifyMatchCandidate[]>([]);
  const [selectedSpotify, setSelectedSpotify] = useState<SpotifyMatchCandidate | null>(null);
  const [bpmCandidates, setBpmCandidates] = useState<TempoMatch[]>([]);
  const [selectedBpm, setSelectedBpm] = useState<TempoMatch | null>(null);
  const [bpmNotFound, setBpmNotFound] = useState(false);
  const [manualBpm, setManualBpm] = useState('');
  const [manualKey, setManualKey] = useState('');

  async function handlePickVideo(file: File) {
    setVideoLoading(true);
    setError(null);
    try {
      const duration = await probeMediaDuration(file);
      setVideoFile(file);
      setVideoDurationSec(duration);
    } catch {
      setError('Could not read that video file. Try a different one.');
    } finally {
      setVideoLoading(false);
    }
  }

  async function handlePickAudio(file: File) {
    setAudioLoading(true);
    setError(null);
    try {
      const duration = await probeMediaDuration(file);
      setAudioFile(file);
      setAudioDurationSec(duration);
    } catch {
      setError('Could not read that audio file. Try a different one.');
    } finally {
      setAudioLoading(false);
    }
  }

  async function searchSpotify(e?: React.FormEvent) {
    e?.preventDefault();
    const query = spotifyQuery.trim() || name.trim();
    if (!query) {
      setError('Enter a song name to search Spotify');
      return;
    }
    setError(null);
    setLoadingMeta(true);
    setHasSearchedSpotify(true);
    try {
      const result = await fetchTrackMetadata({ title: query });
      setSpotifyCandidates(result.candidates as SpotifyMatchCandidate[]);
    } catch (err) {
      setSpotifyCandidates([]);
      setError(err instanceof Error ? err.message : 'Failed to search Spotify');
    } finally {
      setLoadingMeta(false);
    }
  }

  function selectSpotifyTrack(candidate: SpotifyMatchCandidate) {
    setSelectedSpotify(candidate);
    if (!name.trim()) setName(candidate.title);
    setSpotifyQuery(`${candidate.title} ${candidate.artist}`);
    setError(null);
    setSelectedBpm(null);
    setBpmCandidates([]);
    setBpmNotFound(false);
    setManualBpm('');
    setManualKey('');
  }

  function clearSpotifySelection() {
    setSelectedSpotify(null);
    setSelectedBpm(null);
    setBpmCandidates([]);
    setBpmNotFound(false);
    setManualBpm('');
    setManualKey('');
  }

  /** Returns true once a BPM is resolved (or confirmed unavailable) and it's safe to continue. */
  async function resolveBpmForSelection(candidate: SpotifyMatchCandidate): Promise<boolean> {
    setLoadingMeta(true);
    setError(null);
    try {
      const result = await fetchTrackMetadata({
        title: candidate.title,
        artist: candidate.artist,
        spotifyTrackId: candidate.spotifyTrackId,
      });
      const candidates = result.candidates as TempoMatch[];
      setBpmCandidates(candidates);
      setBpmNotFound(candidates.length === 0);
      if (candidates.length === 1) {
        setSelectedBpm(candidates[0]);
        return true;
      }
      if (candidates.length === 0) {
        setSelectedBpm(null);
        return true;
      }
      setSelectedBpm(null);
      setFormStep('bpm');
      return false;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch BPM');
      setBpmNotFound(true);
      return true;
    } finally {
      setLoadingMeta(false);
    }
  }

  function chooseBpm(candidate: TempoMatch) {
    setSelectedBpm(candidate);
    setFormStep('details');
  }

  async function handleContinueClick() {
    if (!canContinue) return;
    if (selectedSpotify && bpmCandidates.length === 0 && !bpmNotFound) {
      const resolved = await resolveBpmForSelection(selectedSpotify);
      if (!resolved) return;
    }
    onContinue({
      name: name.trim(),
      style,
      audioFile,
      audioDurationSec,
      videoFile,
      videoDurationSec,
      spotifyTrackId: selectedSpotify?.spotifyTrackId ?? null,
      spotifyUrl: selectedSpotify?.spotifyUrl ?? null,
      albumArtUrl: selectedSpotify?.albumArtUrl ?? null,
      artist: selectedSpotify?.artist ?? selectedBpm?.artist ?? null,
      tempoBpm: selectedBpm?.tempoBpm ?? (manualBpm.trim() ? Number(manualBpm) : null),
      musicalKey: selectedBpm?.musicalKey ?? (manualKey.trim() || null),
    });
  }

  const canContinue = name.trim().length > 0;

  if (formStep === 'bpm') {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Confirm tempo</h2>
          <p className="text-sm text-gray-500 mt-1">Multiple BPM matches for {selectedSpotify?.artist}. Pick one.</p>
        </div>

        <ul className="space-y-3">
          {bpmCandidates.map((candidate, index) => (
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
                    {tempoSourceLabel(candidate.source)}
                  </span>
                </div>
                <p className="text-sm text-brand-600 mt-2">
                  {candidate.tempoBpm ? `${candidate.tempoBpm} BPM` : 'BPM unknown'}
                  {candidate.musicalKey ? ` · ${candidate.musicalKey}` : ''}
                </p>
              </button>
            </li>
          ))}
        </ul>

        <button
          type="button"
          onClick={() => {
            setBpmNotFound(true);
            setFormStep('details');
          }}
          className="w-full border border-gray-300 text-gray-700 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50"
        >
          None of these — enter manually
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-7">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">New routine</h1>
      </div>

      <div>
        <label htmlFor="spotify-query" className="mb-2 block text-xs font-medium uppercase tracking-wide text-brand-600">
          Search Spotify <span className="normal-case font-normal text-gray-400">(optional — for BPM &amp; key)</span>
        </label>
        <div className="flex gap-2">
          <input
            id="spotify-query"
            type="text"
            value={spotifyQuery}
            onChange={(e) => setSpotifyQuery(e.target.value)}
            placeholder="Song or artist — e.g. Levitating Dua Lipa"
            className="flex-1 border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          <button
            type="button"
            onClick={() => searchSpotify()}
            disabled={loadingMeta || !spotifyQuery.trim()}
            className="shrink-0 px-4 py-2.5 rounded-lg text-sm font-medium bg-gray-900 text-white hover:bg-gray-800 disabled:opacity-50"
          >
            {loadingMeta ? 'Searching…' : 'Search'}
          </button>
        </div>

        {selectedSpotify ? (
          <div className="mt-3 flex items-center gap-3 border border-brand-500 bg-brand-50 rounded-xl p-3">
            {selectedSpotify.albumArtUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={selectedSpotify.albumArtUrl} alt="" className="w-12 h-12 rounded-md object-cover shrink-0" />
            ) : (
              <div className="w-12 h-12 rounded-md bg-brand-100 text-brand-600 flex items-center justify-center shrink-0">♪</div>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-brand-600 mb-0.5">Selected from Spotify</p>
              <p className="font-medium text-gray-900 truncate">{selectedSpotify.title}</p>
              <p className="text-sm text-gray-500 truncate">
                {selectedSpotify.artist}
                {selectedBpm?.tempoBpm != null ? ` · ${selectedBpm.tempoBpm} BPM` : ''}
                {selectedBpm?.musicalKey ? ` · ${selectedBpm.musicalKey}` : ''}
              </p>
            </div>
            <button type="button" onClick={clearSpotifySelection} className="text-sm text-gray-500 hover:text-gray-800 shrink-0">
              Clear
            </button>
          </div>
        ) : (
          <>
            {hasSearchedSpotify && !loadingMeta && spotifyCandidates.length === 0 && (
              <p className="mt-2 text-sm text-gray-500">No Spotify matches. Try a different search, or continue without one.</p>
            )}
            {spotifyCandidates.length > 0 && (
              <ul className="mt-3 space-y-2 max-h-64 overflow-y-auto">
                {spotifyCandidates.map((candidate) => (
                  <li key={candidate.spotifyTrackId}>
                    <button
                      type="button"
                      onClick={() => selectSpotifyTrack(candidate)}
                      className="w-full flex items-center gap-3 border border-gray-200 rounded-xl p-3 text-left hover:border-brand-500 transition-colors"
                    >
                      {candidate.albumArtUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={candidate.albumArtUrl} alt="" className="w-12 h-12 rounded-md object-cover shrink-0" />
                      ) : (
                        <div className="w-12 h-12 rounded-md bg-brand-100 text-brand-600 flex items-center justify-center shrink-0">♪</div>
                      )}
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900 truncate">{candidate.title}</p>
                        <p className="text-sm text-gray-500 truncate">{candidate.artist}</p>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}

        {(bpmNotFound || (!selectedSpotify && (manualBpm || manualKey))) && (
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="manual-bpm" className="block text-xs font-medium text-gray-600 mb-1">
                BPM (optional)
              </label>
              <input
                id="manual-bpm"
                type="number"
                min={40}
                max={220}
                value={manualBpm}
                onChange={(e) => setManualBpm(e.target.value)}
                placeholder="e.g. 120"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <div>
              <label htmlFor="manual-key" className="block text-xs font-medium text-gray-600 mb-1">
                Key (optional)
              </label>
              <input
                id="manual-key"
                type="text"
                value={manualKey}
                onChange={(e) => setManualKey(e.target.value)}
                placeholder="e.g. Am"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>
        )}
        {!selectedSpotify && !manualBpm && !manualKey && (
          <button
            type="button"
            onClick={() => setBpmNotFound(true)}
            className="mt-2 text-xs text-gray-400 hover:text-gray-600"
          >
            Enter BPM/key manually instead
          </button>
        )}
      </div>

      <div>
        <label htmlFor="routine-name" className="mb-2 block text-xs font-medium uppercase tracking-wide text-brand-600">
          Name
        </label>
        <input
          id="routine-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Routine name…"
          className="w-full border-b-[1.5px] border-gray-900 bg-transparent pb-2 text-lg focus:outline-none"
        />
      </div>

      <MediaDrop
        label="Video"
        hint="Choose a video file"
        accept="video/*"
        file={videoFile}
        durationSec={videoDurationSec}
        loading={videoLoading}
        onPick={handlePickVideo}
      />

      <MediaDrop
        label="Audio"
        hint="Choose an audio file"
        accept="audio/*"
        file={audioFile}
        durationSec={audioDurationSec}
        loading={audioLoading}
        onPick={handlePickAudio}
        extraAction={{ label: 'Record instead', onClick: () => setRecorderOpen(true) }}
      />

      <div>
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-brand-600">Style</p>
        <div className="flex flex-wrap gap-2">
          {ROUTINE_STYLES.map((s) => {
            const active = style === s;
            return (
              <button
                key={s}
                type="button"
                onClick={() => setStyle(active ? null : s)}
                className={`rounded-full border px-3.5 py-1.5 text-sm transition-colors ${
                  active
                    ? 'border-brand-600 bg-brand-600 text-white'
                    : 'border-gray-300 text-gray-700 hover:border-brand-500'
                }`}
              >
                {s}
              </button>
            );
          })}
        </div>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <button
        type="button"
        disabled={!canContinue || loadingMeta}
        onClick={() => void handleContinueClick()}
        className="w-full rounded-full bg-gray-900 py-3.5 text-sm font-medium text-white disabled:opacity-30 disabled:cursor-not-allowed"
      >
        {loadingMeta ? 'Looking up BPM…' : 'Continue to editor'}
      </button>

      <AudioRecorderModal
        open={recorderOpen}
        onClose={() => setRecorderOpen(false)}
        onAttach={(file, durationSec) => {
          setAudioFile(file);
          setAudioDurationSec(durationSec);
          setRecorderOpen(false);
        }}
      />
    </div>
  );
}
