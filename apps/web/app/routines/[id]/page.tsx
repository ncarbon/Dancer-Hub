'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { fetchRoutineWithChildren, resolveRoutineMediaUrls, type RoutineWithChildren } from '@/lib/routines';
import RoutinePlayer from '@/components/routines/RoutinePlayer';

export default function RoutinePlayerPage() {
  const { id } = useParams<{ id: string }>();
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

  if (loading) {
    return <p className="text-gray-400 text-center py-20">Loading...</p>;
  }

  if (error || !routine) {
    return <p className="text-red-500 text-center py-20">{error}</p>;
  }

  return <RoutinePlayer routine={routine} audioUrl={audioUrl} videoUrl={videoUrl} />;
}
