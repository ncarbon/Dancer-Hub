'use client';

import type { RefObject } from 'react';
import HatchPlaceholder from './HatchPlaceholder';
import type { EditorCue } from '@/lib/routineStore';
import { cueTypeColor } from '@/lib/routineTheme';

export default function VideoStage({
  videoUrl,
  videoRef,
  mirror,
  onToggleMirror,
  routineName,
  onBack,
  onEditInfo,
  sectionName,
  sectionColorHex,
  cue,
  countdown,
}: {
  videoUrl: string | null;
  videoRef: RefObject<HTMLVideoElement>;
  mirror: boolean;
  onToggleMirror: () => void;
  routineName: string;
  onBack: () => void;
  onEditInfo: () => void;
  sectionName: string | null;
  sectionColorHex: string | null;
  cue: EditorCue | null;
  countdown: number | null;
}) {
  return (
    <div className="relative h-56 overflow-hidden rounded-xl bg-[#e2dccf]">
      {videoUrl ? (
        <video
          ref={videoRef}
          src={videoUrl}
          className="absolute inset-0 h-full w-full object-cover"
          style={{ transform: mirror ? 'scaleX(-1)' : undefined }}
          playsInline
        />
      ) : (
        <HatchPlaceholder className="absolute inset-0" />
      )}

      <div className="absolute inset-x-3 top-3 flex items-center gap-2">
        <button
          type="button"
          onClick={onBack}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-black/30 text-xl text-white"
          aria-label="Back"
        >
          ‹
        </button>
        <p className="min-w-0 flex-1 truncate text-sm font-medium text-white drop-shadow">
          {routineName || 'Practice'}
        </p>
        <button
          type="button"
          onClick={onEditInfo}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-black/30 text-white/85"
          aria-label="Edit routine info"
        >
          ✎
        </button>
      </div>

      {sectionName && (
        <span
          className="absolute right-3 top-12 rounded-full px-3 py-1 text-[11px] font-medium text-white"
          style={{ backgroundColor: sectionColorHex ?? '#6b655b' }}
        >
          {sectionName}
        </span>
      )}

      <button
        type="button"
        onClick={onToggleMirror}
        className="absolute bottom-3 left-3 flex h-9 w-9 items-center justify-center rounded-full text-white"
        style={{ backgroundColor: mirror ? '#9333ea' : 'rgba(0,0,0,0.3)' }}
        aria-label="Toggle mirror"
      >
        ⇄
      </button>

      {videoUrl && cue && (
        <div className="absolute bottom-2.5 left-16 right-3 flex items-center gap-1.5 rounded-lg bg-black/50 px-2.5 py-1.5">
          <span
            className="shrink-0 rounded px-1.5 py-0.5 text-[9px] font-semibold tracking-wide text-white"
            style={{ backgroundColor: cueTypeColor(cue.type) }}
          >
            {cue.type.toUpperCase()}
          </span>
          {cue.note && <p className="truncate text-xs text-white/90">{cue.note}</p>}
        </div>
      )}

      {countdown !== null && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#232a25]/60">
          <p className="mb-1 text-xs uppercase tracking-widest text-white/65">Starting in</p>
          <p className="text-6xl font-semibold text-white">{countdown}</p>
        </div>
      )}
    </div>
  );
}
