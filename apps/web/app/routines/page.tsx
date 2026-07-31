'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import type { RoutineWithChildren } from '@/lib/routines';
import RoutineCard from '@/components/routines/RoutineCard';

export default function RoutinesPage() {
  const [routines, setRoutines] = useState<RoutineWithChildren[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchRoutines() {
      const { data, error } = await supabase
        .from('routines')
        .select('*, sections(*), cues(*)')
        .order('created_at', { ascending: false });

      if (error) {
        setError(error.message);
      } else {
        setRoutines((data as RoutineWithChildren[] | null) ?? []);
      }
      setLoading(false);
    }
    fetchRoutines();
  }, []);

  if (loading) {
    return <p className="text-gray-400 text-center py-20">Loading routines...</p>;
  }

  if (error) {
    return <p className="text-red-500 text-center py-20">Error: {error}</p>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Routines</h1>
        <Link
          href="/routines/new"
          className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors"
        >
          + New routine
        </Link>
      </div>

      {routines.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-400 mb-4">No routines yet.</p>
          <Link href="/routines/new" className="text-brand-600 font-medium hover:underline">
            Create your first routine
          </Link>
        </div>
      ) : (
        <div className="grid gap-4">
          {routines.map((routine) => (
            <RoutineCard key={routine.id} routine={routine} />
          ))}
        </div>
      )}
    </div>
  );
}
