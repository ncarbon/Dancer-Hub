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
          <nav className="max-w-4xl mx-auto flex items-center justify-between">
            <Link href="/tracks" className="text-xl font-bold text-brand-600">
              Dancer Hub
            </Link>
            <Link
              href="/tracks/upload"
              className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors"
            >
              Upload Track
            </Link>
          </nav>
        </header>
        <main className="max-w-4xl mx-auto px-6 py-8">{children}</main>
      </body>
    </html>
  );
}
