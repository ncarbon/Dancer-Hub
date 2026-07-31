'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

function CallbackHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') ?? '/routines';
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    // The magic-link tokens arrive as a URL hash fragment; the supabase-js
    // client auto-parses that on load (detectSessionInUrl). Awaiting
    // getSession() here waits for that parsing to finish.
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        router.replace(redirect);
      } else {
        setFailed(true);
      }
    });
  }, [router, redirect]);

  if (failed) {
    return (
      <div className="max-w-sm mx-auto py-16 text-center">
        <h1 className="text-xl font-semibold text-gray-900 mb-2">Link invalid or expired</h1>
        <p className="text-sm text-gray-500 mb-4">
          This sign-in link didn&apos;t work. Request a new one below.
        </p>
        <Link href="/login" className="text-brand-600 font-medium hover:underline">
          Back to sign in
        </Link>
      </div>
    );
  }

  return <p className="text-gray-400 text-center py-16">Signing you in…</p>;
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<p className="text-gray-400 text-center py-16">Signing you in…</p>}>
      <CallbackHandler />
    </Suspense>
  );
}
