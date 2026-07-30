import decodeAudio from 'audio-decode';
import MusicTempoImport from 'music-tempo';
import type { TempoMatch } from '@dancer-hub/shared';

const MusicTempo =
  (MusicTempoImport as unknown as { default?: typeof MusicTempoImport }).default ??
  MusicTempoImport;

interface DeezerSearchResponse {
  data?: Array<{
    id: number;
    title: string;
    preview: string;
    artist: { name: string };
    link: string;
  }>;
}

function mixToMono(channelData: Float32Array[]): Float32Array {
  if (channelData.length === 1) return channelData[0];
  const length = channelData[0].length;
  const mono = new Float32Array(length);
  for (let i = 0; i < length; i++) {
    let sum = 0;
    for (const channel of channelData) sum += channel[i];
    mono[i] = sum / channelData.length;
  }
  return mono;
}

async function detectBpmFromMp3(arrayBuffer: ArrayBuffer): Promise<number | null> {
  const decoded = await decodeAudio(arrayBuffer);
  const channelData = (decoded as { channelData?: Float32Array[] }).channelData;
  if (!channelData?.length) return null;

  const mt = new MusicTempo(mixToMono(channelData));
  const tempo = Number(mt.tempo);
  if (!Number.isFinite(tempo) || tempo < 40 || tempo > 240) return null;
  return Math.round(tempo);
}

export async function searchDeezerPreview(
  title: string,
  artist: string,
): Promise<{ title: string; artist: string; previewUrl: string; songUrl: string } | null> {
  const primaryArtist = artist.split(',')[0]?.trim() || artist;
  const q = `${title.trim()} ${primaryArtist}`.trim();
  const url = new URL('https://api.deezer.com/search');
  url.searchParams.set('q', q);
  url.searchParams.set('limit', '5');

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Deezer search failed: ${res.status}`);
  }

  const data = (await res.json()) as DeezerSearchResponse;
  const track = (data.data ?? []).find((item) => item.preview);
  if (!track) return null;

  return {
    title: track.title,
    artist: track.artist.name,
    previewUrl: track.preview,
    songUrl: track.link,
  };
}

/** Estimate BPM by analyzing a Deezer 30s preview when catalog APIs miss. */
export async function detectBpmFromPreview(
  title: string,
  artist: string,
): Promise<TempoMatch[]> {
  const track = await searchDeezerPreview(title, artist);
  if (!track) return [];

  const audioRes = await fetch(track.previewUrl);
  if (!audioRes.ok) {
    throw new Error(`Preview download failed: ${audioRes.status}`);
  }

  const tempoBpm = await detectBpmFromMp3(await audioRes.arrayBuffer());
  if (tempoBpm == null) return [];

  const tempos = [tempoBpm];
  if (tempoBpm >= 60 && tempoBpm <= 110) tempos.push(tempoBpm * 2);
  else if (tempoBpm >= 140 && tempoBpm <= 220) tempos.push(Math.round(tempoBpm / 2));

  return [...new Set(tempos)].map((bpm) => ({
    title: track.title,
    artist: track.artist,
    tempoBpm: bpm,
    musicalKey: null,
    songUrl: track.songUrl,
    source: 'preview' as const,
  }));
}
