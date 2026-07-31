'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useSession } from '@/lib/useSession';
import { RoutineStoreProvider, useRoutineStore } from '@/lib/routineStore';
import RoutineDetailsForm, { type RoutineDetails } from './RoutineDetailsForm';
import RoutineTimelineEditor from './RoutineTimelineEditor';

type Step = 'details' | 'timeline';

function extOf(filename: string, fallback: string): string {
  return filename.split('.').pop()?.toLowerCase() || fallback;
}

function TimelineStep({
  details,
  onSaved,
  onSkip,
}: {
  details: RoutineDetails;
  onSaved: (routineId: string) => void;
  onSkip: () => void;
}) {
  const router = useRouter();
  const { dispatch, state } = useRoutineStore();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  useEffect(() => {
    dispatch({
      type: 'INIT_ROUTINE',
      duration: details.audioDurationSec || details.videoDurationSec || 0,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const url = details.audioFile ? URL.createObjectURL(details.audioFile) : null;
    setAudioUrl(url);
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [details.audioFile]);

  useEffect(() => {
    const url = details.videoFile ? URL.createObjectURL(details.videoFile) : null;
    setVideoUrl(url);
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [details.videoFile]);

  async function handleSave() {
    setSaving(true);
    setError(null);

    // Server-validated (not just the local session) since this becomes a
    // permanent user_id FK on the row — re-check even though the outer
    // RoutineCreateFlow already gated entry to this screen.
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setError('Your session expired — please sign in again.');
      setSaving(false);
      return;
    }

    let audioFilePath: string | null = null;
    let videoFilePath: string | null = null;

    if (details.audioFile) {
      audioFilePath = `${Date.now()}_audio.${extOf(details.audioFile.name, 'm4a')}`;
      const { error } = await supabase.storage
        .from('audio-tracks')
        .upload(audioFilePath, details.audioFile, { contentType: details.audioFile.type || 'audio/mpeg' });
      if (error) {
        setError(error.message);
        setSaving(false);
        return;
      }
    }

    if (details.videoFile) {
      videoFilePath = `${Date.now()}_video.${extOf(details.videoFile.name, 'mp4')}`;
      const { error } = await supabase.storage
        .from('video-tracks')
        .upload(videoFilePath, details.videoFile, { contentType: details.videoFile.type || 'video/mp4' });
      if (error) {
        setError(error.message);
        setSaving(false);
        return;
      }
    }

    const { data: routine, error: insertErr } = await supabase
      .from('routines')
      .insert({
        user_id: user.id,
        name: details.name,
        style: details.style,
        duration_sec: state.duration,
        speed: state.speed,
        pitch_lock: state.pitchLock,
        delay_ms: state.delayMs,
        audio_file_path: audioFilePath,
        audio_file_name: details.audioFile?.name ?? null,
        audio_duration_sec: details.audioDurationSec || null,
        video_file_path: videoFilePath,
        video_file_name: details.videoFile?.name ?? null,
        video_duration_sec: details.videoDurationSec || null,
        spotify_track_id: details.spotifyTrackId,
        spotify_url: details.spotifyUrl,
        album_art_url: details.albumArtUrl,
        artist: details.artist,
        tempo_bpm: details.tempoBpm,
        musical_key: details.musicalKey,
        metadata_fetched_at:
          details.spotifyTrackId || details.tempoBpm || details.musicalKey ? new Date().toISOString() : null,
      })
      .select()
      .single();

    if (insertErr || !routine) {
      setError(insertErr?.message ?? 'Failed to save routine');
      setSaving(false);
      return;
    }

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

    onSaved(routine.id);
    router.push(`/routines/${routine.id}`);
  }

  return (
    <div>
      {error && <p className="mb-3 text-sm text-red-500">{error}</p>}
      <RoutineTimelineEditor
        title={details.name}
        onSave={handleSave}
        onSkip={onSkip}
        saving={saving}
        audioUrl={audioUrl}
        videoUrl={videoUrl}
      />
    </div>
  );
}

export default function RoutineCreateFlow() {
  const router = useRouter();
  const { user, loading } = useSession();
  const [step, setStep] = useState<Step>('details');
  const [details, setDetails] = useState<RoutineDetails | null>(null);

  useEffect(() => {
    if (!loading && !user) router.replace('/login?redirect=/routines/new');
  }, [loading, user, router]);

  if (loading || !user) return null;

  if (step === 'details') {
    return (
      <RoutineDetailsForm
        onContinue={(d) => {
          setDetails(d);
          setStep('timeline');
        }}
      />
    );
  }

  return (
    <RoutineStoreProvider>
      <TimelineStep details={details!} onSaved={() => undefined} onSkip={() => router.push('/routines')} />
    </RoutineStoreProvider>
  );
}
