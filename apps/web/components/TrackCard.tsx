import Link from 'next/link';
import type { AudioTrack } from '@dancer-hub/shared';

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function TrackCard({ track }: { track: AudioTrack }) {
  const metaBits = [
    track.artist,
    track.tempo_bpm != null ? `${track.tempo_bpm} BPM` : null,
    track.musical_key,
  ].filter(Boolean);

  return (
    <Link
      href={`/tracks/${track.id}`}
      className="block bg-white border border-gray-200 rounded-xl p-5 hover:border-brand-500 transition-colors"
    >
      <div className="flex items-center gap-4">
        {track.album_art_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={track.album_art_url}
            alt=""
            className="w-12 h-12 rounded-lg object-cover shrink-0"
          />
        ) : (
          <div className="w-12 h-12 rounded-full bg-brand-100 flex items-center justify-center text-brand-600 text-lg select-none shrink-0">
            ♪
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-gray-900 truncate">{track.title}</p>
          {metaBits.length > 0 && (
            <p className="text-sm text-gray-500 mt-0.5 truncate">{metaBits.join(' · ')}</p>
          )}
          <p className="text-sm text-gray-400 mt-1">
            {new Date(track.created_at).toLocaleDateString()}
            {track.duration_seconds ? ` · ${formatDuration(track.duration_seconds)}` : ''}
          </p>
        </div>
      </div>
    </Link>
  );
}
