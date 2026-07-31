import { supabase } from '@/lib/supabase';
import type { Routine, Section, Cue } from '@dancer-hub/shared';

export type RoutineWithChildren = Routine & { sections: Section[]; cues: Cue[] };

export async function fetchRoutineWithChildren(
  id: string,
): Promise<{ data: RoutineWithChildren | null; error: string | null }> {
  const { data, error } = await supabase
    .from('routines')
    .select('*, sections(*), cues(*)')
    .eq('id', id)
    .single();

  if (error || !data) {
    return { data: null, error: error?.message ?? 'Routine not found' };
  }
  return { data: data as RoutineWithChildren, error: null };
}

export function resolveRoutineMediaUrls(routine: Routine): {
  audioUrl: string | null;
  videoUrl: string | null;
} {
  const audioUrl = routine.audio_file_path
    ? supabase.storage.from('audio-tracks').getPublicUrl(routine.audio_file_path).data.publicUrl
    : null;
  const videoUrl = routine.video_file_path
    ? supabase.storage.from('video-tracks').getPublicUrl(routine.video_file_path).data.publicUrl
    : null;
  return { audioUrl, videoUrl };
}
