'use client';

import { useState } from 'react';
import { fmtTime } from '@/lib/routineStore';

export default function SectionEditorPanel({
  mode,
  initialName,
  initialTime,
  duration,
  hasMedia,
  currentT,
  onSave,
  onDelete,
  onClose,
}: {
  mode: 'add' | 'edit';
  initialName: string;
  initialTime: number;
  duration: number;
  hasMedia: boolean;
  currentT: number;
  onSave: (name: string, time: number) => void;
  onDelete?: () => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(initialName);
  const [time, setTime] = useState(initialTime);

  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-black/40" onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-t-2xl bg-white p-6 pb-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-4 h-1 w-9 rounded-full bg-gray-200" />
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          {mode === 'edit' ? 'Edit section' : 'Add section'}
        </h2>

        <div className="mb-4 flex items-center justify-between border-b border-gray-100 pb-3">
          <span className="text-sm text-gray-500">Time</span>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setTime((t) => Math.max(0, t - 1))}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-lg text-gray-700"
            >
              −
            </button>
            <span className="min-w-[44px] text-center text-sm font-semibold text-gray-900">{fmtTime(time)}</span>
            <button
              type="button"
              onClick={() => setTime((t) => Math.min(duration, t + 1))}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-lg text-gray-700"
            >
              ＋
            </button>
          </div>
        </div>
        {hasMedia && (
          <button
            type="button"
            onClick={() => setTime(currentT)}
            className="mb-3 -mt-2 block w-full text-right text-xs font-medium text-brand-600"
          >
            ⏱ Set to {fmtTime(currentT)}
          </button>
        )}

        <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-brand-600">Name</p>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Intro, Chorus, Bridge…"
          autoFocus
          className="mb-5 w-full rounded-lg border border-gray-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />

        <div className="flex gap-3">
          {mode === 'edit' && onDelete && (
            <button
              type="button"
              onClick={onDelete}
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border-[1.5px] border-gray-200 text-lg"
              aria-label="Delete section"
            >
              🗑
            </button>
          )}
          <button
            type="button"
            disabled={!name.trim()}
            onClick={() => onSave(name.trim(), time)}
            className="flex-1 rounded-full bg-gray-900 text-sm font-medium text-white disabled:opacity-30"
          >
            {mode === 'edit' ? 'Save section' : 'Add section'}
          </button>
        </div>
      </div>
    </div>
  );
}
