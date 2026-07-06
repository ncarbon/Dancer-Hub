import React, { createContext, useContext, useReducer } from 'react';

export type CueType = 'count' | 'formation' | 'movement' | 'entrance' | 'lift' | 'note';
export type Count = '—' | '1-2-3-4' | '5-6-7-8' | '&-1-&-2' | '1-a-2-a';

export interface Section { id: string; time: number; name: string; }
export interface Cue     { id: string; time: number; type: CueType; count: Count | ''; note: string; }
export interface Task    { id: string; label: string; done: boolean; progress?: { current: number; total: number }; }

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
  draft: Cue | null;
  sections: Section[];
  cues: Cue[];
  tasks: Task[];
}

const SEED: RoutineState = {
  playing: false,
  t: 0,
  duration: 220,
  speed: 1.0,
  pitchLock: true,
  delayMs: 0,
  mirror: true,
  pxPerSec: 3.4,
  selectedCueId: null,
  sheetOpen: false,
  draft: null,
  sections: [
    { id: 's1', time: 0,   name: 'Intro' },
    { id: 's2', time: 24,  name: 'Verse' },
    { id: 's3', time: 64,  name: 'Chorus' },
    { id: 's4', time: 130, name: 'Bridge' },
    { id: 's5', time: 180, name: 'Outro' },
  ],
  cues: [
    { id: 'c1', time: 8,   type: 'entrance',  count: '',        note: 'Stage left' },
    { id: 'c2', time: 31,  type: 'count',     count: '5-6-7-8', note: 'Prep for lift — spot front' },
    { id: 'c3', time: 48,  type: 'formation', count: '',        note: 'A → B' },
    { id: 'c4', time: 96,  type: 'lift',      count: '1-2-3-4', note: 'Overhead — hold 4' },
    { id: 'c5', time: 150, type: 'movement',  count: '',        note: 'Traveling turns' },
  ],
  tasks: [
    { id: 't1', label: 'Confirm costume fitting',    done: true },
    { id: 't2', label: 'Review formation chart',     done: true },
    { id: 't3', label: 'Run through Act 1 solo',     done: true },
    { id: 't4', label: 'Sync music with lighting',   done: true },
    { id: 't5', label: '5 full run-throughs',        done: false, progress: { current: 3, total: 5 } },
    { id: 't6', label: 'Warm-up with full cast',     done: false },
    { id: 't7', label: 'Confirm prop placement',     done: false },
  ],
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
  | { type: 'OPEN_SHEET'; cue?: Cue }
  | { type: 'CLOSE_SHEET' }
  | { type: 'SET_DRAFT'; draft: Partial<Cue> }
  | { type: 'SAVE_CUE' }
  | { type: 'DELETE_CUE'; id: string }
  | { type: 'ADD_CUE' }
  | { type: 'RETIME_CUE'; id: string; time: number }
  | { type: 'TOGGLE_TASK'; id: string }
  | { type: 'PREV_SECTION' }
  | { type: 'NEXT_SECTION' }
  | { type: 'TICK'; dt: number }
  | { type: 'ADD_SECTION'; name: string; time: number }
  | { type: 'DELETE_SECTION'; id: string }
  | { type: 'RETIME_SECTION'; id: string; time: number }
  | { type: 'INIT_ROUTINE'; duration: number }
  | {
      type: 'LOAD_ROUTINE';
      duration: number; speed: number; pitchLock: boolean;
      delayMs: number; sections: Section[]; cues: Cue[];
    };

function reducer(state: RoutineState, action: Action): RoutineState {
  switch (action.type) {
    case 'SET_T':
      return { ...state, t: Math.max(0, Math.min(action.t, state.duration)) };

    case 'TOGGLE_PLAY':
      return { ...state, playing: !state.playing };

    case 'TICK': {
      if (!state.playing) return state;
      const t = state.t + action.dt * state.speed;
      if (t >= state.duration) {
        return { ...state, playing: false, t: state.duration };
      }
      return { ...state, t };
    }

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
      const cue = action.cue ?? { id: `c${Date.now()}`, time: Math.round(state.t), type: 'count' as CueType, count: '' as Count, note: '' };
      return { ...state, sheetOpen: true, draft: cue, selectedCueId: cue.id };
    }

    case 'CLOSE_SHEET':
      return { ...state, sheetOpen: false, draft: null };

    case 'SET_DRAFT':
      return { ...state, draft: state.draft ? { ...state.draft, ...action.draft } : null };

    case 'SAVE_CUE': {
      if (!state.draft) return state;
      const exists = state.cues.some(c => c.id === state.draft!.id);
      const cues = exists
        ? state.cues.map(c => c.id === state.draft!.id ? state.draft! : c)
        : [...state.cues, state.draft];
      return { ...state, sheetOpen: false, draft: null, cues: cues.sort((a, b) => a.time - b.time) };
    }

    case 'DELETE_CUE':
      return { ...state, cues: state.cues.filter(c => c.id !== action.id), sheetOpen: false, draft: null, selectedCueId: null };

    case 'ADD_CUE': {
      const newCue: Cue = { id: `c${Date.now()}`, time: Math.round(state.t), type: 'count', count: '', note: '' };
      return { ...state, sheetOpen: true, draft: newCue, selectedCueId: newCue.id };
    }

    case 'RETIME_CUE': {
      const snapped = Math.round(action.time * 2) / 2;
      const t = Math.max(0, Math.min(snapped, state.duration));
      const cues = state.cues.map(c => c.id === action.id ? { ...c, time: t } : c).sort((a, b) => a.time - b.time);
      return { ...state, cues };
    }

    case 'TOGGLE_TASK':
      return { ...state, tasks: state.tasks.map(t => t.id === action.id ? { ...t, done: !t.done } : t) };

    case 'PREV_SECTION': {
      const before = state.sections.filter(s => s.time < state.t - 0.5).sort((a, b) => b.time - a.time);
      if (before.length) return { ...state, t: before[0].time };
      return state;
    }

    case 'NEXT_SECTION': {
      const after = state.sections.filter(s => s.time > state.t + 0.5).sort((a, b) => a.time - b.time);
      if (after.length) return { ...state, t: after[0].time };
      return state;
    }

    case 'ADD_SECTION': {
      const sections = [
        ...state.sections,
        { id: `s${Date.now()}`, time: Math.max(0, Math.min(action.time, state.duration)), name: action.name },
      ].sort((a, b) => a.time - b.time);
      return { ...state, sections };
    }

    case 'DELETE_SECTION':
      return { ...state, sections: state.sections.filter(s => s.id !== action.id) };

    case 'RETIME_SECTION': {
      const t = Math.max(0, Math.min(action.time, state.duration));
      const sections = state.sections.map(s => s.id === action.id ? { ...s, time: t } : s).sort((a, b) => a.time - b.time);
      return { ...state, sections };
    }

    case 'LOAD_ROUTINE':
      return {
        ...SEED,
        playing: false, t: 0,
        duration: action.duration,
        speed: action.speed,
        pitchLock: action.pitchLock,
        delayMs: action.delayMs,
        sections: action.sections,
        cues: action.cues,
        tasks: [],
      };

    case 'INIT_ROUTINE':
      return {
        ...SEED,
        duration: action.duration,
        sections: [],
        cues: [],
        tasks: [],
      };

    default:
      return state;
  }
}

export function fmtTime(t: number): string {
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function currentSection(state: RoutineState): Section | null {
  const before = state.sections.filter(s => s.time <= state.t).sort((a, b) => b.time - a.time);
  return before[0] ?? null;
}

export function currentCue(state: RoutineState): Cue | null {
  const before = state.cues.filter(c => c.time <= state.t).sort((a, b) => b.time - a.time);
  return before[0] ?? null;
}

export function nextCue(state: RoutineState): Cue | null {
  const after = state.cues.filter(c => c.time > state.t).sort((a, b) => a.time - b.time);
  return after[0] ?? null;
}

interface StoreContextValue {
  state: RoutineState;
  dispatch: React.Dispatch<Action>;
}

const StoreContext = createContext<StoreContextValue>(null!);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, SEED);
  return <StoreContext.Provider value={{ state, dispatch }}>{children}</StoreContext.Provider>;
}

export function useStore() {
  return useContext(StoreContext);
}
