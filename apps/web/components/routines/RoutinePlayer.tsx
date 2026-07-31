'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import {
  RoutineStoreProvider,
  useRoutineStore,
  currentSection,
  currentCue,
  nextCue,
} from '@/lib/routineStore';
import { sectionColor } from '@/lib/routineTheme';
import { getTrackAttribution } from '@/lib/attribution';
import type { RoutineWithChildren } from '@/lib/routines';
import VideoStage from './VideoStage';
import SectionStrip from './SectionStrip';
import CueBanner from './CueBanner';
import WaveformScrubber from './WaveformScrubber';
import TransportControls from './TransportControls';
import PlaybackSettingsCard from './PlaybackSettingsCard';
import RoutineInfoModal from './RoutineInfoModal';

type PreservesPitchEl = HTMLMediaElement & {
  preservesPitch?: boolean;
  mozPreservesPitch?: boolean;
  webkitPreservesPitch?: boolean;
};

export default function RoutinePlayer(props: {
  routine: RoutineWithChildren;
  audioUrl: string | null;
  videoUrl: string | null;
}) {
  return (
    <RoutineStoreProvider>
      <RoutinePlayerInner {...props} />
    </RoutineStoreProvider>
  );
}

function RoutinePlayerInner({
  routine,
  audioUrl,
  videoUrl,
}: {
  routine: RoutineWithChildren;
  audioUrl: string | null;
  videoUrl: string | null;
}) {
  const router = useRouter();
  const { state, dispatch } = useRoutineStore();
  const [routineName, setRoutineName] = useState(routine.name);
  const [routineStyle, setRoutineStyle] = useState<string | null>(routine.style);
  const [infoModalOpen, setInfoModalOpen] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);

  const audioRef = useRef<HTMLAudioElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const delayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    dispatch({
      type: 'LOAD_ROUTINE',
      duration: routine.duration_sec,
      speed: routine.speed,
      pitchLock: routine.pitch_lock,
      delayMs: Math.round((routine.delay_ms ?? 0) / 1000) * 1000,
      sections: routine.sections.map((s) => ({ id: s.id, time: s.time_sec, name: s.name })),
      cues: routine.cues.map((c) => ({
        id: c.id,
        time: c.time_sec,
        type: c.type,
        count: c.count,
        note: c.note,
      })),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routine.id]);

  function seekTo(t: number) {
    dispatch({ type: 'SET_T', t });
    if (audioRef.current) audioRef.current.currentTime = t;
    if (videoRef.current) videoRef.current.currentTime = t;
  }

  // Play/pause (+ optional start delay) → both media elements
  useEffect(() => {
    const els = [audioRef.current, videoRef.current].filter((el): el is HTMLMediaElement => !!el);
    if (state.playing) {
      if (state.delayMs > 0) {
        delayTimerRef.current = setTimeout(() => {
          els.forEach((el) => void el.play().catch(() => undefined));
        }, state.delayMs);
      } else {
        els.forEach((el) => void el.play().catch(() => undefined));
      }
    } else {
      if (delayTimerRef.current !== null) {
        clearTimeout(delayTimerRef.current);
        delayTimerRef.current = null;
      }
      els.forEach((el) => el.pause());
    }
    return () => {
      if (delayTimerRef.current !== null) {
        clearTimeout(delayTimerRef.current);
        delayTimerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.playing]);

  // Speed → both elements
  useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = state.speed;
    if (videoRef.current) videoRef.current.playbackRate = state.speed;
  }, [state.speed]);

  // Pitch lock → both elements (native preservesPitch, no library needed)
  useEffect(() => {
    for (const el of [audioRef.current, videoRef.current]) {
      if (!el) continue;
      const media = el as PreservesPitchEl;
      media.preservesPitch = state.pitchLock;
      media.mozPreservesPitch = state.pitchLock;
      media.webkitPreservesPitch = state.pitchLock;
    }
  }, [state.pitchLock]);

  // Countdown overlay while a start delay is pending
  useEffect(() => {
    if (state.playing && state.delayMs > 0) {
      const totalSec = Math.ceil(state.delayMs / 1000);
      setCountdown(totalSec);
      let remaining = totalSec;
      countdownIntervalRef.current = setInterval(() => {
        remaining -= 1;
        if (remaining <= 0) {
          if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
          countdownIntervalRef.current = null;
          setCountdown(null);
        } else {
          setCountdown(remaining);
        }
      }, 1000);
    } else {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }
      setCountdown(null);
    }
    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.playing]);

  // Position sync: poll every 100ms while playing (audio takes priority when both exist)
  useEffect(() => {
    if (!state.playing) return;
    const source = audioRef.current ?? videoRef.current;
    if (!source) return;
    const id = setInterval(() => {
      dispatch({ type: 'SET_T', t: source.currentTime });
    }, 100);
    return () => clearInterval(id);
  }, [state.playing, dispatch]);

  // Stop at end
  useEffect(() => {
    const source = audioRef.current ?? videoRef.current;
    if (!source) return;
    function handleEnded() {
      dispatch({ type: 'TOGGLE_PLAY' });
      dispatch({ type: 'SET_T', t: 0 });
    }
    source.addEventListener('ended', handleEnded);
    return () => source.removeEventListener('ended', handleEnded);
  }, [audioUrl, videoUrl, dispatch]);

  const sec = currentSection(state);
  const cue = currentCue(state);
  const nxt = nextCue(state);
  const attribution = getTrackAttribution(routine);

  async function saveRoutineInfo(name: string, style: string | null) {
    setRoutineName(name);
    setRoutineStyle(style);
    setInfoModalOpen(false);
    await supabase.from('routines').update({ name, style }).eq('id', routine.id);
  }

  return (
    <div className="space-y-4">
      <VideoStage
        videoUrl={videoUrl}
        videoRef={videoRef}
        mirror={state.mirror}
        onToggleMirror={() => dispatch({ type: 'TOGGLE_MIRROR' })}
        routineName={routineName}
        onBack={() => router.back()}
        onEditInfo={() => setInfoModalOpen(true)}
        sectionName={sec?.name ?? null}
        sectionColorHex={sec ? sectionColor(sec.name) : null}
        cue={cue}
        countdown={countdown}
      />

      {audioUrl && <audio ref={audioRef} src={audioUrl} preload="auto" className="hidden" />}

      {(routine.artist || routine.tempo_bpm != null || routine.musical_key) && (
        <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-gray-500">
          {routine.artist && <span>{routine.artist}</span>}
          {routine.tempo_bpm != null && <span>· {routine.tempo_bpm} BPM</span>}
          {routine.musical_key && <span>· {routine.musical_key}</span>}
          {routine.spotify_url && (
            <a
              href={routine.spotify_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand-600 hover:underline"
            >
              · Open in Spotify
            </a>
          )}
        </div>
      )}

      {attribution && (
        <p className="text-[11px] text-gray-400">
          {attribution.credit}, licensed under{' '}
          <a
            href={attribution.licenseUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-gray-600"
          >
            {attribution.licenseLabel}
          </a>
        </p>
      )}

      <SectionStrip sections={state.sections} activeSectionId={sec?.id} onSectionPress={seekTo} />

      {!videoUrl && <CueBanner cue={cue} nxt={nxt} hasCues={state.cues.length > 0} />}

      <WaveformScrubber duration={state.duration} t={state.t} onSeek={seekTo} />

      <TransportControls
        t={state.t}
        duration={state.duration}
        playing={state.playing}
        disabled={false}
        onSeek={seekTo}
        onTogglePlay={() => dispatch({ type: 'TOGGLE_PLAY' })}
      />

      <PlaybackSettingsCard
        speed={state.speed}
        pitchLock={state.pitchLock}
        delayMs={state.delayMs}
        onSetSpeed={(speed) => dispatch({ type: 'SET_SPEED', speed })}
        onTogglePitchLock={() => dispatch({ type: 'TOGGLE_PITCH_LOCK' })}
        onSetDelay={(delayMs) => dispatch({ type: 'SET_DELAY', delayMs })}
      />

      <Link
        href={`/routines/${routine.id}/edit`}
        className="block rounded-full border border-brand-500 py-3 text-center text-sm font-medium text-brand-600 hover:bg-brand-50 transition-colors"
      >
        Open timeline editor →
      </Link>

      <RoutineInfoModal
        open={infoModalOpen}
        initialName={routineName}
        initialStyle={routineStyle}
        onClose={() => setInfoModalOpen(false)}
        onSave={saveRoutineInfo}
      />
    </div>
  );
}
