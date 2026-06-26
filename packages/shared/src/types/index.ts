export interface AudioTrack {
  id: string;
  title: string;
  file_path: string;
  file_name: string;
  duration_seconds: number | null;
  created_at: string;
}

export interface UploadAudioPayload {
  title: string;
  file: File | Blob;
  fileName: string;
}
