'use client';

export default function AudioPlayer({ src }: { src: string }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6">
      <audio controls src={src} className="w-full">
        Your browser does not support the audio element.
      </audio>
    </div>
  );
}
