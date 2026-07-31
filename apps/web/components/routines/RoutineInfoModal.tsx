'use client';

import { useEffect, useState } from 'react';
import { ROUTINE_STYLES } from '@/lib/routineStyles';

export default function RoutineInfoModal({
  open,
  initialName,
  initialStyle,
  onClose,
  onSave,
}: {
  open: boolean;
  initialName: string;
  initialStyle: string | null;
  onClose: () => void;
  onSave: (name: string, style: string | null) => void;
}) {
  const [name, setName] = useState(initialName);
  const [style, setStyle] = useState<string | null>(initialStyle);

  useEffect(() => {
    if (open) {
      setName(initialName);
      setStyle(initialStyle);
    }
  }, [open, initialName, initialStyle]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-20 flex justify-center bg-black/45" onClick={onClose}>
      <div
        className="w-full max-w-lg max-h-screen rounded-t-2xl bg-white p-6 pb-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Routine info</h2>
          <button
            type="button"
            onClick={() => onSave(name, style)}
            className="rounded-full bg-brand-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-brand-700"
          >
            Save
          </button>
        </div>

        <label htmlFor="routine-name" className="mb-1 block text-xs font-medium text-gray-600">
          Name
        </label>
        <input
          id="routine-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Routine name"
          className="mb-4 w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />

        <p className="mb-1 text-xs font-medium text-gray-600">Dance style</p>
        <div className="flex flex-wrap gap-2">
          {ROUTINE_STYLES.map((s) => {
            const active = style === s;
            return (
              <button
                key={s}
                type="button"
                onClick={() => setStyle(active ? null : s)}
                className={`rounded-full border px-3.5 py-1.5 text-sm transition-colors ${
                  active
                    ? 'border-brand-600 bg-brand-600 text-white'
                    : 'border-gray-300 text-gray-700 hover:border-brand-500'
                }`}
              >
                {s}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
