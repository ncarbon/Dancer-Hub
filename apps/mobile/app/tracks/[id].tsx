import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { supabase } from '@/lib/supabase';
import type { AudioTrack } from '@dancer-hub/shared';
import AudioPlayer from '@/components/AudioPlayer';

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function TrackScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [track, setTrack] = useState<AudioTrack | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('audio_tracks')
        .select('*')
        .eq('id', id)
        .single();

      if (data) {
        setTrack(data);
        const { data: urlData } = supabase.storage
          .from('audio-tracks')
          .getPublicUrl(data.file_path);
        setAudioUrl(urlData.publicUrl);
      }
      setLoading(false);
    }
    load();
  }, [id]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#9333ea" />
      </View>
    );
  }

  if (!track) {
    return (
      <View style={styles.centered}>
        <Text style={styles.error}>Track not found</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{track.title}</Text>
      <Text style={styles.meta}>
        {new Date(track.created_at).toLocaleDateString()}
        {track.duration_seconds ? ` · ${formatDuration(track.duration_seconds)}` : ''}
      </Text>

      {audioUrl && <AudioPlayer uri={audioUrl} />}

      <View style={styles.placeholder}>
        <Text style={styles.placeholderText}>Speed control — coming soon</Text>
      </View>
      <View style={styles.placeholder}>
        <Text style={styles.placeholderText}>Play delay — coming soon</Text>
      </View>
      <View style={styles.placeholder}>
        <Text style={styles.placeholderText}>Section marking — coming soon</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  content: { padding: 20, paddingBottom: 60 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 22, fontWeight: '700', color: '#111827', marginBottom: 6 },
  meta: { fontSize: 13, color: '#9ca3af', marginBottom: 24 },
  error: { color: '#ef4444' },
  placeholder: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderStyle: 'dashed',
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
    marginTop: 12,
  },
  placeholderText: { color: '#d1d5db', fontSize: 13 },
});
