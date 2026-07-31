'use client';

import { useRef } from 'react';

const BAR_COUNT = 60;
const BAR_HEIGHTS = Array.from({ length: BAR_COUNT }, (_, i) => 6 + Math.abs(Math.sin(i * 0.7 + 1) * 22 + Math.cos(i * 0.3) * 12));

export default function WaveformScrubber({
  duration,
  t,
  onSeek,
}: {
  duration: number;
  t: number;
  onSeek: (t: number) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playedFrac = duration > 0 ? t / duration : 0;

  function seekFromClientX(clientX: number) {
    const el = containerRef.current;
    if (!el || duration <= 0) return;
    const rect = el.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    onSeek((x / rect.width) * duration);
  }

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    seekFromClientX(e.clientX);
  }

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (e.buttons) seekFromClientX(e.clientX);
  }

  return (
    <div className="h-14 overflow-hidden rounded-lg border border-gray-200">
      <div
        ref={containerRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        className="relative flex h-full cursor-pointer items-center gap-0.5 px-1"
      >
        {BAR_HEIGHTS.map((h, i) => {
          const played = i / BAR_COUNT < playedFrac;
          return (
            <div
              key={i}
              className={`w-full flex-1 rounded-sm ${played ? 'bg-brand-600' : 'bg-gray-200'}`}
              style={{ height: h }}
            />
          );
        })}
        <div
          className="pointer-events-none absolute top-0 bottom-0 w-0.5 bg-brand-600"
          style={{ left: `${playedFrac * 100}%` }}
        />
      </div>
    </div>
  );
}
