'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import type { AudioTrack } from '@dancer-hub/shared';
import AudioPlayer from '@/components/AudioPlayer';

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function TrackPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [track, setTrack] = useState<AudioTrack | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchTrack() {
      const { data, error } = await supabase
        .from('audio_tracks')
        .select('*')
        .eq('id', id)
        .single();

      if (error || !data) {
        setError('Track not found');
        setLoading(false);
        return;
      }

      setTrack(data);

      const { data: urlData } = supabase.storage
        .from('audio-tracks')
        .getPublicUrl(data.file_path);

      setAudioUrl(urlData.publicUrl);
      setLoading(false);
    }

    fetchTrack();
  }, [id]);

  if (loading) {
    return <p className="text-gray-400 text-center py-20">Loading...</p>;
  }

  if (error || !track) {
    return <p className="text-red-500 text-center py-20">{error}</p>;
  }

  return (
    <div>
      <button
        onClick={() => router.back()}
        className="text-gray-400 hover:text-gray-900 mb-6 flex items-center gap-1 text-sm transition-colors"
      >
        ← Back
      </button>

      <h1 className="text-2xl font-bold mb-2">{track.title}</h1>
      <p className="text-gray-400 text-sm mb-8">
        Uploaded {new Date(track.created_at).toLocaleDateString()}
        {track.duration_seconds ? ` · ${formatDuration(track.duration_seconds)}` : ''}
      </p>

      {audioUrl && <AudioPlayer src={audioUrl} />}

      <div className="mt-8 space-y-3">
        <div className="border border-dashed border-gray-200 rounded-xl p-4 text-gray-300 text-sm text-center">
          Speed control — coming soon
        </div>
        <div className="border border-dashed border-gray-200 rounded-xl p-4 text-gray-300 text-sm text-center">
          Play delay — coming soon
        </div>
        <div className="border border-dashed border-gray-200 rounded-xl p-4 text-gray-300 text-sm text-center">
          Section marking — coming soon
        </div>
      </div>
    </div>
  );
}
