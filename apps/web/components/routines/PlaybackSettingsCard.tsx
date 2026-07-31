'use client';

import { useRef, useState } from 'react';

export default function PlaybackSettingsCard({
  speed,
  pitchLock,
  delayMs,
  onSetSpeed,
  onTogglePitchLock,
  onSetDelay,
}: {
  speed: number;
  pitchLock: boolean;
  delayMs: number;
  onSetSpeed: (speed: number) => void;
  onTogglePitchLock: () => void;
  onSetDelay: (delayMs: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);
  const speedFrac = (speed - 0.25) / 1.25;

  function setSpeedFromClientX(clientX: number) {
    const el = trackRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    onSetSpeed(0.25 + (x / rect.width) * 1.25);
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between"
      >
        <span className="text-sm font-medium text-gray-900">Playback settings</span>
        <div className="flex items-center gap-2.5">
          {!open && (
            <span className="text-xs text-gray-400">
              {speed.toFixed(2)}× · {delayMs / 1000}s delay
            </span>
          )}
          <span className="text-brand-600">{open ? '˄' : '˅'}</span>
        </div>
      </button>

      {open && (
        <div className="mt-3 border-t border-gray-100 pt-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-900">Speed</span>
            <span className="text-sm text-gray-900">{speed.toFixed(2)}×</span>
          </div>
          <div
            ref={trackRef}
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId);
              setSpeedFromClientX(e.clientX);
            }}
            onPointerMove={(e) => e.buttons && setSpeedFromClientX(e.clientX)}
            className="relative my-3 h-1.5 cursor-pointer rounded-full bg-gray-200"
          >
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-brand-600"
              style={{ width: `${speedFrac * 100}%` }}
            />
            <div
              className="absolute top-1/2 h-4 w-4 -translate-y-1/2 -translate-x-1/2 rounded-full bg-brand-600"
              style={{ left: `${speedFrac * 100}%` }}
            />
          </div>
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => onSetSpeed(speed - 0.05)}
              className="w-8 text-xl text-gray-700"
            >
              −
            </button>
            <button
              type="button"
              onClick={onTogglePitchLock}
              className={`text-xs font-medium ${pitchLock ? 'text-brand-600' : 'text-gray-400'}`}
            >
              Pitch lock · {pitchLock ? 'On' : 'Off'}
            </button>
            <button
              type="button"
              onClick={() => onSetSpeed(speed + 0.05)}
              className="w-8 text-xl text-gray-700"
            >
              ＋
            </button>
          </div>

          <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-3">
            <span className="text-sm font-medium text-gray-900">Start delay</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onSetDelay(delayMs - 1000)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-lg text-gray-700"
              >
                −
              </button>
              <span className="min-w-[48px] text-center text-sm font-semibold text-gray-900">
                {delayMs / 1000}s
              </span>
              <button
                type="button"
                onClick={() => onSetDelay(delayMs + 1000)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-lg text-gray-700"
              >
                ＋
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
