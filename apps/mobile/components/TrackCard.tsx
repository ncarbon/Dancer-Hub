import { TouchableOpacity, Text, View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import type { AudioTrack } from '@dancer-hub/shared';

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function TrackCard({ track }: { track: AudioTrack }) {
  const router = useRouter();

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push(`/tracks/${track.id}`)}
      activeOpacity={0.7}
    >
      <View style={styles.info}>
        <Text style={styles.title}>{track.title}</Text>
        <Text style={styles.meta}>
          {new Date(track.created_at).toLocaleDateString()}
          {track.duration_seconds ? ` · ${formatDuration(track.duration_seconds)}` : ''}
        </Text>
      </View>
      <View style={styles.icon}>
        <Text style={styles.iconText}>♪</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  info: { flex: 1 },
  title: { fontSize: 16, fontWeight: '600', color: '#111827' },
  meta: { fontSize: 13, color: '#9ca3af', marginTop: 3 },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f3e8ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  iconText: { fontSize: 18, color: '#9333ea' },
});
