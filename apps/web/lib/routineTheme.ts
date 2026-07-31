import type { CueType } from '@dancer-hub/shared';

/** Matches Tailwind's brand-600 (see tailwind.config.ts) — used wherever mobile's palette had an 'accent' sentinel. */
export const ACCENT = '#9333ea';

const SECTION_COLORS: Record<string, string> = {
  Intro: '#7d9a86',
  Verse: '#8a7ba8',
  Chorus: ACCENT,
  Bridge: '#c99a5b',
  Outro: '#8f887d',
};

const CUE_TYPE_COLORS: Record<CueType, string> = {
  count: ACCENT,
  formation: '#8a7ba8',
  movement: '#7d9a86',
  entrance: '#c99a5b',
  lift: '#a85f6b',
  note: '#8f887d',
};

const DEFAULT_COLOR = '#6b655b';

export function sectionColor(name: string): string {
  return SECTION_COLORS[name] ?? DEFAULT_COLOR;
}

export function cueTypeColor(type: CueType): string {
  return CUE_TYPE_COLORS[type] ?? DEFAULT_COLOR;
}
