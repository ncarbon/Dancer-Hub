'use client';

import type { EditorCue } from '@/lib/routineStore';
import { cueTypeColor } from '@/lib/routineTheme';

export default function CueBanner({
  cue,
  nxt,
  hasCues,
}: {
  cue: EditorCue | null;
  nxt: EditorCue | null;
  hasCues: boolean;
}) {
  if (!hasCues) return null;
  if (!cue) return <div className="h-12" />;

  return (
    <div className="rounded-xl bg-white border border-gray-200 p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span
            className="rounded px-2 py-0.5 text-[10px] font-semibold tracking-wide text-white"
            style={{ backgroundColor: cueTypeColor(cue.type) }}
          >
            {cue.type.toUpperCase()}
          </span>
          {cue.count && <span className="text-base text-gray-900">{cue.count}</span>}
        </div>
        {nxt && (
          <span
            className="shrink-0 rounded-full border px-2 py-0.5 text-[11px]"
            style={{ borderColor: cueTypeColor(nxt.type) }}
          >
            <span className="text-gray-400">Next · </span>
            <span className="font-semibold tracking-wide" style={{ color: cueTypeColor(nxt.type) }}>
              {nxt.type.toUpperCase()}
            </span>
          </span>
        )}
      </div>
      {cue.note && <p className="mt-1 truncate text-sm text-gray-500">{cue.note}</p>}
    </div>
  );
}
