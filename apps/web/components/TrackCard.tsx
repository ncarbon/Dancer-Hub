import Link from 'next/link';
import type { AudioTrack } from '@dancer-hub/shared';

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function TrackCard({ track }: { track: AudioTrack }) {
  return (
    <Link
      href={`/tracks/${track.id}`}
      className="block bg-white border border-gray-200 rounded-xl p-5 hover:border-brand-500 transition-colors"
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="font-semibold text-gray-900">{track.title}</p>
          <p className="text-sm text-gray-400 mt-1">
            {new Date(track.created_at).toLocaleDateString()}
            {track.duration_seconds ? ` · ${formatDuration(track.duration_seconds)}` : ''}
          </p>
        </div>
        <div className="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center text-brand-600 text-lg select-none">
          ♪
        </div>
      </div>
    </Link>
  );
}
