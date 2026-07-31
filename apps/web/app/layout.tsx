import type { Metadata } from 'next';
import './globals.css';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Dancer Hub',
  description: 'Choreography practice tool for dancers',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50 text-gray-900">
        <header className="bg-white border-b border-gray-200 px-6 py-4">
          <nav className="max-w-4xl mx-auto flex items-center justify-between gap-4">
            <Link href="/" className="text-xl font-bold text-brand-600 shrink-0">
              Dancer Hub
            </Link>
            <div className="flex items-center gap-2 sm:gap-3">
              <Link
                href="/routines"
                className="text-sm font-medium text-gray-600 hover:text-gray-900 px-2 py-2"
              >
                Routines
              </Link>
              <Link
                href="/lookup"
                className="text-sm font-medium text-gray-600 hover:text-gray-900 px-2 py-2"
              >
                Song Lookup
              </Link>
              <Link
                href="/routines/new"
                className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors"
              >
                + New Routine
              </Link>
            </div>
          </nav>
        </header>
        <main className="max-w-4xl mx-auto px-6 py-8">{children}</main>
        <footer className="max-w-4xl mx-auto px-6 py-8 text-center text-xs text-gray-300">
          Tempo &amp; key data powered by{' '}
          <a
            href="https://getsongbpm.com"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-gray-400"
          >
            GetSongBPM
          </a>
        </footer>
      </body>
    </html>
  );
}
