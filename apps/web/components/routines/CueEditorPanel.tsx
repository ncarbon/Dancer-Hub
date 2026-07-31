'use client';

import type { CueType, Count } from '@dancer-hub/shared';
import type { EditorCue } from '@/lib/routineStore';
import { fmtTime } from '@/lib/routineStore';
import { cueTypeColor } from '@/lib/routineTheme';

const CUE_TYPES: CueType[] = ['count', 'formation', 'movement', 'entrance', 'lift', 'note'];
const COUNT_VALS: Array<Count | ''> = ['', '1-2-3-4', '5-6-7-8', '&-1-&-2', '1-a-2-a'];

export default function CueEditorPanel({
  draft,
  duration,
  hasMedia,
  currentT,
  onSetDraft,
  onSave,
  onDelete,
  onClose,
}: {
  draft: EditorCue;
  duration: number;
  hasMedia: boolean;
  currentT: number;
  onSetDraft: (draft: Partial<EditorCue>) => void;
  onSave: () => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-black/40" onClick={onClose}>
      <div
        className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white p-6 pb-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-4 h-1 w-9 rounded-full bg-gray-200" />
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Edit cue</h2>

        <div className="mb-4 flex items-center justify-between border-b border-gray-100 pb-3">
          <span className="text-sm text-gray-500">Time</span>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => onSetDraft({ time: Math.max(0, draft.time - 1) })}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-lg text-gray-700"
            >
              −
            </button>
            <span className="min-w-[44px] text-center text-sm font-semibold text-gray-900">{fmtTime(draft.time)}</span>
            <button
              type="button"
              onClick={() => onSetDraft({ time: Math.min(duration, draft.time + 1) })}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-lg text-gray-700"
            >
              ＋
            </button>
          </div>
        </div>
        {hasMedia && (
          <button
            type="button"
            onClick={() => onSetDraft({ time: currentT })}
            className="mb-3 -mt-2 block w-full text-right text-xs font-medium text-brand-600"
          >
            ⏱ Set to {fmtTime(currentT)}
          </button>
        )}

        <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-brand-600">Type</p>
        <div className="mb-4 flex flex-wrap gap-2">
          {CUE_TYPES.map((t) => {
            const active = draft.type === t;
            const color = cueTypeColor(t);
            return (
              <button
                key={t}
                type="button"
                onClick={() => onSetDraft({ type: t })}
                className="rounded-full border-[1.5px] px-3 py-1.5 text-[10px] font-semibold tracking-wide"
                style={{
                  backgroundColor: active ? color : 'transparent',
                  borderColor: active ? color : 'rgba(43,39,34,0.22)',
                  color: active ? '#fff' : '#6b655b',
                }}
              >
                {t.toUpperCase()}
              </button>
            );
          })}
        </div>

        <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-brand-600">Count</p>
        <div className="mb-4 flex flex-wrap gap-2">
          {COUNT_VALS.map((c) => {
            const active = draft.count === c;
            return (
              <button
                key={c || 'none'}
                type="button"
                onClick={() => onSetDraft({ count: c })}
                className="rounded-full border-[1.5px] px-3 py-1.5 text-[10px] font-semibold tracking-wide"
                style={{
                  backgroundColor: active ? '#111827' : 'transparent',
                  borderColor: active ? '#111827' : 'rgba(43,39,34,0.22)',
                  color: active ? '#fff' : '#6b655b',
                }}
              >
                {c || '—'}
              </button>
            );
          })}
        </div>

        <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-brand-600">Note</p>
        <textarea
          value={draft.note}
          onChange={(e) => onSetDraft({ note: e.target.value })}
          placeholder="Optional note…"
          rows={3}
          className="mb-5 w-full resize-none rounded-lg border border-gray-200 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onDelete}
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border-[1.5px] border-gray-200 text-lg"
            aria-label="Delete cue"
          >
            🗑
          </button>
          <button
            type="button"
            onClick={onSave}
            className="flex-1 rounded-full bg-gray-900 text-sm font-medium text-white"
          >
            Save cue
          </button>
        </div>
      </div>
    </div>
  );
}
