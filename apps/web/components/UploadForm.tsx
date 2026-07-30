'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { fetchTrackMetadata } from '@/lib/api';
import type { GetSongBpmMatch, SpotifyMatchCandidate } from '@dancer-hub/shared';

type Step = 'form' | 'bpm' | 'confirm';

export default function UploadForm() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [spotifyQuery, setSpotifyQuery] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [step, setStep] = useState<Step>('form');
  const [uploading, setUploading] = useState(false);
  const [loadingMeta, setLoadingMeta] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [spotifyCandidates, setSpotifyCandidates] = useState<SpotifyMatchCandidate[]>([]);
  const [hasSearchedSpotify, setHasSearchedSpotify] = useState(false);
  const [selectedSpotify, setSelectedSpotify] = useState<SpotifyMatchCandidate | null>(null);
  const [bpmCandidates, setBpmCandidates] = useState<GetSongBpmMatch[]>([]);
  const [selectedBpm, setSelectedBpm] = useState<GetSongBpmMatch | null>(null);
  const [manualBpm, setManualBpm] = useState('');
  const [manualKey, setManualKey] = useState('');
  const [bpmNotFound, setBpmNotFound] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  async function searchSpotify(e?: React.FormEvent) {
    e?.preventDefault();
    const query = spotifyQuery.trim() || title.trim();
    if (!query) {
      setError('Enter a song name to search Spotify');
      return;
    }

    setError(null);
    setLoadingMeta(true);
    setHasSearchedSpotify(true);
    try {
      const result = await fetchTrackMetadata({ title: query });
      const candidates = result.candidates as SpotifyMatchCandidate[];
      setSpotifyCandidates(candidates);
    } catch (err) {
      setSpotifyCandidates([]);
      setError(err instanceof Error ? err.message : 'Failed to search Spotify');
    } finally {
      setLoadingMeta(false);
    }
  }

  function selectSpotifyTrack(candidate: SpotifyMatchCandidate) {
    setSelectedSpotify(candidate);
    setTitle(candidate.title);
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

  async function fetchBpmForSelection(candidate: SpotifyMatchCandidate) {
    setLoadingMeta(true);
    setError(null);
    try {
      const result = await fetchTrackMetadata({
        title: candidate.title,
        artist: candidate.artist,
        spotifyTrackId: candidate.spotifyTrackId,
      });
      const candidates = result.candidates as GetSongBpmMatch[];
      setBpmCandidates(candidates);
      setBpmNotFound(candidates.length === 0);
      if (candidates.length === 1) {
        setSelectedBpm(candidates[0]);
        setStep('confirm');
      } else if (candidates.length === 0) {
        setSelectedBpm(null);
        setStep('confirm');
      } else {
        setSelectedBpm(null);
        setStep('bpm');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch BPM');
      setBpmNotFound(true);
      setStep('confirm');
    } finally {
      setLoadingMeta(false);
    }
  }

  async function continueFromForm(e: React.FormEvent) {
    e.preventDefault();
    if (!file || !title.trim()) return;

    if (selectedSpotify) {
      await fetchBpmForSelection(selectedSpotify);
      return;
    }

    setSelectedBpm(null);
    setBpmCandidates([]);
    setBpmNotFound(false);
    setManualBpm('');
    setManualKey('');
    setStep('confirm');
  }

  function chooseBpm(candidate: GetSongBpmMatch) {
    setSelectedBpm(candidate);
    setStep('confirm');
  }

  async function handleUpload() {
    if (!file || !title.trim()) return;

    setUploading(true);
    setError(null);

    const ext = file.name.split('.').pop();
    const filePath = `${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('audio-tracks')
      .upload(filePath, file, { contentType: file.type });

    if (uploadError) {
      setError(uploadError.message);
      setUploading(false);
      return;
    }

    const parsedManualBpm = manualBpm.trim() ? Number(manualBpm) : null;
    const tempoBpm =
      selectedBpm?.tempoBpm ??
      (parsedManualBpm !== null && Number.isFinite(parsedManualBpm) ? parsedManualBpm : null);
    const musicalKey = selectedBpm?.musicalKey ?? (manualKey.trim() || null);

    const { data: track, error: dbError } = await supabase
      .from('audio_tracks')
      .insert({
        title: title.trim(),
        file_path: filePath,
        file_name: file.name,
        spotify_track_id: selectedSpotify?.spotifyTrackId ?? null,
        spotify_url: selectedSpotify?.spotifyUrl ?? null,
        album_art_url: selectedSpotify?.albumArtUrl ?? null,
        artist: selectedSpotify?.artist ?? selectedBpm?.artist ?? null,
        tempo_bpm: tempoBpm,
        musical_key: musicalKey,
        metadata_fetched_at: selectedSpotify || tempoBpm || musicalKey ? new Date().toISOString() : null,
      })
      .select()
      .single();

    if (dbError || !track) {
      setError(dbError?.message ?? 'Failed to save track');
      setUploading(false);
      return;
    }

    router.push(`/tracks/${track.id}`);
  }

  if (step === 'bpm') {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Confirm tempo</h2>
          <p className="text-sm text-gray-500 mt-1">
            Multiple BPM matches for {selectedSpotify?.artist}. Pick one.
          </p>
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
                    {candidate.source === 'acousticbrainz'
                      ? 'AcousticBrainz'
                      : candidate.source === 'preview'
                        ? 'Preview analysis'
                        : 'GetSongBPM'}
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

        <p className="text-xs text-gray-400 text-center">
          Tempo &amp; key data powered by{' '}
          <a
            href="https://getsongbpm.com"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-gray-500"
          >
            GetSongBPM
          </a>
        </p>

        <button
          type="button"
          onClick={() => {
            setBpmNotFound(true);
            setSelectedBpm(null);
            setStep('confirm');
          }}
          className="w-full border border-gray-300 text-gray-700 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50"
        >
          None of these — enter manually
        </button>
      </div>
    );
  }

  if (step === 'confirm') {
    const tempoDisplay =
      selectedBpm?.tempoBpm ?? (manualBpm.trim() ? Number(manualBpm) : null);
    const keyDisplay = selectedBpm?.musicalKey ?? (manualKey.trim() || null);

    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Confirm &amp; upload</h2>
          <p className="text-sm text-gray-500 mt-1">Review metadata, then upload your audio.</p>
        </div>

        <div className="border border-gray-200 rounded-xl p-4 space-y-3">
          <p className="font-medium text-gray-900">{title.trim()}</p>
          {selectedSpotify ? (
            <div className="flex items-center gap-3">
              {selectedSpotify.albumArtUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={selectedSpotify.albumArtUrl}
                  alt=""
                  className="w-12 h-12 rounded-md object-cover"
                />
              ) : null}
              <div>
                <p className="text-sm text-gray-700">{selectedSpotify.title}</p>
                <p className="text-sm text-gray-500">{selectedSpotify.artist}</p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-500">No Spotify track selected.</p>
          )}

          {selectedBpm?.tempoBpm != null && (
            <p className="text-sm text-brand-600">
              {selectedBpm.tempoBpm} BPM
              {selectedBpm.musicalKey ? ` · ${selectedBpm.musicalKey}` : ''}
            </p>
          )}

          {(bpmNotFound || !selectedSpotify || selectedBpm?.tempoBpm == null) && (
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div>
                <label htmlFor="manual-bpm" className="block text-xs font-medium text-gray-600 mb-1">
                  BPM {bpmNotFound ? '(not found — optional)' : '(optional)'}
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

          {selectedBpm && (
            <p className="text-xs text-gray-400">
              Tempo &amp; key from{' '}
              <a
                href="https://getsongbpm.com"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-gray-500"
              >
                GetSongBPM
              </a>
              {tempoDisplay != null || keyDisplay ? '' : ' (no tempo/key returned)'}
            </p>
          )}
        </div>

        {error && <p className="text-red-500 text-sm">{error}</p>}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setStep('form')}
            disabled={uploading}
            className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
          >
            Back
          </button>
          <button
            type="button"
            onClick={handleUpload}
            disabled={uploading || !file}
            className="flex-1 bg-brand-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50"
          >
            {uploading ? 'Uploading...' : 'Upload Track'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={continueFromForm} className="space-y-6">
      <div>
        <label htmlFor="spotify-query" className="block text-sm font-medium text-gray-700 mb-1">
          Search Spotify <span className="text-gray-400 font-normal">(optional)</span>
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
      </div>

      {selectedSpotify ? (
        <div className="flex items-center gap-3 border border-brand-500 bg-brand-50 rounded-xl p-3">
          {selectedSpotify.albumArtUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={selectedSpotify.albumArtUrl}
              alt=""
              className="w-12 h-12 rounded-md object-cover shrink-0"
            />
          ) : (
            <div className="w-12 h-12 rounded-md bg-brand-100 text-brand-600 flex items-center justify-center shrink-0">
              ♪
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-brand-600 mb-0.5">Selected from Spotify</p>
            <p className="font-medium text-gray-900 truncate">{selectedSpotify.title}</p>
            <p className="text-sm text-gray-500 truncate">{selectedSpotify.artist}</p>
          </div>
          <button
            type="button"
            onClick={clearSpotifySelection}
            className="text-sm text-gray-500 hover:text-gray-800 shrink-0"
          >
            Clear
          </button>
        </div>
      ) : (
        <>
          {hasSearchedSpotify && !loadingMeta && spotifyCandidates.length === 0 && (
            <p className="text-sm text-gray-500">No Spotify matches. Try a different search, or continue without one.</p>
          )}

          {spotifyCandidates.length > 0 && (
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">Select a Spotify track</p>
              <ul className="space-y-2 max-h-64 overflow-y-auto">
                {spotifyCandidates.map((candidate) => (
                  <li key={candidate.spotifyTrackId}>
                    <button
                      type="button"
                      onClick={() => selectSpotifyTrack(candidate)}
                      className="w-full flex items-center gap-3 border border-gray-200 rounded-xl p-3 text-left hover:border-brand-500 transition-colors"
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
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}

      <div>
        <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
          Track title
        </label>
        <input
          id="title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Warm-up routine"
          required
          className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
        <p className="text-xs text-gray-400 mt-1">
          {selectedSpotify
            ? 'Filled from Spotify — you can rename it for your practice list.'
            : 'Name this however you like, or search Spotify above to fill it in.'}
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Audio file</label>
        <div
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center cursor-pointer hover:border-brand-500 transition-colors"
        >
          {file ? (
            <p className="text-sm text-gray-700 font-medium">{file.name}</p>
          ) : (
            <>
              <p className="text-gray-400 text-sm">Click to select an audio file</p>
              <p className="text-gray-300 text-xs mt-1">MP3, M4A, WAV, OGG</p>
            </>
          )}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*"
          className="hidden"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
      </div>

      {error && <p className="text-red-500 text-sm">{error}</p>}

      {!file && selectedSpotify && (
        <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          Attach your audio file above to continue — Spotify only fills metadata, it doesn’t provide the playable track.
        </p>
      )}

      <button
        type="submit"
        disabled={loadingMeta || !file || !title.trim()}
        className="w-full bg-brand-600 text-white py-3 rounded-lg font-medium hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {loadingMeta
          ? 'Looking up BPM…'
          : !file
            ? 'Add an audio file to continue'
            : selectedSpotify
              ? 'Continue with Spotify track'
              : 'Continue without Spotify'}
      </button>
    </form>
  );
}
