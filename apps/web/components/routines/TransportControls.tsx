'use client';

import { fmtTime } from '@/lib/routineStore';

export default function TransportControls({
  t,
  duration,
  playing,
  disabled,
  onSeek,
  onTogglePlay,
}: {
  t: number;
  duration: number;
  playing: boolean;
  disabled: boolean;
  onSeek: (t: number) => void;
  onTogglePlay: () => void;
}) {
  return (
    <div>
      <div className="mt-2 flex justify-between text-xs font-medium text-gray-500">
        <span>{fmtTime(t)}</span>
        <span className="text-gray-400">{fmtTime(duration)}</span>
      </div>

      <div className="mt-3 flex items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => onSeek(Math.max(0, t - 10))}
          className="flex h-11 w-11 items-center justify-center rounded-full text-sm font-medium text-gray-700 hover:bg-gray-100"
        >
          −10
        </button>
        <button
          type="button"
          onClick={onTogglePlay}
          disabled={disabled}
          className="mx-2 flex h-14 w-14 items-center justify-center rounded-full bg-gray-900 text-white disabled:opacity-40"
        >
          <span aria-hidden="true" className="text-lg">
            {playing ? '❚❚' : '▶'}
          </span>
        </button>
        <button
          type="button"
          onClick={() => onSeek(Math.min(duration, t + 10))}
          className="flex h-11 w-11 items-center justify-center rounded-full text-sm font-medium text-gray-700 hover:bg-gray-100"
        >
          +10
        </button>
      </div>
    </div>
  );
}
