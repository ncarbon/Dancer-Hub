import Link from 'next/link';
import HatchPlaceholder from './HatchPlaceholder';
import type { RoutineWithChildren } from '@/lib/routines';

function formatDuration(seconds: number): string {
  const total = Math.floor(seconds);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function RoutineCard({ routine }: { routine: RoutineWithChildren }) {
  const hasCues = routine.cues.length > 0;
  const metaLine = [
    routine.artist,
    routine.style ?? 'No style',
    formatDuration(routine.duration_sec),
    routine.tempo_bpm != null ? `${routine.tempo_bpm} BPM` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <Link
      href={`/routines/${routine.id}`}
      className="block bg-white border border-gray-200 rounded-xl p-4 hover:border-brand-500 transition-colors"
    >
      <div className="flex items-center gap-4">
        {routine.album_art_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={routine.album_art_url} alt="" className="w-14 h-14 rounded-lg object-cover shrink-0" />
        ) : (
          <HatchPlaceholder className="w-14 h-14 rounded-lg shrink-0" />
        )}
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-gray-900 truncate">{routine.name}</p>
          <p className="text-sm text-gray-500 mt-0.5 truncate">{metaLine}</p>
          <p className={`text-sm mt-1 truncate ${hasCues ? 'text-gray-400' : 'text-gray-300 italic'}`}>
            {hasCues
              ? `${routine.cues.length} cues · ${routine.sections.length} sections`
              : 'Draft — no cues yet'}
          </p>
        </div>
      </div>
    </Link>
  );
}
