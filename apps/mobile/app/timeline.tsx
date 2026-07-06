import { useRef, useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  SafeAreaView, PanResponder, Modal, Pressable, TextInput,
  KeyboardAvoidingView, Platform, Dimensions, Alert,
} from 'react-native';
import { useRouter, Href, useLocalSearchParams } from 'expo-router';
import { useAudioPlayer, useAudioPlayerStatus, setAudioModeAsync } from 'expo-audio';
import { useVideoPlayer } from 'expo-video';
import { useTheme } from '@/lib/theme';
import { useStore, fmtTime, CueType, Count, Section } from '@/lib/rehearseStore';
import { supabase } from '@/lib/supabase';

const CUE_TYPES: CueType[] = ['count', 'formation', 'movement', 'entrance', 'lift', 'note'];
const COUNT_VALS: (Count | '—')[] = ['—', '1-2-3-4', '5-6-7-8', '&-1-&-2', '1-a-2-a'];

const SCREEN_W = Dimensions.get('window').width;
const TRACK_W = SCREEN_W - 44; // left gutter 44

export default function TimelineScreen() {
  const { palette, sectionColor, cueTypeColor } = useTheme();
  const { state, dispatch } = useStore();
  const router = useRouter();
  const params = useLocalSearchParams<{
    isNew?: string;
    routineId?: string;
    name?: string;
    style?: string;
    audioUri?: string;
    audioFilename?: string;
    audioDurationSec?: string;
    videoUri?: string;
    videoFilename?: string;
    videoDurationSec?: string;
  }>();
  const [saving, setSaving] = useState(false);
  const [sectionSheetOpen, setSectionSheetOpen] = useState(false);
  const [sectionName, setSectionName] = useState('');
  const [sectionTime, setSectionTime] = useState(0);
  const [sectionEditTarget, setSectionEditTarget] = useState<Section | null>(null);

  useEffect(() => {
    if (params.isNew !== 'true') return;
    const duration = params.audioDurationSec ? parseFloat(params.audioDurationSec)
      : params.videoDurationSec ? parseFloat(params.videoDurationSec)
      : 0;
    dispatch({ type: 'INIT_ROUTINE', duration });
  }, []);

  // ── Audio playback ─────────────────────────────────────────────────────────
  const player = useAudioPlayer(params.audioUri ? { uri: params.audioUri } : { uri: '' });
  const playerStatus = useAudioPlayerStatus(player);
  const hasAudio = !!params.audioUri;
  const hasVideo = !!params.videoUri;
  const hasMedia = hasAudio || hasVideo;

  // Stable refs so PanResponder closures can reach current values
  const durationRef = useRef(state.duration);
  durationRef.current = state.duration;
  const playerRef = useRef(player);
  playerRef.current = player;
  const audioReadyRef = useRef(false);
  audioReadyRef.current = hasAudio && playerStatus.isLoaded;

  // ── Video playback (for video-only routines) ───────────────────────────────
  const videoPlayer = useVideoPlayer(null, p => { p.loop = false; });
  const videoPlayerRef = useRef(videoPlayer);
  videoPlayerRef.current = videoPlayer;

  useEffect(() => {
    if (!params.videoUri) return;
    videoPlayer.replace({ uri: params.videoUri });
  }, [params.videoUri]);

  useEffect(() => {
    if (!hasVideo) return;
    if (state.playing) { videoPlayer.play(); } else { videoPlayer.pause(); }
  }, [state.playing]);

  useEffect(() => {
    if (!hasVideo) return;
    videoPlayer.playbackRate = state.speed;
  }, [state.speed, hasVideo]);

  // Drive state.t from video when there's no audio
  useEffect(() => {
    if (!state.playing || !hasVideo || hasAudio) return;
    const id = setInterval(() => {
      dispatch({ type: 'SET_T', t: videoPlayerRef.current.currentTime });
    }, 100);
    return () => clearInterval(id);
  }, [state.playing, hasVideo, hasAudio]);
  // ──────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (hasAudio) setAudioModeAsync({ playsInSilentMode: true });
  }, [hasAudio]);


  // Play/pause: store → audio
  useEffect(() => {
    if (!audioReadyRef.current) return;
    if (state.playing) {
      player.play();
    } else {
      player.pause();
    }
  }, [state.playing]);

  // Speed + pitch lock: store → audio
  useEffect(() => {
    if (!audioReadyRef.current) return;
    player.setPlaybackRate(state.speed, state.pitchLock ? 'medium' : 'low');
  }, [state.speed, state.pitchLock, playerStatus.isLoaded]);

  // Audio position → store time: poll every 100ms to avoid 60fps re-renders
  useEffect(() => {
    if (!state.playing || !hasAudio) return;
    const id = setInterval(() => {
      if (!audioReadyRef.current) return;
      dispatch({ type: 'SET_T', t: playerRef.current.currentTime });
    }, 100);
    return () => clearInterval(id);
  }, [state.playing, hasAudio]);

  // Stop at end
  useEffect(() => {
    if (playerStatus.didJustFinish) {
      dispatch({ type: 'TOGGLE_PLAY' });
      dispatch({ type: 'SET_T', t: 0 });
    }
  }, [playerStatus.didJustFinish]);
  // ──────────────────────────────────────────────────────────────────────────

  async function handleSave() {
    setSaving(true);
    try {
      if (params.routineId) {
        // ── Update existing routine ───────────────────────────────────────
        const { error: updateErr } = await supabase
          .from('routines')
          .update({
            name: params.name ?? 'Untitled',
            style: params.style || null,
            duration_sec: state.duration,
            speed: state.speed,
            pitch_lock: state.pitchLock,
            delay_ms: state.delayMs,
          })
          .eq('id', params.routineId);
        if (updateErr) throw updateErr;

        // Replace sections and cues wholesale
        await supabase.from('sections').delete().eq('routine_id', params.routineId);
        await supabase.from('cues').delete().eq('routine_id', params.routineId);

        if (state.sections.length > 0) {
          await supabase.from('sections').insert(
            state.sections.map(s => ({ routine_id: params.routineId, time_sec: s.time, name: s.name }))
          );
        }
        if (state.cues.length > 0) {
          await supabase.from('cues').insert(
            state.cues.map(c => ({ routine_id: params.routineId, time_sec: c.time, type: c.type, count: c.count, note: c.note }))
          );
        }
      } else {
        // ── Create new routine ────────────────────────────────────────────
        let audioFilePath: string | null = null;
        let videoFilePath: string | null = null;

        if (params.audioUri) {
          const ext = (params.audioFilename?.split('.').pop() ?? 'm4a').toLowerCase();
          const mimeType: Record<string, string> = {
            mp3: 'audio/mpeg', m4a: 'audio/mp4', aac: 'audio/aac',
            wav: 'audio/wav', ogg: 'audio/ogg', flac: 'audio/flac',
          };
          const storagePath = `${Date.now()}_audio.${ext}`;
          const res = await fetch(params.audioUri);
          const buf = await res.arrayBuffer();
          const { error } = await supabase.storage
            .from('audio-tracks')
            .upload(storagePath, buf, { contentType: mimeType[ext] ?? 'audio/mpeg' });
          if (error) throw error;
          audioFilePath = storagePath;
        }

        if (params.videoUri) {
          const ext = (params.videoFilename?.split('.').pop() ?? 'mp4').toLowerCase();
          const mimeType: Record<string, string> = {
            mp4: 'video/mp4', mov: 'video/quicktime', m4v: 'video/mp4',
            avi: 'video/x-msvideo', mkv: 'video/x-matroska',
          };
          const storagePath = `${Date.now()}_video.${ext}`;
          const res = await fetch(params.videoUri);
          const buf = await res.arrayBuffer();
          const { error } = await supabase.storage
            .from('video-tracks')
            .upload(storagePath, buf, { contentType: mimeType[ext] ?? 'video/mp4' });
          if (error) throw error;
          videoFilePath = storagePath;
        }

        const { data: routine, error: insertErr } = await supabase
          .from('routines')
          .insert({
            name: params.name ?? 'Untitled',
            style: params.style || null,
            duration_sec: state.duration,
            speed: state.speed,
            pitch_lock: state.pitchLock,
            delay_ms: state.delayMs,
            audio_file_path: audioFilePath,
            audio_file_name: params.audioFilename || null,
            audio_duration_sec: params.audioDurationSec ? parseFloat(params.audioDurationSec) : null,
            video_file_path: videoFilePath,
            video_file_name: params.videoFilename || null,
            video_duration_sec: params.videoDurationSec ? parseFloat(params.videoDurationSec) : null,
          })
          .select()
          .single();
        if (insertErr || !routine) throw insertErr ?? new Error('Failed to save routine');

        if (state.sections.length > 0) {
          await supabase.from('sections').insert(
            state.sections.map(s => ({ routine_id: routine.id, time_sec: s.time, name: s.name }))
          );
        }
        if (state.cues.length > 0) {
          await supabase.from('cues').insert(
            state.cues.map(c => ({ routine_id: routine.id, time_sec: c.time, type: c.type, count: c.count, note: c.note }))
          );
        }
      }

      router.replace('/(tabs)/library' as Href);
    } catch (e: any) {
      Alert.alert('Save failed', e?.message ?? 'Something went wrong');
      setSaving(false);
    }
  }

  const trackH = state.duration * state.pxPerSec;
  const scrollRef = useRef<ScrollView>(null);

  const dragRef = useRef<{ startY: number; startTime: number; moved: boolean } | null>(null);
  const sectionDragRef = useRef<{ startY: number; startTime: number; moved: boolean } | null>(null);
  const pxPerSecRef = useRef(state.pxPerSec);
  pxPerSecRef.current = state.pxPerSec;
  const cuesRef = useRef(state.cues);
  cuesRef.current = state.cues;
  const sectionsRef = useRef(state.sections);
  sectionsRef.current = state.sections;
  // PanResponders are created once per ID and reused — recreating them every render
  // causes React Native's gesture system to accumulate handlers and flicker.
  const cueRespondersRef = useRef<Record<string, ReturnType<typeof PanResponder.create>>>({});
  const sectionRespondersRef = useRef<Record<string, ReturnType<typeof PanResponder.create>>>({});

  function getOrCreateCuePanResponder(cueId: string) {
    if (!cueRespondersRef.current[cueId]) {
      cueRespondersRef.current[cueId] = PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 4,
        onPanResponderGrant: (e) => {
          const cue = cuesRef.current.find(c => c.id === cueId);
          dragRef.current = { startY: e.nativeEvent.pageY, startTime: cue?.time ?? 0, moved: false };
        },
        onPanResponderMove: (e, g) => {
          if (!dragRef.current) return;
          if (Math.abs(g.dy) > 4) dragRef.current.moved = true;
          if (dragRef.current.moved) {
            const newTime = dragRef.current.startTime + g.dy / pxPerSecRef.current;
            dispatch({ type: 'RETIME_CUE', id: cueId, time: newTime });
          }
        },
        onPanResponderRelease: (_, g) => {
          if (!dragRef.current) return;
          if (!dragRef.current.moved) {
            const cue = cuesRef.current.find(c => c.id === cueId);
            if (cue) dispatch({ type: 'OPEN_SHEET', cue });
          }
          dragRef.current = null;
        },
      });
    }
    return cueRespondersRef.current[cueId];
  }

  function getOrCreateSectionPanResponder(sectionId: string) {
    if (!sectionRespondersRef.current[sectionId]) {
      sectionRespondersRef.current[sectionId] = PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 4,
        onPanResponderGrant: (e) => {
          const sec = sectionsRef.current.find(s => s.id === sectionId);
          sectionDragRef.current = { startY: e.nativeEvent.pageY, startTime: sec?.time ?? 0, moved: false };
        },
        onPanResponderMove: (_, g) => {
          if (!sectionDragRef.current) return;
          if (Math.abs(g.dy) > 4) sectionDragRef.current.moved = true;
          if (sectionDragRef.current.moved) {
            const newTime = sectionDragRef.current.startTime + g.dy / pxPerSecRef.current;
            dispatch({ type: 'RETIME_SECTION', id: sectionId, time: newTime });
          }
        },
        onPanResponderRelease: () => {
          if (!sectionDragRef.current) return;
          if (!sectionDragRef.current.moved) {
            const sec = sectionsRef.current.find(s => s.id === sectionId);
            if (sec) {
              setSectionEditTarget(sec);
              setSectionName(sec.name);
              setSectionTime(sec.time);
              setSectionSheetOpen(true);
            }
          }
          sectionDragRef.current = null;
        },
      });
    }
    return sectionRespondersRef.current[sectionId];
  }

  const playedFrac = state.duration > 0 ? state.t / state.duration : 0;
  const playheadY = state.t * state.pxPerSec;

  // Ruler ticks every 30s
  const ticks = Array.from({ length: Math.floor(state.duration / 30) + 1 }, (_, i) => i * 30);

  // Scrubber pan
  const scrubResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => {
        const t = (e.nativeEvent.locationX / TRACK_W) * durationRef.current;
        dispatch({ type: 'SET_T', t });
        if (audioReadyRef.current) playerRef.current.seekTo(t);
        if (hasVideo) videoPlayerRef.current.seekBy(t - videoPlayerRef.current.currentTime);
      },
      onPanResponderMove: (e) => {
        const x = Math.max(0, Math.min(e.nativeEvent.locationX, TRACK_W));
        const t = (x / TRACK_W) * durationRef.current;
        dispatch({ type: 'SET_T', t });
        if (audioReadyRef.current) playerRef.current.seekTo(t);
        if (hasVideo) videoPlayerRef.current.seekBy(t - videoPlayerRef.current.currentTime);
      },
    })
  ).current;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: palette.paper }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: 'rgba(43,39,34,0.09)' }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={[styles.backChev, { color: palette.ink }]}>‹</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: palette.ink }]}>Timeline</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.skipBtn}
            onPress={() => router.replace('/(tabs)/library' as Href)}
            activeOpacity={0.7}
            disabled={saving}
          >
            <Text style={[styles.skipBtnText, { color: '#8f887d' }]}>Skip</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.doneBtn, { backgroundColor: palette.ink, opacity: saving ? 0.5 : 1 }]}
            onPress={handleSave}
            activeOpacity={0.8}
            disabled={saving}
          >
            <Text style={[styles.doneBtnText, { color: palette.paper }]}>
              {saving ? 'Saving…' : 'Save'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Slim scrubber */}
      <View
        style={[styles.scrubber, { backgroundColor: 'rgba(43,39,34,0.08)' }]}
        {...scrubResponder.panHandlers}
      >
        <View
          style={[styles.scrubFill, { width: `${playedFrac * 100}%`, backgroundColor: palette.accent }]}
        />
        <View
          style={[styles.scrubThumb, { left: `${playedFrac * 100}%`, backgroundColor: palette.accent }]}
        />
      </View>

      {/* Meta row */}
      <View style={styles.metaRow}>
        <Text style={[styles.metaText, { color: palette.ink, flex: 0 }]}>{fmtTime(state.t)}</Text>
        <Text style={[styles.metaText, { color: '#8f887d' }]}>
          {state.cues.length} cues · {state.sections.length} sections · {fmtTime(state.duration)}
        </Text>
        <View style={styles.zoomBtns}>
          <TouchableOpacity
            style={styles.zoomBtn}
            onPress={() => dispatch({ type: 'SET_PX_PER_SEC', pxPerSec: state.pxPerSec - 0.8 })}
          >
            <Text style={[styles.zoomBtnText, { color: palette.ink }]}>−</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.zoomBtn}
            onPress={() => dispatch({ type: 'SET_PX_PER_SEC', pxPerSec: state.pxPerSec + 0.8 })}
          >
            <Text style={[styles.zoomBtnText, { color: palette.ink }]}>＋</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Track */}
      <ScrollView ref={scrollRef} contentContainerStyle={{ height: trackH + 80 }} style={styles.trackScroll}>
        <View style={styles.trackArea}>
          {/* Left gutter (time ruler) */}
          <View style={styles.gutter}>
            {ticks.map(t => (
              <View key={t} style={[styles.tickRow, { top: t * state.pxPerSec }]}>
                <Text style={[styles.tickLabel, { color: '#a79f92' }]}>{fmtTime(t)}</Text>
                <View style={[styles.tickMark, { backgroundColor: 'rgba(43,39,34,0.10)' }]} />
              </View>
            ))}
          </View>

          {/* Track content */}
          <View style={[styles.track, { height: trackH }]}>
            {/* Section dividers — drag to retime, tap to edit */}
            {state.sections.map(sec => {
              const y = sec.time * state.pxPerSec;
              const color = sectionColor(sec.name);
              const panResponder = getOrCreateSectionPanResponder(sec.id);
              return (
                <View key={sec.id} style={[styles.sectionDivider, { top: y }]} {...panResponder.panHandlers}>
                  <View style={[styles.sectionLine, { borderColor: color }]} />
                  <View style={[styles.sectionChip, { backgroundColor: palette.paper }]}>
                    <Text style={[styles.sectionLabel, { color }]}>{sec.name}</Text>
                    <Text style={[styles.sectionChipTime, { color }]}>{fmtTime(sec.time)}</Text>
                  </View>
                </View>
              );
            })}

            {/* Playhead */}
            <View style={[styles.playhead, { top: playheadY }]} pointerEvents="none">
              <View style={[styles.playheadLine, { backgroundColor: palette.accent }]} />
              <View style={[styles.playheadBadge, { backgroundColor: palette.accent }]}>
                <Text style={[styles.playheadTime, { color: palette.paper }]}>{fmtTime(state.t)}</Text>
              </View>
            </View>

            {/* Cues */}
            {state.cues.map(cue => {
              const y = cue.time * state.pxPerSec;
              const typeColor = cueTypeColor(cue.type);
              const isSelected = cue.id === state.selectedCueId;
              const panResponder = getOrCreateCuePanResponder(cue.id);

              return (
                <View
                  key={cue.id}
                  style={[
                    styles.cueCard,
                    {
                      top: y,
                      borderLeftColor: typeColor,
                      shadowColor: isSelected ? palette.accent : 'transparent',
                      shadowOpacity: isSelected ? 1 : 0,
                      shadowRadius: isSelected ? 8 : 0,
                      shadowOffset: { width: 0, height: 0 },
                      elevation: isSelected ? 4 : 1,
                    },
                  ]}
                  {...panResponder.panHandlers}
                >
                  <View style={styles.cueTopRow}>
                    <Text style={[styles.cueTypeTag, { color: typeColor }]}>
                      {cue.type.toUpperCase()}
                    </Text>
                    <Text style={[styles.cueTime, { color: '#8f887d' }]}>{fmtTime(cue.time)}</Text>
                  </View>
                  {cue.count && cue.count !== '—' && (
                    <Text style={[styles.cueCount, { color: palette.ink }]}>{cue.count}</Text>
                  )}
                  {cue.note ? (
                    <Text style={[styles.cueNote, { color: '#6b655b' }]} numberOfLines={2}>{cue.note}</Text>
                  ) : null}
                </View>
              );
            })}
          </View>
        </View>
      </ScrollView>

      {/* Footer */}
      <View style={[styles.footer, { borderTopColor: 'rgba(43,39,34,0.09)', backgroundColor: palette.paper }]}>
        {hasMedia && (
          <TouchableOpacity
            style={[styles.playPauseBtn, { backgroundColor: palette.accent }]}
            onPress={() => dispatch({ type: 'TOGGLE_PLAY' })}
            activeOpacity={0.8}
          >
            <Text style={[styles.playPauseIcon, { color: palette.paper }]}>
              {state.playing ? '⏸' : '▶'}
            </Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.footerOutlined, { borderColor: palette.ink }]}
          activeOpacity={0.7}
          onPress={() => { setSectionEditTarget(null); setSectionName(''); setSectionTime(state.t); setSectionSheetOpen(true); }}
        >
          <Text style={[styles.footerOutlinedText, { color: palette.ink }]}>＋ Section</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.footerAccent, { backgroundColor: palette.accent }]}
          onPress={() => dispatch({ type: 'ADD_CUE' })}
          activeOpacity={0.8}
        >
          <Text style={[styles.footerAccentText, { color: palette.paper }]}>
            ＋ Cue at {fmtTime(state.t)}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Section Sheet — add or edit */}
      <Modal
        visible={sectionSheetOpen}
        transparent
        animationType="slide"
        onRequestClose={() => { setSectionSheetOpen(false); setSectionEditTarget(null); }}
      >
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.sheetOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => { setSectionSheetOpen(false); setSectionEditTarget(null); }} />
          <View style={[styles.sheet, { backgroundColor: palette.paper }]}>
            <View style={[styles.sheetHandle, { backgroundColor: 'rgba(43,39,34,0.18)' }]} />
            <Text style={[styles.sheetTitle, { color: palette.ink }]}>
              {sectionEditTarget ? 'Edit section' : 'Add section'}
            </Text>

            {/* Time stepper + set to now */}
            <View style={[styles.sheetRow, { borderColor: 'rgba(43,39,34,0.09)' }]}>
              <Text style={[styles.sheetRowLabel, { color: '#8f887d' }]}>Time</Text>
              <View style={styles.stepper}>
                <TouchableOpacity style={[styles.stepBtn, { backgroundColor: '#eae5da' }]} onPress={() => setSectionTime(t => Math.max(0, t - 1))}>
                  <Text style={[styles.stepBtnText, { color: palette.ink }]}>−</Text>
                </TouchableOpacity>
                <Text style={[styles.stepValue, { color: palette.ink }]}>{fmtTime(sectionTime)}</Text>
                <TouchableOpacity style={[styles.stepBtn, { backgroundColor: '#eae5da' }]} onPress={() => setSectionTime(t => Math.min(state.duration, t + 1))}>
                  <Text style={[styles.stepBtnText, { color: palette.ink }]}>＋</Text>
                </TouchableOpacity>
              </View>
            </View>
            {hasMedia && (
              <TouchableOpacity style={styles.setNowBtn} onPress={() => setSectionTime(state.t)} activeOpacity={0.7}>
                <Text style={[styles.setNowBtnText, { color: palette.accent }]}>⏱ Set to {fmtTime(state.t)}</Text>
              </TouchableOpacity>
            )}

            {/* Name input */}
            <Text style={[styles.sheetSectionLabel, { color: palette.accent }]}>NAME</Text>
            <TextInput
              style={[styles.noteInput, { color: palette.ink, borderColor: 'rgba(43,39,34,0.14)' }]}
              value={sectionName}
              onChangeText={setSectionName}
              placeholder="e.g. Intro, Chorus, Bridge…"
              placeholderTextColor="#b8b1a4"
              autoFocus
            />

            <View style={styles.sheetFooter}>
              {sectionEditTarget && (
                <TouchableOpacity
                  style={[styles.deleteBtn, { borderColor: 'rgba(43,39,34,0.22)' }]}
                  onPress={() => {
                    dispatch({ type: 'DELETE_SECTION', id: sectionEditTarget.id });
                    setSectionSheetOpen(false);
                    setSectionEditTarget(null);
                  }}
                >
                  <Text style={[styles.deleteBtnText, { color: '#a85f6b' }]}>🗑</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[styles.saveBtn, { backgroundColor: sectionName.trim() ? palette.ink : 'rgba(43,39,34,0.2)', flex: 1 }]}
                onPress={() => {
                  if (!sectionName.trim()) return;
                  if (sectionEditTarget) dispatch({ type: 'DELETE_SECTION', id: sectionEditTarget.id });
                  dispatch({ type: 'ADD_SECTION', name: sectionName.trim(), time: sectionTime });
                  setSectionSheetOpen(false);
                  setSectionEditTarget(null);
                }}
                activeOpacity={0.8}
              >
                <Text style={[styles.saveBtnText, { color: palette.paper }]}>
                  {sectionEditTarget ? 'Save section' : 'Add section'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Cue Editor Sheet */}
      {state.sheetOpen && state.draft && (
        <CueEditorSheet palette={palette} hasMedia={hasMedia} />
      )}
    </SafeAreaView>
  );
}

function CueEditorSheet({ palette, hasMedia }: { palette: any; hasMedia: boolean }) {
  const { state, dispatch } = useStore();
  const { cueTypeColor } = useTheme();
  const draft = state.draft!;

  return (
    <Modal
      visible={state.sheetOpen}
      transparent
      animationType="slide"
      onRequestClose={() => dispatch({ type: 'CLOSE_SHEET' })}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.sheetOverlay}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={() => dispatch({ type: 'CLOSE_SHEET' })} />
        <View style={[styles.sheet, { backgroundColor: palette.paper }]}>
          <View style={[styles.sheetHandle, { backgroundColor: 'rgba(43,39,34,0.18)' }]} />

          <Text style={[styles.sheetTitle, { color: palette.ink }]}>Edit cue</Text>

          {/* Time stepper + set to now */}
          <View style={[styles.sheetRow, { borderColor: 'rgba(43,39,34,0.09)' }]}>
            <Text style={[styles.sheetRowLabel, { color: '#8f887d' }]}>Time</Text>
            <View style={styles.stepper}>
              <TouchableOpacity
                style={[styles.stepBtn, { backgroundColor: '#eae5da' }]}
                onPress={() => dispatch({ type: 'SET_DRAFT', draft: { time: Math.max(0, draft.time - 1) } })}
              >
                <Text style={[styles.stepBtnText, { color: palette.ink }]}>−</Text>
              </TouchableOpacity>
              <Text style={[styles.stepValue, { color: palette.ink }]}>{fmtTime(draft.time)}</Text>
              <TouchableOpacity
                style={[styles.stepBtn, { backgroundColor: '#eae5da' }]}
                onPress={() => dispatch({ type: 'SET_DRAFT', draft: { time: Math.min(state.duration, draft.time + 1) } })}
              >
                <Text style={[styles.stepBtnText, { color: palette.ink }]}>＋</Text>
              </TouchableOpacity>
            </View>
          </View>
          {hasMedia && (
            <TouchableOpacity
              style={styles.setNowBtn}
              onPress={() => dispatch({ type: 'SET_DRAFT', draft: { time: state.t } })}
              activeOpacity={0.7}
            >
              <Text style={[styles.setNowBtnText, { color: palette.accent }]}>⏱ Set to {fmtTime(state.t)}</Text>
            </TouchableOpacity>
          )}

          {/* Type chips */}
          <Text style={[styles.sheetSectionLabel, { color: palette.accent }]}>TYPE</Text>
          <View style={styles.chipRow}>
            {CUE_TYPES.map(t => {
              const active = draft.type === t;
              const color = cueTypeColor(t);
              return (
                <TouchableOpacity
                  key={t}
                  style={[
                    styles.typeChip,
                    {
                      backgroundColor: active ? color : 'transparent',
                      borderColor: active ? color : 'rgba(43,39,34,0.22)',
                    },
                  ]}
                  onPress={() => dispatch({ type: 'SET_DRAFT', draft: { type: t } })}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    styles.typeChipText,
                    { color: active ? '#fff' : '#6b655b' },
                  ]}>
                    {t.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Count chips */}
          <Text style={[styles.sheetSectionLabel, { color: palette.accent }]}>COUNT</Text>
          <View style={styles.chipRow}>
            {COUNT_VALS.map(c => {
              const active = (draft.count || '—') === c;
              return (
                <TouchableOpacity
                  key={c}
                  style={[
                    styles.typeChip,
                    {
                      backgroundColor: active ? palette.ink : 'transparent',
                      borderColor: active ? palette.ink : 'rgba(43,39,34,0.22)',
                    },
                  ]}
                  onPress={() => dispatch({ type: 'SET_DRAFT', draft: { count: c === '—' ? '' : c as Count } })}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    styles.typeChipText,
                    { color: active ? palette.paper : '#6b655b' },
                  ]}>
                    {c}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Note input */}
          <Text style={[styles.sheetSectionLabel, { color: palette.accent }]}>NOTE</Text>
          <TextInput
            style={[styles.noteInput, { color: palette.ink, borderColor: 'rgba(43,39,34,0.14)' }]}
            value={draft.note}
            onChangeText={v => dispatch({ type: 'SET_DRAFT', draft: { note: v } })}
            placeholder="Optional note…"
            placeholderTextColor="#b8b1a4"
            multiline
          />

          {/* Footer */}
          <View style={styles.sheetFooter}>
            <TouchableOpacity
              style={[styles.deleteBtn, { borderColor: 'rgba(43,39,34,0.22)' }]}
              onPress={() => dispatch({ type: 'DELETE_CUE', id: draft.id })}
            >
              <Text style={[styles.deleteBtnText, { color: '#a85f6b' }]}>🗑</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: palette.ink, flex: 1 }]}
              onPress={() => dispatch({ type: 'SAVE_CUE' })}
              activeOpacity={0.8}
            >
              <Text style={[styles.saveBtnText, { color: palette.paper }]}>Save cue</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backBtn: { padding: 4, marginRight: 8 },
  backChev: { fontSize: 28 },
  headerTitle: {
    fontFamily: 'Newsreader_400Regular',
    fontSize: 23,
    flex: 1,
  },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  skipBtn: { paddingHorizontal: 10, paddingVertical: 6 },
  skipBtnText: { fontFamily: 'WorkSans_500Medium', fontSize: 14 },
  doneBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  doneBtnText: { fontFamily: 'WorkSans_500Medium', fontSize: 14 },
  zoomBtns: { flexDirection: 'row', gap: 4 },
  zoomBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoomBtnText: { fontSize: 16 },
  scrubber: {
    height: 6,
    marginHorizontal: 22,
    marginTop: 10,
    borderRadius: 3,
    position: 'relative',
    overflow: 'visible',
  },
  scrubFill: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    borderRadius: 3,
  },
  scrubThumb: {
    position: 'absolute',
    top: -5,
    width: 16,
    height: 16,
    borderRadius: 8,
    marginLeft: -8,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 22,
    marginTop: 10,
    marginBottom: 6,
    gap: 8,
  },
  metaText: {
    fontFamily: 'WorkSans_400Regular',
    fontSize: 12,
    flex: 1,
  },
  trackScroll: { flex: 1 },
  trackArea: {
    flexDirection: 'row',
    paddingHorizontal: 0,
  },
  gutter: {
    width: 44,
    position: 'relative',
  },
  tickRow: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
  },
  tickLabel: {
    fontFamily: 'WorkSans_400Regular',
    fontSize: 10,
    width: 30,
    textAlign: 'right',
    marginRight: 4,
  },
  tickMark: {
    width: 6,
    height: 1,
  },
  track: {
    flex: 1,
    marginRight: 16,
    position: 'relative',
  },
  sectionDivider: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 1,
  },
  sectionLine: {
    flex: 1,
    borderTopWidth: 1,
    borderStyle: 'dashed',
  },
  sectionChip: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: -60,
  },
  sectionLabel: {
    fontFamily: 'Newsreader_400Regular_Italic',
    fontSize: 14,
  },
  sectionChipTime: {
    fontFamily: 'WorkSans_400Regular',
    fontSize: 9,
    opacity: 0.65,
    marginTop: 1,
  },
  playhead: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 10,
  },
  playheadLine: {
    flex: 1,
    height: 2,
  },
  playheadBadge: {
    position: 'absolute',
    left: -44,
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
  },
  playheadTime: {
    fontFamily: 'WorkSans_500Medium',
    fontSize: 9,
  },
  cueCard: {
    position: 'absolute',
    left: 0,
    right: 0,
    backgroundColor: '#faf8f4',
    borderRadius: 8,
    borderLeftWidth: 3,
    padding: 10,
    marginBottom: 4,
    shadowOffset: { width: 0, height: 0 },
    zIndex: 5,
  },
  cueTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  cueTypeTag: {
    fontFamily: 'WorkSans_600SemiBold',
    fontSize: 9,
    letterSpacing: 0.09 * 9,
  },
  cueTime: {
    fontFamily: 'WorkSans_400Regular',
    fontSize: 11,
  },
  cueCount: {
    fontFamily: 'Newsreader_400Regular',
    fontSize: 16,
    letterSpacing: 0.04 * 16,
    marginBottom: 2,
  },
  cueNote: {
    fontFamily: 'WorkSans_400Regular',
    fontSize: 12,
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    gap: 10,
  },
  playPauseBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playPauseIcon: { fontSize: 18 },
  footerOutlined: {
    borderWidth: 1.5,
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerOutlinedText: {
    fontFamily: 'WorkSans_500Medium',
    fontSize: 14,
  },
  footerAccent: {
    flex: 1,
    borderRadius: 24,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerAccentText: {
    fontFamily: 'WorkSans_500Medium',
    fontSize: 14,
  },
  // Sheet
  sheetOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(43,39,34,0.4)',
  },
  sheet: {
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    padding: 20,
    paddingBottom: 36,
    shadowColor: 'rgba(43,39,34,0.18)',
    shadowOffset: { width: 0, height: -12 },
    shadowOpacity: 1,
    shadowRadius: 40,
    elevation: 20,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  sheetTitle: {
    fontFamily: 'Newsreader_400Regular',
    fontSize: 20,
    marginBottom: 16,
  },
  sheetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    marginBottom: 16,
  },
  sheetRowLabel: {
    fontFamily: 'WorkSans_400Regular',
    fontSize: 14,
  },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stepBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBtnText: { fontSize: 18 },
  stepValue: {
    fontFamily: 'WorkSans_600SemiBold',
    fontSize: 15,
    minWidth: 44,
    textAlign: 'center',
  },
  sheetSectionLabel: {
    fontFamily: 'WorkSans_500Medium',
    fontSize: 11,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    marginBottom: 8,
    marginTop: 4,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  typeChip: {
    borderWidth: 1.5,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  typeChipText: {
    fontFamily: 'WorkSans_600SemiBold',
    fontSize: 10,
    letterSpacing: 0.09 * 10,
  },
  noteInput: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    fontFamily: 'WorkSans_400Regular',
    fontSize: 14,
    minHeight: 64,
    marginBottom: 20,
    textAlignVertical: 'top',
  },
  sheetFooter: { flexDirection: 'row', gap: 12 },
  setNowBtn: { alignSelf: 'flex-end', paddingVertical: 6, paddingHorizontal: 2, marginTop: -10, marginBottom: 12 },
  setNowBtnText: { fontFamily: 'WorkSans_500Medium', fontSize: 13 },
  deleteBtn: {
    width: 48,
    height: 48,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteBtnText: { fontSize: 18 },
  saveBtn: {
    borderRadius: 24,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnText: {
    fontFamily: 'WorkSans_500Medium',
    fontSize: 15,
  },
});
