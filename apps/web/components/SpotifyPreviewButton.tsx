'use client';

import { useEffect, useState } from 'react';

/** Only one HTML5 preview plays at a time across the page. */
let sharedAudio: HTMLAudioElement | null = null;
let sharedUrl: string | null = null;
let unlocked = false;
const listeners = new Set<() => void>();

/** Tiny silent WAV used to unlock autoplay on a user gesture. */
const SILENT_WAV =
  'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA';

function notify() {
  for (const listener of listeners) listener();
}

function ensureAudio(): HTMLAudioElement {
  if (!sharedAudio) {
    sharedAudio = new Audio();
    sharedAudio.preload = 'auto';
    sharedAudio.addEventListener('ended', () => notify());
    sharedAudio.addEventListener('pause', notify);
    sharedAudio.addEventListener('play', notify);
  }
  return sharedAudio;
}

/** Call synchronously inside a click handler so later play() is allowed. */
export function unlockPreviewAudio(): void {
  const audio = ensureAudio();
  if (unlocked) return;
  audio.src = SILENT_WAV;
  void audio
    .play()
    .then(() => {
      audio.pause();
      audio.currentTime = 0;
      unlocked = true;
    })
    .catch(() => {
      // Still mark unlocked attempt; playSharedPreview may succeed later.
      unlocked = true;
    });
}

export function stopSharedPreview() {
  if (sharedAudio) {
    sharedAudio.pause();
    sharedAudio.removeAttribute('src');
    sharedAudio.load();
  }
  sharedUrl = null;
  notify();
}

export function playSharedPreview(url: string): Promise<void> {
  const audio = ensureAudio();
  if (sharedUrl === url && !audio.paused && !audio.ended) {
    return Promise.resolve();
  }

  sharedUrl = url;
  audio.src = url;
  return audio
    .play()
    .then(() => {
      notify();
    })
    .catch((err) => {
      notify();
      throw err instanceof Error ? err : new Error('autoplay blocked');
    });
}

export function isSharedPreviewPlaying(url?: string | null): boolean {
  if (!sharedAudio || sharedAudio.paused) return false;
  if (url) return sharedUrl === url;
  return true;
}

function SpotifyEmbed({ trackId }: { trackId: string }) {
  return (
    <iframe
      title="Spotify preview"
      src={`https://open.spotify.com/embed/track/${encodeURIComponent(trackId)}?utm_source=generator&theme=0`}
      width="100%"
      height={80}
      allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
      loading="eager"
      className="rounded-xl border-0"
    />
  );
}

type Props = {
  spotifyTrackId: string;
  previewUrl: string | null;
  spotifyUrl: string;
  /**
   * `compact` — list rows: play MP3 if available, else toggle embed.
   * `block` — always show the Spotify embed (results view).
   */
  variant?: 'compact' | 'block';
  label?: string;
  className?: string;
};

export default function SpotifyPreviewButton({
  spotifyTrackId,
  previewUrl,
  spotifyUrl,
  variant = 'compact',
  label = 'Preview',
  className = '',
}: Props) {
  const [playing, setPlaying] = useState(false);
  const [showEmbed, setShowEmbed] = useState(false);
  const [playBlocked, setPlayBlocked] = useState(false);

  useEffect(() => {
    const sync = () => {
      setPlaying(isSharedPreviewPlaying(previewUrl) || (!!sharedUrl && !sharedAudio?.paused));
    };
    listeners.add(sync);
    sync();
    return () => {
      listeners.delete(sync);
    };
  }, [previewUrl]);

  if (variant === 'block') {
    const canControl = Boolean(previewUrl || sharedUrl);
    const activeUrl = previewUrl || sharedUrl;

    return (
      <div className={`w-full space-y-2 ${className}`}>
        <div className="flex items-center gap-2">
          {canControl && activeUrl ? (
            <button
              type="button"
              onClick={() => {
                unlockPreviewAudio();
                if (playing) {
                  stopSharedPreview();
                  setPlayBlocked(false);
                  return;
                }
                void playSharedPreview(activeUrl)
                  .then(() => setPlayBlocked(false))
                  .catch(() => setPlayBlocked(true));
              }}
              className={`inline-flex items-center justify-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                playing
                  ? 'border-brand-500 bg-brand-50 text-brand-700'
                  : 'border-gray-200 bg-white text-gray-700 hover:border-brand-500 hover:text-brand-700'
              }`}
            >
              <span aria-hidden="true">{playing ? '❚❚' : '▶'}</span>
              {playing ? 'Pause preview' : playBlocked ? 'Tap to play preview' : 'Play preview'}
            </button>
          ) : (
            <span className="text-[11px] text-gray-400">Loading preview…</span>
          )}
          {playing && (
            <span className="text-[11px] text-gray-400">Playing 30s preview…</span>
          )}
        </div>
        <SpotifyEmbed trackId={spotifyTrackId} />
        <p className="text-[11px] text-gray-400">
          Preview via{' '}
          <a
            href={spotifyUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-gray-500"
          >
            Spotify
          </a>
        </p>
      </div>
    );
  }

  if (previewUrl) {
    return (
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          unlockPreviewAudio();
          if (sharedUrl === previewUrl && sharedAudio && !sharedAudio.paused) {
            stopSharedPreview();
            return;
          }
          void playSharedPreview(previewUrl).catch(() => undefined);
        }}
        aria-label={playing ? 'Pause preview' : `Play ${label}`}
        className={`inline-flex items-center justify-center gap-1.5 shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
          playing
            ? 'border-brand-500 bg-brand-50 text-brand-700'
            : 'border-gray-200 bg-white text-gray-700 hover:border-brand-500 hover:text-brand-700'
        } ${className}`}
      >
        <span aria-hidden="true">{playing ? '❚❚' : '▶'}</span>
        {playing ? 'Pause' : label}
      </button>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          stopSharedPreview();
          setShowEmbed((open) => !open);
        }}
        className={`inline-flex items-center justify-center gap-1.5 shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
          showEmbed
            ? 'border-brand-500 bg-brand-50 text-brand-700'
            : 'border-gray-200 bg-white text-gray-700 hover:border-brand-500 hover:text-brand-700'
        } ${className}`}
      >
        <span aria-hidden="true">▶</span>
        {showEmbed ? 'Hide' : label}
      </button>
      {showEmbed && (
        <div className="basis-full w-full" onClick={(e) => e.stopPropagation()}>
          <SpotifyEmbed trackId={spotifyTrackId} />
        </div>
      )}
    </>
  );
}
