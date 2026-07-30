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

      <div className="flex items-start gap-4 mb-8">
        {track.album_art_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={track.album_art_url}
            alt=""
            className="w-20 h-20 rounded-xl object-cover shrink-0"
          />
        ) : null}
        <div className="min-w-0">
          <h1 className="text-2xl font-bold mb-1">{track.title}</h1>
          {track.artist && <p className="text-gray-600 text-sm mb-1">{track.artist}</p>}
          <p className="text-gray-400 text-sm">
            Uploaded {new Date(track.created_at).toLocaleDateString()}
            {track.duration_seconds ? ` · ${formatDuration(track.duration_seconds)}` : ''}
            {track.tempo_bpm != null ? ` · ${track.tempo_bpm} BPM` : ''}
            {track.musical_key ? ` · ${track.musical_key}` : ''}
          </p>
          {track.spotify_url && (
            <a
              href={track.spotify_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block text-sm text-brand-600 hover:underline mt-2"
            >
              Open in Spotify
            </a>
          )}
          {(track.tempo_bpm != null || track.musical_key) && (
            <p className="text-xs text-gray-400 mt-2">
              Tempo &amp; key data powered by{' '}
              <a
                href="https://getsongbpm.com"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-gray-500"
              >
                GetSongBPM
              </a>
            </p>
          )}
        </div>
      </div>

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
