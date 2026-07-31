'use client';

import { useEffect, useRef, useState } from 'react';
import { fmtTime } from '@/lib/routineStore';

function pickSupportedMimeType(): string {
  const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'];
  for (const type of candidates) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(type)) return type;
  }
  return '';
}

function extForMime(mime: string): string {
  if (mime.includes('mp4')) return 'm4a';
  return 'webm';
}

export default function AudioRecorderModal({
  open,
  onClose,
  onAttach,
}: {
  open: boolean;
  onClose: () => void;
  onAttach: (file: File, durationSec: number) => void;
}) {
  const [recording, setRecording] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedAtRef = useRef(0);

  useEffect(() => {
    if (!open) {
      cleanup();
      setRecording(false);
      setElapsedMs(0);
      setError(null);
    }
    return cleanup;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function cleanup() {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    recorderRef.current = null;
    chunksRef.current = [];
  }

  async function startRecording() {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mimeType = pickSupportedMimeType();
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.start();
      recorderRef.current = recorder;
      startedAtRef.current = Date.now();
      setElapsedMs(0);
      timerRef.current = setInterval(() => setElapsedMs(Date.now() - startedAtRef.current), 200);
      setRecording(true);
    } catch {
      setError('Could not start the microphone. Check your browser permissions.');
    }
  }

  function stopAndAttach() {
    const recorder = recorderRef.current;
    if (!recorder) return;
    const durationSec = elapsedMs / 1000;
    recorder.onstop = () => {
      const mimeType = recorder.mimeType || 'audio/webm';
      const blob = new Blob(chunksRef.current, { type: mimeType });
      const file = new File([blob], `recording_${Date.now()}.${extForMime(mimeType)}`, { type: mimeType });
      cleanup();
      setRecording(false);
      onAttach(file, durationSec);
    };
    recorder.stop();
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }

  function handleCancel() {
    cleanup();
    setRecording(false);
    onClose();
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/45 px-7">
      <div className="w-full max-w-sm rounded-2xl bg-white p-7 text-center">
        <h2 className="text-lg font-semibold text-gray-900">Record audio</h2>
        <p className="my-4 text-3xl font-semibold tracking-wide text-brand-600">{fmtTime(elapsedMs / 1000)}</p>

        {error && <p className="mb-3 text-sm text-red-500">{error}</p>}

        <button
          type="button"
          onClick={recording ? stopAndAttach : startRecording}
          className={`w-full rounded-full py-3.5 text-sm font-medium text-white ${
            recording ? 'bg-red-700' : 'bg-gray-900'
          }`}
        >
          {recording ? 'Stop & attach' : 'Start recording'}
        </button>
        <button type="button" onClick={handleCancel} className="mt-3 text-sm text-gray-400">
          Cancel
        </button>
      </div>
    </div>
  );
}
