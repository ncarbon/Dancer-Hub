import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';

export default function UploadScreen() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [file, setFile] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [uploading, setUploading] = useState(false);

  async function pickFile() {
    const result = await DocumentPicker.getDocumentAsync({
      type: 'audio/*',
      copyToCacheDirectory: true,
    });
    if (!result.canceled && result.assets[0]) {
      setFile(result.assets[0]);
    }
  }

  async function handleUpload() {
    if (!file || !title.trim()) return;
    setUploading(true);

    const ext = file.name.split('.').pop() ?? 'mp3';
    const filePath = `${Date.now()}.${ext}`;

    // Fetch the file as ArrayBuffer — most reliable approach in React Native
    const response = await fetch(file.uri);
    const arrayBuffer = await response.arrayBuffer();

    const { error: uploadError } = await supabase.storage
      .from('audio-tracks')
      .upload(filePath, arrayBuffer, { contentType: file.mimeType ?? 'audio/mpeg' });

    if (uploadError) {
      Alert.alert('Upload failed', uploadError.message);
      setUploading(false);
      return;
    }

    const { data: track, error: dbError } = await supabase
      .from('audio_tracks')
      .insert({ title: title.trim(), file_path: filePath, file_name: file.name })
      .select()
      .single();

    if (dbError || !track) {
      Alert.alert('Error', dbError?.message ?? 'Failed to save track');
      setUploading(false);
      return;
    }

    router.replace(`/tracks/${track.id}`);
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.label}>Track title</Text>
      <TextInput
        style={styles.input}
        value={title}
        onChangeText={setTitle}
        placeholder="e.g. Warm-up routine"
        placeholderTextColor="#9ca3af"
      />

      <Text style={[styles.label, { marginTop: 20 }]}>Audio file</Text>
      <TouchableOpacity style={styles.filePicker} onPress={pickFile} activeOpacity={0.7}>
        <Text style={file ? styles.fileSelected : styles.filePlaceholder}>
          {file ? file.name : 'Tap to select audio file'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.button,
          (!file || !title.trim() || uploading) && styles.buttonDisabled,
        ]}
        onPress={handleUpload}
        disabled={!file || !title.trim() || uploading}
        activeOpacity={0.8}
      >
        <Text style={styles.buttonText}>{uploading ? 'Uploading...' : 'Upload Track'}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  content: { padding: 20 },
  label: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: '#111827',
  },
  filePicker: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
  },
  filePlaceholder: { color: '#9ca3af', fontSize: 14 },
  fileSelected: { color: '#111827', fontSize: 14, fontWeight: '500' },
  button: {
    backgroundColor: '#9333ea',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 32,
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
