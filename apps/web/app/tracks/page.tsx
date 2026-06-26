'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import type { AudioTrack } from '@dancer-hub/shared';
import TrackCard from '@/components/TrackCard';

export default function TracksPage() {
  const [tracks, setTracks] = useState<AudioTrack[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchTracks() {
      const { data, error } = await supabase
        .from('audio_tracks')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        setError(error.message);
      } else {
        setTracks(data ?? []);
      }
      setLoading(false);
    }
    fetchTracks();
  }, []);

  if (loading) {
    return <p className="text-gray-400 text-center py-20">Loading tracks...</p>;
  }

  if (error) {
    return <p className="text-red-500 text-center py-20">Error: {error}</p>;
  }

  if (tracks.length === 0) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-400 mb-4">No tracks yet.</p>
        <Link href="/tracks/upload" className="text-brand-600 font-medium hover:underline">
          Upload your first track
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Your Tracks</h1>
      <div className="grid gap-4">
        {tracks.map((track) => (
          <TrackCard key={track.id} track={track} />
        ))}
      </div>
    </div>
  );
}
