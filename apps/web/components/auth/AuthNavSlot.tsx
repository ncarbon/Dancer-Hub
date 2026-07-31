'use client';

import Link from 'next/link';
import { useSession } from '@/lib/useSession';
import { supabase } from '@/lib/supabase';

export default function AuthNavSlot() {
  const { user, loading } = useSession();

  if (loading) return null;

  if (!user) {
    return (
      <Link
        href="/login"
        className="text-sm font-medium text-gray-600 hover:text-gray-900 px-2 py-2"
      >
        Sign in
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="hidden sm:inline text-sm text-gray-500 truncate max-w-[160px]">
        {user.email}
      </span>
      <button
        type="button"
        onClick={() => supabase.auth.signOut()}
        className="text-sm font-medium text-gray-600 hover:text-gray-900 px-2 py-2"
      >
        Sign out
      </button>
    </div>
  );
}
