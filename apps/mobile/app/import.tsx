import { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  Modal,
} from "react-native";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import {
  createAudioPlayer,
  useAudioRecorder,
  useAudioRecorderState,
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
} from "expo-audio";
import { useRouter, Href } from "expo-router";
import { useTheme } from "@/lib/theme";
import { fmtTime } from "@/lib/rehearseStore";

const STYLES = [
  "Salsa",
  "Hustle",
  "Kizomba",
  "Samba",
  "Reggaeton",
  "Bachata",
  "Ballet",
  "Contemporary",
  "Hip Hop",
  "Jazz",
  "Ballroom",
];

async function probeMediaDuration(uri: string): Promise<number> {
  const player = createAudioPlayer({ uri });
  try {
    for (let i = 0; i < 100; i++) {
      if (player.isLoaded && player.duration > 0) return player.duration;
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    return player.duration;
  } finally {
    player.remove();
  }
}

export default function ImportScreen() {
  const { palette } = useTheme();
  const router = useRouter();
  const [name, setName] = useState("");
  const [selectedStyle, setSelectedStyle] = useState<string | null>(null);
  const [videoAttached, setVideoAttached] = useState(false);
  const [videoUri, setVideoUri] = useState<string | null>(null);
  const [videoFilename, setVideoFilename] = useState("");
  const [videoDuration, setVideoDuration] = useState("");
  const [videoDurationSec, setVideoDurationSec] = useState(0);
  const [videoLoading, setVideoLoading] = useState(false);
  const [audioAttached, setAudioAttached] = useState(false);
  const [audioUri, setAudioUri] = useState<string | null>(null);
  const [audioFilename, setAudioFilename] = useState("");
  const [audioDuration, setAudioDuration] = useState("");
  const [audioDurationSec, setAudioDurationSec] = useState(0);
  const [audioLoading, setAudioLoading] = useState(false);
  const [recordingVisible, setRecordingVisible] = useState(false);

  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(audioRecorder);

  useEffect(() => {
    if (!recordingVisible) return;
    (async () => {
      const { granted } = await requestRecordingPermissionsAsync();
      if (!granted) {
        Alert.alert(
          "Microphone access needed",
          "Enable microphone access to record audio.",
        );
        setRecordingVisible(false);
        return;
      }
      await setAudioModeAsync({
        playsInSilentMode: true,
        allowsRecording: true,
      });
    })();
  }, [recordingVisible]);

  async function attachVideo(uri: string, filename: string) {
    setVideoLoading(true);
    try {
      const duration = await probeMediaDuration(uri);
      setVideoUri(uri);
      setVideoFilename(filename);
      setVideoDuration(fmtTime(duration));
      setVideoDurationSec(duration);
      setVideoAttached(true);
    } catch {
      Alert.alert("Could not load video", "Try a different file.");
    } finally {
      setVideoLoading(false);
    }
  }

  async function pickVideoFromGallery() {
    try {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      console.log("[gallery] permission status:", status);
      if (status !== "granted") {
        Alert.alert(
          "Permission needed",
          "Allow access to your photo library to pick a video.",
        );
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["videos"],
        allowsEditing: false,
        quality: 1,
      });
      console.log("[gallery] result canceled:", result.canceled);
      if (result.canceled || !result.assets[0]) return;
      const asset = result.assets[0];
      const filename = asset.fileName ?? `video_${Date.now()}.mp4`;
      await attachVideo(asset.uri, filename);
    } catch (e: any) {
      console.error("[gallery] error:", e);
      const isICloud =
        typeof e?.message === "string" && e.message.includes("3164");
      if (isICloud) {
        Alert.alert(
          "Video not downloaded",
          "This video is stored in iCloud and hasn't been downloaded to your device. Open it in the Photos app to download it first, or use \"Choose file\" to pick it from the Files app instead.",
          [
            { text: "Use file picker", onPress: pickVideoFile },
            { text: "OK", style: "cancel" },
          ],
        );
      } else {
        Alert.alert("Could not load video", "Try a different file.");
      }
    }
  }

  async function pickVideoFile() {
    const result = await DocumentPicker.getDocumentAsync({
      type: "video/*",
      copyToCacheDirectory: true,
    });
    if (result.canceled || !result.assets[0]) return;
    const file = result.assets[0];
    await attachVideo(file.uri, file.name);
  }

  function promptVideoSource() {
    if (videoLoading) return;
    Alert.alert("Add video", undefined, [
      { text: "Choose from gallery", onPress: pickVideoFromGallery },
      { text: "Choose file", onPress: pickVideoFile },
      { text: "Cancel", style: "cancel" },
    ]);
  }

  async function attachAudio(
    uri: string,
    filename: string,
    durationSec?: number,
  ) {
    setAudioLoading(true);
    try {
      const duration = durationSec ?? (await probeMediaDuration(uri));
      setAudioUri(uri);
      setAudioFilename(filename);
      setAudioDuration(fmtTime(duration));
      setAudioDurationSec(duration);
      setAudioAttached(true);
    } catch {
      Alert.alert("Could not load audio", "Try a different file.");
    } finally {
      setAudioLoading(false);
    }
  }

  async function pickAudioFile() {
    const result = await DocumentPicker.getDocumentAsync({
      type: "audio/*",
      copyToCacheDirectory: true,
    });
    if (result.canceled || !result.assets[0]) return;
    const file = result.assets[0];
    await attachAudio(file.uri, file.name);
  }

  function promptAudioSource() {
    if (audioLoading) return;
    Alert.alert("Add audio", undefined, [
      { text: "Choose file", onPress: pickAudioFile },
      { text: "Record", onPress: () => setRecordingVisible(true) },
      { text: "Cancel", style: "cancel" },
    ]);
  }

  async function startRecording() {
    try {
      await audioRecorder.prepareToRecordAsync();
      audioRecorder.record();
    } catch {
      Alert.alert("Recording failed", "Could not start the microphone.");
    }
  }

  async function finishRecording() {
    try {
      await audioRecorder.stop();
      const uri = audioRecorder.uri;
      if (!uri) {
        Alert.alert("Recording failed", "No audio was captured.");
        return;
      }
      const durationSec =
        audioRecorder.getStatus().durationMillis / 1000 ||
        audioRecorder.currentTime;
      const filename = `recording_${Date.now()}.m4a`;
      setRecordingVisible(false);
      await attachAudio(uri, filename, durationSec);
    } catch {
      Alert.alert("Recording failed", "Could not save the recording.");
    }
  }

  const canContinue = name.trim().length > 0;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: palette.paper }]}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.headerRow}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backBtn}
          >
            <Text style={[styles.backChev, { color: palette.ink }]}>‹</Text>
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: palette.ink }]}>
            New routine
          </Text>
        </View>

        {/* Name field */}
        <View style={styles.fieldGroup}>
          <Text style={[styles.fieldLabel, { color: palette.accent }]}>
            NAME
          </Text>
          <TextInput
            style={[
              styles.nameInput,
              {
                color: palette.ink,
                borderBottomColor: palette.ink,
                fontFamily: "Newsreader_400Regular",
              },
            ]}
            value={name}
            onChangeText={setName}
            placeholder="Routine name…"
            placeholderTextColor="#b8b1a4"
          />
        </View>

        {/* Video field */}
        <View style={styles.fieldGroup}>
          <Text style={[styles.fieldLabel, { color: palette.accent }]}>
            VIDEO
          </Text>
          {videoAttached ? (
            <View
              style={[styles.videoAttached, { backgroundColor: "#e2dccf" }]}
            >
              <HatchView />
              <View style={styles.videoPlayAffordance}>
                <View
                  style={[
                    styles.videoPlayCircle,
                    { backgroundColor: "rgba(0,0,0,0.35)" },
                  ]}
                >
                  <Text style={styles.videoPlayIcon}>▶</Text>
                </View>
              </View>
              <View style={styles.videoMeta}>
                <Text style={[styles.videoFilename, { color: palette.ink }]}>
                  {videoFilename} · {videoDuration}
                </Text>
                <View
                  style={[styles.attachedBadge, { borderColor: "#5c7a5c" }]}
                >
                  <Text style={[styles.attachedText, { color: "#5c7a5c" }]}>
                    ✓ Attached
                  </Text>
                </View>
              </View>
            </View>
          ) : (
            <TouchableOpacity
              style={[styles.mediaDrop, { borderColor: palette.accent }]}
              activeOpacity={0.7}
              onPress={promptVideoSource}
              disabled={videoLoading}
            >
              {videoLoading ? (
                <ActivityIndicator color={palette.accent} />
              ) : (
                <>
                  <Text
                    style={[styles.mediaDropPlus, { color: palette.accent }]}
                  >
                    ＋
                  </Text>
                  <Text style={[styles.mediaDropLabel, { color: "#8f887d" }]}>
                    Gallery or file
                  </Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>

        {/* Audio field */}
        <View style={styles.fieldGroup}>
          <Text style={[styles.fieldLabel, { color: palette.accent }]}>
            AUDIO
          </Text>
          {audioAttached ? (
            <View
              style={[styles.audioAttached, { backgroundColor: "#e2dccf" }]}
            >
              <HatchView />
              <View style={styles.audioPlayAffordance}>
                <View
                  style={[
                    styles.audioPlayCircle,
                    { backgroundColor: "rgba(0,0,0,0.35)" },
                  ]}
                >
                  <Text style={styles.audioPlayIcon}>▶</Text>
                </View>
              </View>
              <View style={styles.audioMeta}>
                <Text style={[styles.audioFilename, { color: palette.ink }]}>
                  {audioFilename} · {audioDuration}
                </Text>
                <View
                  style={[styles.attachedBadge, { borderColor: "#5c7a5c" }]}
                >
                  <Text style={[styles.attachedText, { color: "#5c7a5c" }]}>
                    ✓ Attached
                  </Text>
                </View>
              </View>
            </View>
          ) : (
            <TouchableOpacity
              style={[styles.mediaDrop, { borderColor: palette.accent }]}
              activeOpacity={0.7}
              onPress={promptAudioSource}
              disabled={audioLoading}
            >
              {audioLoading ? (
                <ActivityIndicator color={palette.accent} />
              ) : (
                <>
                  <Text
                    style={[styles.mediaDropPlus, { color: palette.accent }]}
                  >
                    ＋
                  </Text>
                  <Text style={[styles.mediaDropLabel, { color: "#8f887d" }]}>
                    Drop audio or record
                  </Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>

        {/* Style chips */}
        <View style={styles.fieldGroup}>
          <Text style={[styles.fieldLabel, { color: palette.accent }]}>
            STYLE
          </Text>
          <View style={styles.chipRow}>
            {STYLES.map((s) => {
              const active = selectedStyle === s;
              return (
                <TouchableOpacity
                  key={s}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: active ? palette.accent : "transparent",
                      borderColor: active
                        ? palette.accent
                        : "rgba(43,39,34,0.25)",
                    },
                  ]}
                  onPress={() => setSelectedStyle(active ? null : s)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.chipText,
                      { color: active ? palette.paper : palette.ink },
                    ]}
                  >
                    {s}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Continue button */}
        <TouchableOpacity
          style={[
            styles.continueBtn,
            {
              backgroundColor: canContinue
                ? palette.ink
                : "rgba(43,39,34,0.20)",
            },
          ]}
          onPress={() => {
            if (!canContinue) return;
            router.push({
              pathname: "/timeline",
              params: {
                isNew: "true",
                name: name.trim(),
                style: selectedStyle ?? "",
                audioUri: audioUri ?? "",
                audioFilename,
                audioDurationSec: String(audioDurationSec),
                videoUri: videoUri ?? "",
                videoFilename,
                videoDurationSec: String(videoDurationSec),
              },
            } as any);
          }}
          activeOpacity={0.85}
          disabled={!canContinue}
        >
          <Text style={[styles.continueBtnText, { color: palette.paper }]}>
            Continue to editor
          </Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal
        visible={recordingVisible}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (recorderState.isRecording) audioRecorder.stop();
          setRecordingVisible(false);
        }}
      >
        <View style={styles.recordingBackdrop}>
          <View
            style={[styles.recordingSheet, { backgroundColor: palette.paper }]}
          >
            <Text style={[styles.recordingTitle, { color: palette.ink }]}>
              Record audio
            </Text>
            <Text style={[styles.recordingTimer, { color: palette.accent }]}>
              {fmtTime(recorderState.durationMillis / 1000)}
            </Text>
            <TouchableOpacity
              style={[
                styles.recordingBtn,
                {
                  backgroundColor: recorderState.isRecording
                    ? "#8b3a3a"
                    : palette.ink,
                },
              ]}
              onPress={
                recorderState.isRecording ? finishRecording : startRecording
              }
              activeOpacity={0.85}
            >
              <Text style={[styles.recordingBtnText, { color: palette.paper }]}>
                {recorderState.isRecording
                  ? "Stop & attach"
                  : "Start recording"}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                if (recorderState.isRecording) audioRecorder.stop();
                setRecordingVisible(false);
              }}
              activeOpacity={0.7}
            >
              <Text style={[styles.recordingCancel, { color: "#8f887d" }]}>
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function HatchView() {
  return (
    <View style={StyleSheet.absoluteFill}>
      {Array.from({ length: 15 }).map((_, i) => (
        <View
          key={i}
          style={{
            position: "absolute",
            left: -40,
            right: -40,
            height: 8,
            top: i * 18 - 20,
            backgroundColor: "#ddd7ca",
            transform: [{ rotate: "45deg" }],
          }}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { paddingHorizontal: 22, paddingBottom: 48, paddingTop: 12 },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 28,
  },
  backBtn: { marginRight: 10, padding: 4 },
  backChev: { fontSize: 28 },
  headerTitle: {
    fontFamily: "Newsreader_400Regular",
    fontSize: 23,
  },
  fieldGroup: { marginBottom: 28 },
  fieldLabel: {
    fontFamily: "WorkSans_500Medium",
    fontSize: 11,
    letterSpacing: 1.4,
    textTransform: "uppercase",
    marginBottom: 10,
  },
  nameInput: {
    fontFamily: "Newsreader_400Regular",
    fontSize: 18,
    borderBottomWidth: 1.5,
    paddingBottom: 8,
    paddingTop: 0,
  },
  videoAttached: {
    height: 120,
    borderRadius: 12,
    overflow: "hidden",
    position: "relative",
  },
  videoPlayAffordance: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
  },
  videoPlayCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  videoPlayIcon: { color: "#fff", fontSize: 18 },
  videoMeta: {
    position: "absolute",
    bottom: 10,
    left: 12,
    right: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  videoFilename: {
    fontFamily: "WorkSans_400Regular",
    fontSize: 11,
  },
  attachedBadge: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  attachedText: {
    fontFamily: "WorkSans_500Medium",
    fontSize: 10,
  },
  mediaDrop: {
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderRadius: 12,
    height: 80,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  mediaDropPlus: { fontSize: 22 },
  mediaDropLabel: {
    fontFamily: "WorkSans_400Regular",
    fontSize: 13,
  },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    borderWidth: 1.5,
    borderRadius: 24,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  chipText: {
    fontFamily: "WorkSans_400Regular",
    fontSize: 13,
  },
  continueBtn: {
    borderRadius: 28,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 8,
  },
  continueBtnText: {
    fontFamily: "WorkSans_500Medium",
    fontSize: 15,
  },
  audioAttached: {
    height: 120,
    borderRadius: 12,
    overflow: "hidden",
    position: "relative",
  },
  audioPlayAffordance: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
  },
  audioPlayCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  audioPlayIcon: { color: "#fff", fontSize: 18 },
  audioMeta: {
    position: "absolute",
    bottom: 10,
    left: 12,
    right: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  audioFilename: {
    fontFamily: "WorkSans_400Regular",
    fontSize: 11,
  },
  recordingBackdrop: {
    flex: 1,
    backgroundColor: "rgba(43,39,34,0.45)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
  },
  recordingSheet: {
    width: "100%",
    borderRadius: 16,
    paddingHorizontal: 24,
    paddingVertical: 28,
    alignItems: "center",
    gap: 16,
  },
  recordingTitle: {
    fontFamily: "Newsreader_400Regular",
    fontSize: 20,
  },
  recordingTimer: {
    fontFamily: "WorkSans_500Medium",
    fontSize: 28,
    letterSpacing: 1,
  },
  recordingBtn: {
    borderRadius: 28,
    paddingVertical: 14,
    paddingHorizontal: 28,
    width: "100%",
    alignItems: "center",
  },
  recordingBtnText: {
    fontFamily: "WorkSans_500Medium",
    fontSize: 15,
  },
  recordingCancel: {
    fontFamily: "WorkSans_400Regular",
    fontSize: 14,
    paddingVertical: 4,
  },
});
