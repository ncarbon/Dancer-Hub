'use client';

import { useState } from 'react';

type Props = {
  name: string;
  countLabel: string;
  demoUrl?: string;
  demoPosterUrl?: string;
  demoCredit?: string;
};

export default function StyleDemo({
  name,
  countLabel,
  demoUrl,
  demoPosterUrl,
  demoCredit,
}: Props) {
  const [failed, setFailed] = useState(false);
  const showVideo = Boolean(demoUrl) && !failed;
  const isGif = demoUrl?.toLowerCase().endsWith('.gif');

  return (
    <div className="mt-3">
      <div className="relative overflow-hidden rounded-lg bg-gray-100 aspect-video">
        {showVideo && isGif ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={demoUrl}
            alt={`${name} demo`}
            className="h-full w-full object-cover"
            onError={() => setFailed(true)}
          />
        ) : showVideo ? (
          <video
            key={demoUrl}
            src={demoUrl}
            poster={demoPosterUrl}
            className="h-full w-full object-cover"
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            onError={() => setFailed(true)}
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 px-3 text-center">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Demo soon</p>
            <p className="text-lg font-semibold text-gray-600">{countLabel}</p>
          </div>
        )}
      </div>
      {showVideo && demoCredit && (
        <p className="mt-1 text-[11px] text-gray-400">{demoCredit}</p>
      )}
    </div>
  );
}
