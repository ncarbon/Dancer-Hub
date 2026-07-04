import React, { createContext, useContext, useState } from 'react';

export type PaletteName = 'sage' | 'slate' | 'plum' | 'ochre' | 'ink';

export interface Palette {
  accent: string;
  paper: string;
  ink: string;
}

export const PALETTES: Record<PaletteName, Palette> = {
  sage:  { accent: '#5f7a6b', paper: '#eef0ea', ink: '#232a25' },
  slate: { accent: '#52708c', paper: '#eceef1', ink: '#1f272f' },
  plum:  { accent: '#79607a', paper: '#f0edf1', ink: '#2a2530' },
  ochre: { accent: '#a07d3f', paper: '#f2efe6', ink: '#2b2822' },
  ink:   { accent: '#3d3d3d', paper: '#eeece8', ink: '#1a1a1a' },
};

export const SECTION_COLORS: Record<string, string> = {
  Intro:  '#7d9a86',
  Verse:  '#8a7ba8',
  Chorus: 'accent',
  Bridge: '#c99a5b',
  Outro:  '#8f887d',
};

export const CUE_TYPE_COLORS: Record<string, string> = {
  count:     'accent',
  formation: '#8a7ba8',
  movement:  '#7d9a86',
  entrance:  '#c99a5b',
  lift:      '#a85f6b',
  note:      '#8f887d',
};

export const NEUTRALS = {
  muted:    '#8f887d',
  secondary:'#6b655b',
  faint:    '#a79f92',
  fainter:  '#b8b1a4',
  faintest: '#c3bbac',
  surface:  '#faf8f4',
  track:    '#eae5da',
  border05: 'rgba(43,39,34,0.05)',
  border08: 'rgba(43,39,34,0.08)',
  border09: 'rgba(43,39,34,0.09)',
  border10: 'rgba(43,39,34,0.10)',
  border12: 'rgba(43,39,34,0.12)',
  border14: 'rgba(43,39,34,0.14)',
  border18: 'rgba(43,39,34,0.18)',
  border22: 'rgba(43,39,34,0.22)',
  border25: 'rgba(43,39,34,0.25)',
  border30: 'rgba(43,39,34,0.30)',
};

interface ThemeContextValue {
  palette: Palette;
  paletteName: PaletteName;
  setPalette: (name: PaletteName) => void;
  colorCodeSections: boolean;
  setColorCodeSections: (v: boolean) => void;
  sectionColor: (name: string) => string;
  cueTypeColor: (type: string) => string;
}

const ThemeContext = createContext<ThemeContextValue>(null!);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [paletteName, setPaletteName] = useState<PaletteName>('sage');
  const [colorCodeSections, setColorCodeSections] = useState(true);
  const palette = PALETTES[paletteName];

  function sectionColor(name: string): string {
    if (!colorCodeSections) return palette.ink;
    const c = SECTION_COLORS[name];
    return c === 'accent' ? palette.accent : (c ?? palette.ink);
  }

  function cueTypeColor(type: string): string {
    const c = CUE_TYPE_COLORS[type];
    if (c === 'accent') return palette.accent;
    if (!colorCodeSections && type !== 'count') return palette.ink;
    return c ?? palette.ink;
  }

  return (
    <ThemeContext.Provider value={{
      palette, paletteName,
      setPalette: setPaletteName,
      colorCodeSections, setColorCodeSections,
      sectionColor, cueTypeColor,
    }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
