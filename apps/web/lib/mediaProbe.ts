/** Resolves once the browser has read the file's metadata (duration, etc). */
export function probeMediaDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const isVideo = file.type.startsWith('video/');
    const el = document.createElement(isVideo ? 'video' : 'audio');
    const url = URL.createObjectURL(file);
    el.preload = 'metadata';
    el.src = url;

    function cleanup() {
      URL.revokeObjectURL(url);
      el.src = '';
    }

    el.onloadedmetadata = () => {
      const duration = el.duration;
      cleanup();
      resolve(Number.isFinite(duration) ? duration : 0);
    };
    el.onerror = () => {
      cleanup();
      reject(new Error('Could not read media duration'));
    };
  });
}
