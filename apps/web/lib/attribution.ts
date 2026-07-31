import type { Routine } from '@dancer-hub/shared';

interface CcLicense {
  label: string;
  url: string;
}

/** Artists whose tracks are used under a Creative Commons license and require attribution. */
const CC_LICENSED_ARTISTS: Record<string, CcLicense> = {
  'Kevin MacLeod': {
    label: 'CC BY 4.0',
    url: 'https://creativecommons.org/licenses/by/4.0/',
  },
};

/** Derives "Track Title" from a stored filename like "Funkorama.mp3" or "Monkeys_Spinning_Monkeys.mp3". */
function titleFromFileName(fileName: string): string {
  return fileName.replace(/\.[^.]+$/, '').replace(/_/g, ' ');
}

export function getTrackAttribution(
  routine: Pick<Routine, 'artist' | 'audio_file_name'>,
): { credit: string; licenseLabel: string; licenseUrl: string } | null {
  if (!routine.artist || !routine.audio_file_name) return null;
  const license = CC_LICENSED_ARTISTS[routine.artist];
  if (!license) return null;

  const title = titleFromFileName(routine.audio_file_name);
  return {
    credit: `"${title}" by ${routine.artist} (incompetech.com)`,
    licenseLabel: license.label,
    licenseUrl: license.url,
  };
}
