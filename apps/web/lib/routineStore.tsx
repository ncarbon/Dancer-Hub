'use client';

import React, { createContext, useContext, useReducer } from 'react';
import type { CueType, Count } from '@dancer-hub/shared';

export interface EditorSection {
  id: string;
  time: number;
  name: string;
}

export interface EditorCue {
  id: string;
  time: number;
  type: CueType;
  count: Count | '';
  note: string;
}

export interface RoutineState {
  playing: boolean;
  t: number;
  duration: number;
  speed: number;
  pitchLock: boolean;
  delayMs: number;
  mirror: boolean;
  pxPerSec: number;
  selectedCueId: string | null;
  sheetOpen: boolean;
  draft: EditorCue | null;
  sections: EditorSection[];
  cues: EditorCue[];
}

const INITIAL: RoutineState = {
  playing: false,
  t: 0,
  duration: 0,
  speed: 1.0,
  pitchLock: true,
  delayMs: 0,
  mirror: true,
  pxPerSec: 3.4,
  selectedCueId: null,
  sheetOpen: false,
  draft: null,
  sections: [],
  cues: [],
};

type Action =
  | { type: 'SET_T'; t: number }
  | { type: 'TOGGLE_PLAY' }
  | { type: 'SET_SPEED'; speed: number }
  | { type: 'TOGGLE_PITCH_LOCK' }
  | { type: 'SET_DELAY'; delayMs: number }
  | { type: 'TOGGLE_MIRROR' }
  | { type: 'SET_PX_PER_SEC'; pxPerSec: number }
  | { type: 'SELECT_CUE'; id: string | null }
  | { type: 'OPEN_SHEET'; cue?: EditorCue }
  | { type: 'CLOSE_SHEET' }
  | { type: 'SET_DRAFT'; draft: Partial<EditorCue> }
  | { type: 'SAVE_CUE' }
  | { type: 'DELETE_CUE'; id: string }
  | { type: 'ADD_CUE' }
  | { type: 'RETIME_CUE'; id: string; time: number }
  | { type: 'ADD_SECTION'; name: string; time: number }
  | { type: 'DELETE_SECTION'; id: string }
  | { type: 'RETIME_SECTION'; id: string; time: number }
  | { type: 'INIT_ROUTINE'; duration: number }
  | {
      type: 'LOAD_ROUTINE';
      duration: number;
      speed: number;
      pitchLock: boolean;
      delayMs: number;
      sections: EditorSection[];
      cues: EditorCue[];
    };

function reducer(state: RoutineState, action: Action): RoutineState {
  switch (action.type) {
    case 'SET_T':
      return { ...state, t: Math.max(0, Math.min(action.t, state.duration)) };

    case 'TOGGLE_PLAY':
      return { ...state, playing: !state.playing };

    case 'SET_SPEED':
      return { ...state, speed: Math.max(0.25, Math.min(1.5, action.speed)) };

    case 'TOGGLE_PITCH_LOCK':
      return { ...state, pitchLock: !state.pitchLock };

    case 'SET_DELAY':
      return { ...state, delayMs: Math.max(0, Math.min(15000, action.delayMs)) };

    case 'TOGGLE_MIRROR':
      return { ...state, mirror: !state.mirror };

    case 'SET_PX_PER_SEC': {
      const pxPerSec = Math.max(2.2, Math.min(7, Math.round(action.pxPerSec * 10) / 10));
      return { ...state, pxPerSec };
    }

    case 'SELECT_CUE':
      return { ...state, selectedCueId: action.id };

    case 'OPEN_SHEET': {
      const cue =
        action.cue ??
        ({ id: `c${Date.now()}`, time: Math.round(state.t), type: 'count', count: '' } as EditorCue);
      return { ...state, sheetOpen: true, draft: cue, selectedCueId: cue.id };
    }

    case 'CLOSE_SHEET':
      return { ...state, sheetOpen: false, draft: null };

    case 'SET_DRAFT':
      return { ...state, draft: state.draft ? { ...state.draft, ...action.draft } : null };

    case 'SAVE_CUE': {
      if (!state.draft) return state;
      const exists = state.cues.some((c) => c.id === state.draft!.id);
      const cues = exists
        ? state.cues.map((c) => (c.id === state.draft!.id ? state.draft! : c))
        : [...state.cues, state.draft];
      return { ...state, sheetOpen: false, draft: null, cues: cues.sort((a, b) => a.time - b.time) };
    }

    case 'DELETE_CUE':
      return {
        ...state,
        cues: state.cues.filter((c) => c.id !== action.id),
        sheetOpen: false,
        draft: null,
        selectedCueId: null,
      };

    case 'ADD_CUE': {
      const newCue: EditorCue = { id: `c${Date.now()}`, time: Math.round(state.t), type: 'count', count: '', note: '' };
      return { ...state, sheetOpen: true, draft: newCue, selectedCueId: newCue.id };
    }

    case 'RETIME_CUE': {
      const snapped = Math.round(action.time * 2) / 2;
      const t = Math.max(0, Math.min(snapped, state.duration));
      const cues = state.cues.map((c) => (c.id === action.id ? { ...c, time: t } : c)).sort((a, b) => a.time - b.time);
      return { ...state, cues };
    }

    case 'ADD_SECTION': {
      const sections = [
        ...state.sections,
        { id: `s${Date.now()}`, time: Math.max(0, Math.min(action.time, state.duration)), name: action.name },
      ].sort((a, b) => a.time - b.time);
      return { ...state, sections };
    }

    case 'DELETE_SECTION':
      return { ...state, sections: state.sections.filter((s) => s.id !== action.id) };

    case 'RETIME_SECTION': {
      const t = Math.max(0, Math.min(action.time, state.duration));
      const sections = state.sections
        .map((s) => (s.id === action.id ? { ...s, time: t } : s))
        .sort((a, b) => a.time - b.time);
      return { ...state, sections };
    }

    case 'LOAD_ROUTINE':
      return {
        ...INITIAL,
        playing: false,
        t: 0,
        duration: action.duration,
        speed: action.speed,
        pitchLock: action.pitchLock,
        delayMs: action.delayMs,
        sections: action.sections,
        cues: action.cues,
      };

    case 'INIT_ROUTINE':
      return { ...INITIAL, duration: action.duration };

    default:
      return state;
  }
}

export function fmtTime(t: number): string {
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function currentSection(state: RoutineState): EditorSection | null {
  const before = state.sections.filter((s) => s.time <= state.t).sort((a, b) => b.time - a.time);
  return before[0] ?? null;
}

export function currentCue(state: RoutineState): EditorCue | null {
  const before = state.cues.filter((c) => c.time <= state.t).sort((a, b) => b.time - a.time);
  return before[0] ?? null;
}

export function nextCue(state: RoutineState): EditorCue | null {
  const after = state.cues.filter((c) => c.time > state.t).sort((a, b) => a.time - b.time);
  return after[0] ?? null;
}

interface StoreContextValue {
  state: RoutineState;
  dispatch: React.Dispatch<Action>;
}

const StoreContext = createContext<StoreContextValue | null>(null);

export function RoutineStoreProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, INITIAL);
  return <StoreContext.Provider value={{ state, dispatch }}>{children}</StoreContext.Provider>;
}

export function useRoutineStore(): StoreContextValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useRoutineStore must be used within a RoutineStoreProvider');
  return ctx;
}
