'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useSession } from '@/lib/useSession';
import { fetchRoutineWithChildren, resolveRoutineMediaUrls, type RoutineWithChildren } from '@/lib/routines';
import { RoutineStoreProvider, useRoutineStore } from '@/lib/routineStore';
import RoutineTimelineEditor from './RoutineTimelineEditor';

function EditorWithData({
  routine,
  audioUrl,
  videoUrl,
}: {
  routine: RoutineWithChildren;
  audioUrl: string | null;
  videoUrl: string | null;
}) {
  const router = useRouter();
  const { state, dispatch } = useRoutineStore();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    dispatch({
      type: 'LOAD_ROUTINE',
      duration: routine.duration_sec,
      speed: routine.speed,
      pitchLock: routine.pitch_lock,
      delayMs: Math.round((routine.delay_ms ?? 0) / 1000) * 1000,
      sections: routine.sections.map((s) => ({ id: s.id, time: s.time_sec, name: s.name })),
      cues: routine.cues.map((c) => ({ id: c.id, time: c.time_sec, type: c.type, count: c.count, note: c.note })),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routine.id]);

  async function handleSave() {
    setSaving(true);
    setError(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user || user.id !== routine.user_id) {
      setError('You no longer have permission to edit this routine.');
      setSaving(false);
      return;
    }

    const { error: updateErr } = await supabase
      .from('routines')
      .update({
        duration_sec: state.duration,
        speed: state.speed,
        pitch_lock: state.pitchLock,
        delay_ms: state.delayMs,
      })
      .eq('id', routine.id);

    if (updateErr) {
      setError(updateErr.message);
      setSaving(false);
      return;
    }

    await supabase.from('sections').delete().eq('routine_id', routine.id);
    await supabase.from('cues').delete().eq('routine_id', routine.id);

    if (state.sections.length > 0) {
      await supabase
        .from('sections')
        .insert(state.sections.map((s) => ({ routine_id: routine.id, time_sec: s.time, name: s.name })));
    }
    if (state.cues.length > 0) {
      await supabase
        .from('cues')
        .insert(state.cues.map((c) => ({ routine_id: routine.id, time_sec: c.time, type: c.type, count: c.count, note: c.note })));
    }

    router.push(`/routines/${routine.id}`);
  }

  return (
    <div>
      {error && <p className="mb-3 text-sm text-red-500">{error}</p>}
      <RoutineTimelineEditor
        title={routine.name || 'Timeline'}
        onSave={handleSave}
        onSkip={() => router.push(`/routines/${routine.id}`)}
        saving={saving}
        audioUrl={audioUrl}
        videoUrl={videoUrl}
      />
    </div>
  );
}

export default function RoutineEditFlow({ id }: { id: string }) {
  const router = useRouter();
  const { user, loading: sessionLoading } = useSession();
  const [routine, setRoutine] = useState<RoutineWithChildren | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const { data, error } = await fetchRoutineWithChildren(id);
      if (error || !data) {
        setError(error ?? 'Routine not found');
        setLoading(false);
        return;
      }
      setRoutine(data);
      const { audioUrl, videoUrl } = resolveRoutineMediaUrls(data);
      setAudioUrl(audioUrl);
      setVideoUrl(videoUrl);
      setLoading(false);
    }
    load();
  }, [id]);

  useEffect(() => {
    if (!sessionLoading && !user) router.replace(`/login?redirect=/routines/${id}/edit`);
  }, [sessionLoading, user, router, id]);

  if (loading || sessionLoading) {
    return <p className="text-gray-400 text-center py-20">Loading...</p>;
  }

  if (error || !routine) {
    return <p className="text-red-500 text-center py-20">{error}</p>;
  }

  if (!user) return null;

  if (routine.user_id !== user.id) {
    return (
      <div className="max-w-sm mx-auto text-center py-20">
        <h1 className="text-lg font-semibold text-gray-900 mb-2">This routine can&apos;t be edited</h1>
        <p className="text-sm text-gray-500 mb-4">
          {routine.user_id === null
            ? "It's a public demo routine."
            : "You don't have permission to edit this routine."}
        </p>
        <Link href={`/routines/${id}`} className="text-brand-600 font-medium hover:underline">
          Back to routine
        </Link>
      </div>
    );
  }

  return (
    <RoutineStoreProvider>
      <EditorWithData routine={routine} audioUrl={audioUrl} videoUrl={videoUrl} />
    </RoutineStoreProvider>
  );
}
