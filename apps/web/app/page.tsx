"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { fetchRoutines, type RoutineWithChildren } from "@/lib/routines";
import RoutineCard from "@/components/routines/RoutineCard";

const RECENT_COUNT = 4;

function StatTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-sm text-gray-500 mt-0.5">{label}</p>
    </div>
  );
}

function SongLookupPromo() {
  return (
    <Link
      href="/lookup"
      className="block rounded-xl border border-gray-200 bg-white p-5 hover:border-brand-500 transition-colors"
    >
      <p className="text-sm font-medium text-brand-600 mb-1">Song Lookup</p>
      <p className="text-lg font-semibold text-gray-900">
        Find a song’s BPM &amp; dance styles
      </p>
      <p className="text-sm text-gray-500 mt-1">
        Search Spotify, check the tempo, and see which styles often fit — like
        hustle, bachata, or salsa.
      </p>
    </Link>
  );
}

export default function Home() {
  const [routines, setRoutines] = useState<RoutineWithChildren[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const { data, error } = await fetchRoutines();
      if (error) {
        setError(error);
      } else {
        setRoutines(data);
      }
      setLoading(false);
    }
    load();
  }, []);

  const recent = routines.slice(0, RECENT_COUNT);

  return (
    <div className="space-y-10">
      <div className="rounded-2xl border border-gray-200 bg-white p-8">
        <h1 className="text-3xl font-bold text-gray-900">Dancer Hub</h1>
        <p className="mt-2 max-w-lg text-gray-500">
          Rehearse smarter — tag cues and sections, control tempo and delay, and
          practice your routines in sync with music or video.
        </p>
        <Link
          href="/routines/new"
          className="mt-5 inline-block rounded-full bg-brand-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-700 transition-colors"
        >
          + New Routine
        </Link>
      </div>

      {loading ? (
        <p className="text-gray-400 text-center py-12">Loading...</p>
      ) : error ? (
        <p className="text-red-500 text-center py-12">Error: {error}</p>
      ) : (
        <>
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">
                Recent routines
              </h2>
              {routines.length > 0 && (
                <Link
                  href="/routines"
                  className="text-sm font-medium text-brand-600 hover:underline"
                >
                  View all →
                </Link>
              )}
            </div>

            {routines.length === 0 ? (
              <div className="text-center py-12 rounded-xl border border-dashed border-gray-200">
                <p className="text-gray-400 mb-4">No routines yet.</p>
                <Link
                  href="/routines/new"
                  className="text-brand-600 font-medium hover:underline"
                >
                  Create your first routine
                </Link>
              </div>
            ) : (
              <div className="grid gap-4">
                {recent.map((routine) => (
                  <RoutineCard key={routine.id} routine={routine} />
                ))}
              </div>
            )}
          </div>
        </>
      )}

      <SongLookupPromo />
    </div>
  );
}
