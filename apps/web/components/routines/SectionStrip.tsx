'use client';

import { useEffect, useRef } from 'react';
import type { EditorSection } from '@/lib/routineStore';
import { sectionColor } from '@/lib/routineTheme';

export default function SectionStrip({
  sections,
  activeSectionId,
  onSectionPress,
}: {
  sections: EditorSection[];
  activeSectionId: string | undefined;
  onSectionPress: (time: number) => void;
}) {
  const chipRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  useEffect(() => {
    if (!activeSectionId) return;
    chipRefs.current[activeSectionId]?.scrollIntoView({
      inline: 'start',
      block: 'nearest',
      behavior: 'smooth',
    });
  }, [activeSectionId]);

  if (sections.length === 0) return null;

  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {sections.map((s) => {
        const active = activeSectionId === s.id;
        const color = sectionColor(s.name);
        return (
          <button
            key={s.id}
            ref={(el) => {
              chipRefs.current[s.id] = el;
            }}
            type="button"
            onClick={() => onSectionPress(s.time)}
            className="shrink-0 whitespace-nowrap rounded-full border px-3.5 py-1.5 text-xs font-medium"
            style={{
              borderColor: color,
              backgroundColor: active ? color : 'transparent',
              color: active ? '#fff' : color,
            }}
          >
            {s.name}
          </button>
        );
      })}
    </div>
  );
}
