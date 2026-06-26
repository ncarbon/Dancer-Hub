import { useEffect, useRef, useState } from 'react';
import { View, TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Audio } from 'expo-av';

export default function AudioPlayer({ uri }: { uri: string }) {
  const soundRef = useRef<Audio.Sound | null>(null);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
      const { sound } = await Audio.Sound.createAsync({ uri }, {}, (status) => {
        if (!cancelled && status.isLoaded) setPlaying(status.isPlaying);
      });
      if (cancelled) {
        sound.unloadAsync();
        return;
      }
      soundRef.current = sound;
      setLoading(false);
    }

    load();

    return () => {
      cancelled = true;
      soundRef.current?.unloadAsync();
      soundRef.current = null;
    };
  }, [uri]);

  async function togglePlay() {
    const sound = soundRef.current;
    if (!sound) return;
    if (playing) {
      await sound.pauseAsync();
    } else {
      await sound.playAsync();
    }
  }

  return (
    <View style={styles.container}>
      {loading ? (
        <ActivityIndicator color="#9333ea" />
      ) : (
        <TouchableOpacity style={styles.playButton} onPress={togglePlay} activeOpacity={0.8}>
          <Text style={styles.playIcon}>{playing ? '⏸' : '▶'}</Text>
          <Text style={styles.playLabel}>{playing ? 'Pause' : 'Play'}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  playButton: {
    backgroundColor: '#9333ea',
    borderRadius: 999,
    paddingHorizontal: 32,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  playIcon: { color: '#fff', fontSize: 18 },
  playLabel: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
