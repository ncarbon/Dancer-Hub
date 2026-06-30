import { useEffect } from 'react';
import { View, TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useAudioPlayer, useAudioPlayerStatus, setAudioModeAsync } from 'expo-audio';

export default function AudioPlayer({ uri }: { uri: string }) {
  const player = useAudioPlayer({ uri });
  const status = useAudioPlayerStatus(player);

  useEffect(() => {
    setAudioModeAsync({ playsInSilentModeIOS: true });
  }, []);

  function togglePlay() {
    if (status.playing) {
      player.pause();
    } else {
      player.play();
    }
  }

  return (
    <View style={styles.container}>
      {!status.isLoaded ? (
        <ActivityIndicator color="#9333ea" />
      ) : (
        <TouchableOpacity style={styles.playButton} onPress={togglePlay} activeOpacity={0.8}>
          <Text style={styles.playIcon}>{status.playing ? '⏸' : '▶'}</Text>
          <Text style={styles.playLabel}>{status.playing ? 'Pause' : 'Play'}</Text>
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
