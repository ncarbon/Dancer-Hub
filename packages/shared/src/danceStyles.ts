export interface DanceStyleProfile {
  id: string;
  name: string;
  bpmMin: number;
  bpmMax: number;
  /** Preferred center of the range — used to rank fits */
  bpmSweetSpot: number;
  /**
   * Ranking multiplier after BPM fit (default 1).
   * Use to prefer styles that fit the groove, not just the metronome
   * (e.g. hustle over samba on straight pop/disco).
   */
  rankWeight?: number;
  /** Preferred meters (numerator). Empty/omitted = any. */
  preferredTimeSignatures?: number[];
  /**
   * How strongly this style wants a “danceable” groove (0–1 Spotify-style scale).
   * - high: hustle / salsa / reggaeton
   * - medium: social defaults
   * - low: ballet / contemporary (phrasing > club groove)
   * - any: ignore danceability
   */
  danceabilityBias?: 'high' | 'medium' | 'low' | 'any';
  /** How dancers typically count this style */
  countLabel: string;
  /** Music that often works at this tempo / feel */
  musicNotes: string;
  /** Extra guidance shown in the UI */
  tip?: string;
  /**
   * Short looping demo (mp4/webm/gif) under the web app's public folder,
   * e.g. `/demos/hustle.mp4`. Omit until the asset is ready.
   */
  demoUrl?: string;
  /** Optional still frame while the demo loads */
  demoPosterUrl?: string;
  /** Attribution shown under the demo */
  demoCredit?: string;
}

export interface DanceStyleMatch extends DanceStyleProfile {
  /** 0–1+, higher = closer to the style's sweet spot after all signals */
  fit: number;
  /** Human-readable reasons this style ranked here */
  matchReasons?: string[];
}

export interface StyleMatchSignals {
  timeSignature?: number | null;
  /** 0–1 */
  danceability?: number | null;
}

/**
 * Curated tempo ranges for social / studio styles.
 * Ranges are approximate — groove and count feel matter as much as BPM.
 */
export const DANCE_STYLES: DanceStyleProfile[] = [
  {
    id: 'hustle',
    name: 'Latin Hustle',
    bpmMin: 115,
    bpmMax: 126,
    bpmSweetSpot: 117,
    rankWeight: 1.2,
    preferredTimeSignatures: [4],
    danceabilityBias: 'high',
    countLabel: '& 1 2 3',
    musicNotes: 'Pop, disco, and some house',
    tip: 'Needs a clear 4-count pulse. House works when the groove isn’t too swung or broken.',
    demoUrl: '/demos/hustle.mp4',
  },
  {
    id: 'bachata',
    name: 'Bachata',
    bpmMin: 105,
    bpmMax: 145,
    bpmSweetSpot: 128,
    preferredTimeSignatures: [4],
    danceabilityBias: 'high',
    countLabel: '1 2 3 4 (tap)',
    musicNotes: 'Bachata, romantic pop, some R&B',
    demoUrl: '/demos/bachata.mp4',
  },
  {
    id: 'salsa',
    name: 'Salsa',
    bpmMin: 150,
    bpmMax: 250,
    bpmSweetSpot: 190,
    preferredTimeSignatures: [4],
    danceabilityBias: 'high',
    countLabel: '1 2 3 4 5 6 7 8',
    musicNotes: 'Salsa, mambo, Latin jazz',
    tip: 'Tempo is often felt in half-time relative to the written BPM.',
    demoUrl: '/demos/salsa.mp4',
  },
  {
    id: 'kizomba',
    name: 'Kizomba',
    bpmMin: 80,
    bpmMax: 110,
    bpmSweetSpot: 95,
    rankWeight: 0.9,
    preferredTimeSignatures: [4],
    danceabilityBias: 'medium',
    countLabel: 'slow 1 2 3 4',
    musicNotes: 'Kizomba, zouk, slower Afro-Latin',
    demoUrl: '/demos/kizomba.mp4',
  },
  {
    id: 'reggaeton',
    name: 'Reggaeton',
    bpmMin: 80,
    bpmMax: 105,
    bpmSweetSpot: 92,
    preferredTimeSignatures: [4],
    danceabilityBias: 'high',
    countLabel: '1 & 2 & (dembow)',
    musicNotes: 'Reggaeton, Latin urban, some dembow pop',
    demoUrl: '/demos/reggaeton.mp4',
  },
  {
    id: 'samba',
    name: 'Samba',
    // International/social samba is a tight band; wider ranges steal pop/disco matches.
    bpmMin: 96,
    bpmMax: 108,
    bpmSweetSpot: 100,
    rankWeight: 0.75,
    preferredTimeSignatures: [2, 4],
    danceabilityBias: 'high',
    countLabel: 'a 1 a 2',
    musicNotes: 'Brazilian samba, carnival, Latin ballroom samba music',
    tip: 'Syncopation makes samba feel faster than the BPM suggests — straight pop/disco is usually a better hustle fit.',
    demoUrl: '/demos/samba.mp4',
  },
  {
    id: 'hip-hop',
    name: 'Hip Hop',
    bpmMin: 70,
    bpmMax: 115,
    bpmSweetSpot: 90,
    preferredTimeSignatures: [4],
    danceabilityBias: 'high',
    countLabel: '1 2 3 4 (or double-time)',
    musicNotes: 'Hip hop, R&B, trap',
    tip: 'Many tracks sit ~140–180 BPM but are danced half-time (~70–90).',
    demoUrl: '/demos/hip-hop.mp4',
  },
  {
    id: 'jazz',
    name: 'Jazz',
    bpmMin: 90,
    bpmMax: 160,
    bpmSweetSpot: 120,
    rankWeight: 0.85,
    preferredTimeSignatures: [4],
    danceabilityBias: 'medium',
    countLabel: '1 2 3 4 5 6 7 8',
    musicNotes: 'Jazz standards, musical theatre, upbeat pop',
    demoUrl: '/demos/jazz.mp4',
  },
  {
    id: 'ballroom',
    name: 'Ballroom',
    bpmMin: 80,
    bpmMax: 140,
    bpmSweetSpot: 110,
    rankWeight: 0.7,
    preferredTimeSignatures: [3, 4],
    danceabilityBias: 'medium',
    countLabel: 'varies by dance',
    musicNotes: 'Foxtrot, waltz, cha-cha, and other ballroom tempos',
    tip: 'Each ballroom dance has its own narrower tempo — treat this as a broad starting point.',
    demoUrl: '/demos/ballroom.mp4',
  },
  {
    id: 'ballet',
    name: 'Ballet',
    bpmMin: 50,
    bpmMax: 140,
    bpmSweetSpot: 90,
    rankWeight: 0.55,
    preferredTimeSignatures: [2, 3, 4, 6],
    danceabilityBias: 'low',
    countLabel: 'phrase-based',
    musicNotes: 'Classical, lyrical pop, cinematic',
    tip: 'Compatibility is more about phrasing and accents than a strict BPM.',
    demoUrl: '/demos/ballet.mp4',
  },
  {
    id: 'contemporary',
    name: 'Contemporary',
    bpmMin: 50,
    bpmMax: 140,
    bpmSweetSpot: 95,
    rankWeight: 0.55,
    preferredTimeSignatures: [2, 3, 4, 6],
    danceabilityBias: 'low',
    countLabel: 'phrase-based',
    musicNotes: 'Cinematic, indie, ambient, lyrical',
    tip: 'Wide tempo range — musicality and section changes matter more than BPM alone.',
    demoUrl: '/demos/contemporary.mp4',
  },
];

function bpmFitScore(bpm: number, style: DanceStyleProfile): number {
  if (bpm < style.bpmMin || bpm > style.bpmMax) return 0;

  const span = Math.max(style.bpmMax - style.bpmMin, 1);
  const distance = Math.abs(bpm - style.bpmSweetSpot);
  // 1 at the sweet spot, down toward ~0.35 at the edges of the range
  return Math.max(0.35, 1 - distance / span);
}

function timeSignatureMultiplier(
  style: DanceStyleProfile,
  timeSignature: number | null | undefined,
  reasons: string[],
): number {
  if (timeSignature == null || !style.preferredTimeSignatures?.length) return 1;

  if (style.preferredTimeSignatures.includes(timeSignature)) {
    reasons.push(`${timeSignature}/4 meter fits`);
    return 1.18;
  }

  // Soft penalty — still show the style if BPM fits, but rank it lower.
  reasons.push(`${timeSignature}/4 is atypical for this style`);
  return 0.72;
}

function danceabilityMultiplier(
  style: DanceStyleProfile,
  danceability: number | null | undefined,
  reasons: string[],
): number {
  const bias = style.danceabilityBias ?? 'any';
  if (bias === 'any' || danceability == null) return 1;

  const score = Math.max(0, Math.min(1, danceability));

  if (bias === 'high') {
    if (score >= 0.65) {
      reasons.push('high danceability');
      return 1.2;
    }
    if (score >= 0.45) return 1.05;
    reasons.push('lower danceability');
    return 0.8;
  }

  if (bias === 'medium') {
    if (score >= 0.35 && score <= 0.8) return 1.05;
    return 0.95;
  }

  // low bias (ballet / contemporary): prefer less "club" danceability
  if (score <= 0.45) {
    reasons.push('suited to lyrical / phrase-based movement');
    return 1.15;
  }
  if (score >= 0.75) {
    reasons.push('very danceable groove — less typical');
    return 0.75;
  }
  return 1;
}

function fitScore(
  bpm: number,
  style: DanceStyleProfile,
  signals?: StyleMatchSignals,
): { fit: number; matchReasons: string[] } {
  const bpmFit = bpmFitScore(bpm, style);
  if (bpmFit <= 0) return { fit: 0, matchReasons: [] };

  const matchReasons: string[] = [`${style.bpmMin}–${style.bpmMax} BPM range`];
  const meterMul = timeSignatureMultiplier(style, signals?.timeSignature, matchReasons);
  const danceMul = danceabilityMultiplier(style, signals?.danceability, matchReasons);
  const fit = bpmFit * (style.rankWeight ?? 1) * meterMul * danceMul;
  return { fit, matchReasons };
}

/** Styles whose tempo range includes `bpm`, ranked best-fit first. */
export function matchDanceStyles(
  bpm: number,
  signals?: StyleMatchSignals,
): DanceStyleMatch[] {
  if (!Number.isFinite(bpm) || bpm <= 0) return [];

  return DANCE_STYLES.map((style) => {
      const { fit, matchReasons } = fitScore(bpm, style, signals);
      return { ...style, fit, matchReasons };
    })
    .filter((style) => style.fit > 0)
    .sort((a, b) => b.fit - a.fit || a.name.localeCompare(b.name));
}
