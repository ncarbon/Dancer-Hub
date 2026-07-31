'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useRoutineStore, fmtTime, type EditorSection } from '@/lib/routineStore';
import { sectionColor, cueTypeColor } from '@/lib/routineTheme';
import CueEditorPanel from './CueEditorPanel';
import SectionEditorPanel from './SectionEditorPanel';

type DragState = { kind: 'cue' | 'section'; id: string; startY: number; startTime: number; moved: boolean };

export default function RoutineTimelineEditor({
  title,
  onSave,
  onSkip,
  saving,
  audioUrl,
  videoUrl,
}: {
  title: string;
  onSave: () => void | Promise<void>;
  onSkip: () => void;
  saving: boolean;
  audioUrl: string | null;
  videoUrl: string | null;
}) {
  const router = useRouter();
  const { state, dispatch } = useRoutineStore();
  const hasMedia = !!audioUrl || !!videoUrl;

  const audioRef = useRef<HTMLAudioElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const scrubberRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);

  const [sectionEditorOpen, setSectionEditorOpen] = useState(false);
  const [sectionEditTarget, setSectionEditTarget] = useState<EditorSection | null>(null);
  const [sectionEditorInitialTime, setSectionEditorInitialTime] = useState(0);

  function seekTo(t: number) {
    dispatch({ type: 'SET_T', t });
    if (audioRef.current) audioRef.current.currentTime = t;
    if (videoRef.current) videoRef.current.currentTime = t;
  }

  // Play/pause -> media elements (no start-delay here, editor has no countdown feature)
  useEffect(() => {
    const els = [audioRef.current, videoRef.current].filter((el): el is HTMLMediaElement => !!el);
    if (state.playing) {
      els.forEach((el) => void el.play().catch(() => undefined));
    } else {
      els.forEach((el) => el.pause());
    }
  }, [state.playing]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = state.speed;
    if (videoRef.current) videoRef.current.playbackRate = state.speed;
  }, [state.speed]);

  useEffect(() => {
    if (!state.playing) return;
    const source = audioRef.current ?? videoRef.current;
    if (!source) return;
    const id = setInterval(() => dispatch({ type: 'SET_T', t: source.currentTime }), 100);
    return () => clearInterval(id);
  }, [state.playing, dispatch]);

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

  function seekFromScrubberClientX(clientX: number) {
    const el = scrubberRef.current;
    if (!el || state.duration <= 0) return;
    const rect = el.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    seekTo((x / rect.width) * state.duration);
  }

  function handleItemPointerDown(kind: 'cue' | 'section', id: string, time: number, e: React.PointerEvent) {
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { kind, id, startY: e.clientY, startTime: time, moved: false };
  }

  function handleItemPointerMove(e: React.PointerEvent) {
    const d = dragRef.current;
    if (!d) return;
    const dy = e.clientY - d.startY;
    if (Math.abs(dy) > 4) d.moved = true;
    if (d.moved) {
      const newTime = d.startTime + dy / state.pxPerSec;
      if (d.kind === 'cue') dispatch({ type: 'RETIME_CUE', id: d.id, time: newTime });
      else dispatch({ type: 'RETIME_SECTION', id: d.id, time: newTime });
    }
  }

  function handleItemPointerUp() {
    const d = dragRef.current;
    dragRef.current = null;
    if (!d || d.moved) return;
    if (d.kind === 'cue') {
      const cue = state.cues.find((c) => c.id === d.id);
      if (cue) dispatch({ type: 'OPEN_SHEET', cue });
    } else {
      const sec = state.sections.find((s) => s.id === d.id);
      if (sec) {
        setSectionEditTarget(sec);
        setSectionEditorInitialTime(sec.time);
        setSectionEditorOpen(true);
      }
    }
  }

  const trackH = state.duration * state.pxPerSec;
  const playedFrac = state.duration > 0 ? state.t / state.duration : 0;
  const ticks = Array.from({ length: Math.floor(state.duration / 30) + 1 }, (_, i) => i * 30);

  function saveSection(name: string, time: number) {
    if (sectionEditTarget) dispatch({ type: 'DELETE_SECTION', id: sectionEditTarget.id });
    dispatch({ type: 'ADD_SECTION', name, time });
    setSectionEditorOpen(false);
    setSectionEditTarget(null);
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col">
      {audioUrl && <audio ref={audioRef} src={audioUrl} preload="auto" className="hidden" />}
      {videoUrl && <video ref={videoRef} src={videoUrl} preload="auto" className="hidden" />}

      <div className="flex items-center gap-3 border-b border-gray-100 pb-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="text-2xl text-gray-700"
          aria-label="Back"
        >
          ‹
        </button>
        <h1 className="flex-1 text-xl font-semibold text-gray-900">{title}</h1>
        <button
          type="button"
          onClick={onSkip}
          disabled={saving}
          className="px-2 py-1.5 text-sm font-medium text-gray-400 disabled:opacity-50"
        >
          Skip
        </button>
        <button
          type="button"
          onClick={() => void onSave()}
          disabled={saving}
          className="rounded-full bg-gray-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>

      <div
        ref={scrubberRef}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          seekFromScrubberClientX(e.clientX);
        }}
        onPointerMove={(e) => e.buttons && seekFromScrubberClientX(e.clientX)}
        className="relative mt-3 h-1.5 shrink-0 cursor-pointer rounded-full bg-gray-200"
      >
        <div className="absolute inset-y-0 left-0 rounded-full bg-brand-600" style={{ width: `${playedFrac * 100}%` }} />
        <div
          className="absolute top-1/2 h-3.5 w-3.5 -translate-y-1/2 -translate-x-1/2 rounded-full bg-brand-600"
          style={{ left: `${playedFrac * 100}%` }}
        />
      </div>

      <div className="mt-2 flex shrink-0 items-center gap-2 text-xs text-gray-400">
        <span className="text-gray-900">{fmtTime(state.t)}</span>
        <span className="flex-1">
          {state.cues.length} cues · {state.sections.length} sections · {fmtTime(state.duration)}
        </span>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => dispatch({ type: 'SET_PX_PER_SEC', pxPerSec: state.pxPerSec - 0.8 })}
            className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-100 text-gray-700"
          >
            −
          </button>
          <button
            type="button"
            onClick={() => dispatch({ type: 'SET_PX_PER_SEC', pxPerSec: state.pxPerSec + 0.8 })}
            className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-100 text-gray-700"
          >
            ＋
          </button>
        </div>
      </div>

      <div className="mt-3 flex-1 overflow-y-auto">
        <div className="flex">
          <div className="relative w-12 shrink-0" style={{ height: trackH }}>
            {ticks.map((t) => (
              <div key={t} className="absolute right-1.5 -translate-y-1/2 text-[10px] text-gray-400" style={{ top: t * state.pxPerSec }}>
                {fmtTime(t)}
              </div>
            ))}
          </div>

          <div className="relative mr-2 flex-1" style={{ height: Math.max(trackH, 200) }}>
            {state.sections.map((sec) => {
              const color = sectionColor(sec.name);
              return (
                <div
                  key={sec.id}
                  onPointerDown={(e) => handleItemPointerDown('section', sec.id, sec.time, e)}
                  onPointerMove={handleItemPointerMove}
                  onPointerUp={handleItemPointerUp}
                  className="absolute inset-x-0 z-10 flex cursor-grab items-center touch-none"
                  style={{ top: sec.time * state.pxPerSec }}
                >
                  <div className="h-px flex-1 border-t border-dashed" style={{ borderColor: color }} />
                  <div className="ml-1 flex shrink-0 items-center gap-1.5 rounded-full bg-white px-2 py-0.5 shadow-sm">
                    <span className="text-sm italic" style={{ color }}>
                      {sec.name}
                    </span>
                    <span className="text-[9px] opacity-70" style={{ color }}>
                      {fmtTime(sec.time)}
                    </span>
                  </div>
                </div>
              );
            })}

            <div className="pointer-events-none absolute inset-x-0 z-20 flex items-center" style={{ top: state.t * state.pxPerSec }}>
              <div className="h-0.5 flex-1 bg-brand-600" />
              <div className="absolute -left-1 rounded bg-brand-600 px-1 py-0.5 text-[9px] text-white">{fmtTime(state.t)}</div>
            </div>

            {state.cues.map((cue) => {
              const color = cueTypeColor(cue.type);
              const selected = cue.id === state.selectedCueId;
              return (
                <div
                  key={cue.id}
                  onPointerDown={(e) => handleItemPointerDown('cue', cue.id, cue.time, e)}
                  onPointerMove={handleItemPointerMove}
                  onPointerUp={handleItemPointerUp}
                  className={`absolute inset-x-0 z-[5] cursor-grab touch-none rounded-lg border-l-[3px] bg-white p-2.5 shadow-sm ${
                    selected ? 'ring-2 ring-brand-500' : ''
                  }`}
                  style={{ top: cue.time * state.pxPerSec, borderLeftColor: color }}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-semibold tracking-wide" style={{ color }}>
                      {cue.type.toUpperCase()}
                    </span>
                    <span className="text-[11px] text-gray-400">{fmtTime(cue.time)}</span>
                  </div>
                  {cue.count && <p className="text-base text-gray-900">{cue.count}</p>}
                  {cue.note && <p className="line-clamp-2 text-xs text-gray-500">{cue.note}</p>}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex shrink-0 gap-2.5 border-t border-gray-100 pt-3">
        {hasMedia && (
          <button
            type="button"
            onClick={() => dispatch({ type: 'TOGGLE_PLAY' })}
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-600 text-white"
          >
            {state.playing ? '⏸' : '▶'}
          </button>
        )}
        <button
          type="button"
          onClick={() => {
            setSectionEditTarget(null);
            setSectionEditorInitialTime(state.t);
            setSectionEditorOpen(true);
          }}
          className="rounded-full border-[1.5px] border-gray-900 px-4 py-3 text-sm font-medium text-gray-900"
        >
          ＋ Section
        </button>
        <button
          type="button"
          onClick={() => dispatch({ type: 'ADD_CUE' })}
          className="flex-1 rounded-full bg-brand-600 py-3 text-sm font-medium text-white"
        >
          ＋ Cue at {fmtTime(state.t)}
        </button>
      </div>

      {state.sheetOpen && state.draft && (
        <CueEditorPanel
          draft={state.draft}
          duration={state.duration}
          hasMedia={hasMedia}
          currentT={state.t}
          onSetDraft={(draft) => dispatch({ type: 'SET_DRAFT', draft })}
          onSave={() => dispatch({ type: 'SAVE_CUE' })}
          onDelete={() => dispatch({ type: 'DELETE_CUE', id: state.draft!.id })}
          onClose={() => dispatch({ type: 'CLOSE_SHEET' })}
        />
      )}

      {sectionEditorOpen && (
        <SectionEditorPanel
          mode={sectionEditTarget ? 'edit' : 'add'}
          initialName={sectionEditTarget?.name ?? ''}
          initialTime={sectionEditorInitialTime}
          duration={state.duration}
          hasMedia={hasMedia}
          currentT={state.t}
          onSave={saveSection}
          onDelete={
            sectionEditTarget
              ? () => {
                  dispatch({ type: 'DELETE_SECTION', id: sectionEditTarget.id });
                  setSectionEditorOpen(false);
                  setSectionEditTarget(null);
                }
              : undefined
          }
          onClose={() => {
            setSectionEditorOpen(false);
            setSectionEditTarget(null);
          }}
        />
      )}
    </div>
  );
}
