'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function UploadForm() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file || !title.trim()) return;

    setUploading(true);
    setError(null);

    const ext = file.name.split('.').pop();
    const filePath = `${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('audio-tracks')
      .upload(filePath, file, { contentType: file.type });

    if (uploadError) {
      setError(uploadError.message);
      setUploading(false);
      return;
    }

    const { data: track, error: dbError } = await supabase
      .from('audio_tracks')
      .insert({ title: title.trim(), file_path: filePath, file_name: file.name })
      .select()
      .single();

    if (dbError || !track) {
      setError(dbError?.message ?? 'Failed to save track');
      setUploading(false);
      return;
    }

    router.push(`/tracks/${track.id}`);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
          Track title
        </label>
        <input
          id="title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Warm-up routine"
          required
          className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Audio file</label>
        <div
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center cursor-pointer hover:border-brand-500 transition-colors"
        >
          {file ? (
            <p className="text-sm text-gray-700 font-medium">{file.name}</p>
          ) : (
            <>
              <p className="text-gray-400 text-sm">Click to select an audio file</p>
              <p className="text-gray-300 text-xs mt-1">MP3, M4A, WAV, OGG</p>
            </>
          )}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*"
          className="hidden"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
      </div>

      {error && <p className="text-red-500 text-sm">{error}</p>}

      <button
        type="submit"
        disabled={uploading || !file || !title.trim()}
        className="w-full bg-brand-600 text-white py-3 rounded-lg font-medium hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {uploading ? 'Uploading...' : 'Upload Track'}
      </button>
    </form>
  );
}
