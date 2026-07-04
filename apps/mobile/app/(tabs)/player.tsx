import { useEffect, useRef, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  SafeAreaView, PanResponder, Dimensions, ActivityIndicator, Modal,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAudioPlayer, useAudioPlayerStatus, setAudioModeAsync } from 'expo-audio';
import { useTheme } from '@/lib/theme';
import { useStore, fmtTime, currentSection, CueType, Count } from '@/lib/rehearseStore';
import { supabase } from '@/lib/supabase';
import type { Routine, Section as DBSection, Cue as DBCue } from '@dancer-hub/shared';

const SCREEN_W = Dimensions.get('window').width;
const WAVE_W = SCREEN_W - 44;
const SPEED_TRACK_W = SCREEN_W - 76; // controlCard marginHorizontal 22*2 + padding 16*2

const STYLES = [
  'Salsa', 'Hustle', 'Kizomba', 'Samba', 'Reggaeton', 'Bachata',
  'Ballet', 'Contemporary', 'Hip Hop', 'Jazz', 'Ballroom',
];

export default function PlayerScreen() {
  const { palette, sectionColor } = useTheme();
  const { state, dispatch } = useStore();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();

  const [routine, setRoutine] = useState<Routine | null>(null);
  const [routineStyle, setRoutineStyle] = useState<string | null>(null);
  const [stylePickerOpen, setStylePickerOpen] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(!!id);

  // Load routine from Supabase
  useEffect(() => {
    if (!id) return;
    async function load() {
      const { data } = await supabase
        .from('routines')
        .select('*, sections(*), cues(*)')
        .eq('id', id)
        .single();

      if (!data) { setLoading(false); return; }

      const r = data as Routine & { sections: DBSection[]; cues: DBCue[] };
      setRoutine(r);
      setRoutineStyle(r.style ?? null);

      dispatch({
        type: 'LOAD_ROUTINE',
        duration: r.duration_sec,
        speed: r.speed,
        pitchLock: r.pitch_lock,
        delayMs: Math.round((r.delay_ms ?? 0) / 1000) * 1000,
        sections: r.sections.map(s => ({ id: s.id, time: s.time_sec, name: s.name })),
        cues: r.cues.map(c => ({
          id: c.id, time: c.time_sec,
          type: c.type as CueType, count: c.count as Count | '', note: c.note,
        })),
      });

      if (r.audio_file_path) {
        const { data: url } = supabase.storage
          .from('audio-tracks')
          .getPublicUrl(r.audio_file_path);
        setAudioUrl(url.publicUrl);
      }

      setLoading(false);
    }
    load();
  }, [id]);

  async function updateStyle(s: string) {
    const next = s === routineStyle ? null : s;
    setRoutineStyle(next);
    if (routine?.id) {
      await supabase.from('routines').update({ style: next }).eq('id', routine.id);
    }
  }

  // ── Audio playback ─────────────────────────────────────────────────────────
  const player = useAudioPlayer(audioUrl ? { uri: audioUrl } : { uri: '' });
  const playerStatus = useAudioPlayerStatus(player);

  const durationRef = useRef(state.duration);
  durationRef.current = state.duration;
  const playerRef = useRef(player);
  playerRef.current = player;
  const audioReadyRef = useRef(false);
  audioReadyRef.current = !!audioUrl && playerStatus.isLoaded;
  const delayMsRef = useRef(state.delayMs);
  delayMsRef.current = state.delayMs;
  const delayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (audioUrl) setAudioModeAsync({ playsInSilentMode: true });
  }, [audioUrl]);

  // Play/pause: store → audio (with optional start delay)
  useEffect(() => {
    if (!audioReadyRef.current) return;
    if (state.playing) {
      const ms = delayMsRef.current;
      if (ms > 0) {
        delayTimerRef.current = setTimeout(() => { playerRef.current.play(); }, ms);
      } else {
        playerRef.current.play();
      }
    } else {
      if (delayTimerRef.current !== null) {
        clearTimeout(delayTimerRef.current);
        delayTimerRef.current = null;
      }
      playerRef.current.pause();
    }
  }, [state.playing]);

  // Speed + pitch lock: store → audio
  useEffect(() => {
    if (!audioReadyRef.current) return;
    player.setPlaybackRate(state.speed, state.pitchLock ? 'medium' : 'low');
  }, [state.speed, state.pitchLock, playerStatus.isLoaded]);

  // Position sync: poll every 100ms while playing
  useEffect(() => {
    if (!state.playing || !audioUrl) return;
    const intervalId = setInterval(() => {
      if (!audioReadyRef.current) return;
      dispatch({ type: 'SET_T', t: playerRef.current.currentTime });
    }, 100);
    return () => clearInterval(intervalId);
  }, [state.playing, audioUrl]);

  // Stop at end
  useEffect(() => {
    if (playerStatus.didJustFinish) {
      dispatch({ type: 'TOGGLE_PLAY' });
      dispatch({ type: 'SET_T', t: 0 });
    }
  }, [playerStatus.didJustFinish]);
  // ──────────────────────────────────────────────────────────────────────────

  const sec = currentSection(state);
  const playedFrac = state.duration > 0 ? state.t / state.duration : 0;

  const waveResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => {
        const t = (e.nativeEvent.locationX / WAVE_W) * durationRef.current;
        dispatch({ type: 'SET_T', t });
        if (audioReadyRef.current) playerRef.current.seekTo(t);
      },
      onPanResponderMove: (e) => {
        const x = Math.max(0, Math.min(e.nativeEvent.locationX, WAVE_W));
        const t = (x / WAVE_W) * durationRef.current;
        dispatch({ type: 'SET_T', t });
        if (audioReadyRef.current) playerRef.current.seekTo(t);
      },
    })
  ).current;

  const speedResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => {
        const x = Math.max(0, Math.min(e.nativeEvent.locationX, SPEED_TRACK_W));
        dispatch({ type: 'SET_SPEED', speed: 0.25 + (x / SPEED_TRACK_W) * 1.25 });
      },
      onPanResponderMove: (e) => {
        const x = Math.max(0, Math.min(e.nativeEvent.locationX, SPEED_TRACK_W));
        dispatch({ type: 'SET_SPEED', speed: 0.25 + (x / SPEED_TRACK_W) * 1.25 });
      },
    })
  ).current;

  const secColor = sec ? sectionColor(sec.name) : palette.ink;

  if (loading) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: palette.paper, alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator color={palette.accent} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: palette.paper }]}>
      {/* Video area */}
      <View style={styles.videoArea}>
        <HatchView />
        <View style={styles.videoTopRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={[styles.backChev, { color: palette.paper }]}>‹</Text>
          </TouchableOpacity>
          <Text style={[styles.videoTitle, { color: palette.paper }]} numberOfLines={1}>
            {routine?.name ?? 'Practice'}
          </Text>
        </View>
        {sec && (
          <View style={[styles.sectionPill, { backgroundColor: secColor }]}>
            <Text style={[styles.sectionPillText, { color: palette.paper }]}>{sec.name}</Text>
          </View>
        )}
        <TouchableOpacity
          style={[styles.mirrorBtn, { backgroundColor: state.mirror ? palette.accent : 'rgba(0,0,0,0.3)' }]}
          onPress={() => dispatch({ type: 'TOGGLE_MIRROR' })}
        >
          <Text style={styles.mirrorText}>⇄</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Waveform */}
        <View style={[styles.waveContainer, { borderColor: 'rgba(43,39,34,0.09)' }]}>
          <View style={styles.wave} {...waveResponder.panHandlers}>
            {Array.from({ length: 60 }).map((_, i) => {
              const h = 6 + Math.abs(Math.sin(i * 0.7 + 1) * 22 + Math.cos(i * 0.3) * 12);
              const played = (i / 60) < playedFrac;
              return (
                <View
                  key={i}
                  style={[styles.waveBar, { height: h, backgroundColor: played ? palette.accent : 'rgba(43,39,34,0.18)' }]}
                />
              );
            })}
            <View style={[styles.playhead, { left: playedFrac * WAVE_W, backgroundColor: palette.accent }]} pointerEvents="none" />
          </View>
        </View>

        {/* Time row */}
        <View style={styles.timeRow}>
          <Text style={[styles.timeMono, { color: palette.ink }]}>{fmtTime(state.t)}</Text>
          <Text style={[styles.timeMono, { color: '#8f887d' }]}>{fmtTime(state.duration)}</Text>
        </View>

        {/* Transport */}
        <View style={styles.transport}>
          <TransportBtn onPress={() => dispatch({ type: 'PREV_SECTION' })} label="⏮" palette={palette} />
          <TransportBtn
            onPress={() => {
              const t = Math.max(0, state.t - 10);
              dispatch({ type: 'SET_T', t });
              if (audioReadyRef.current) playerRef.current.seekTo(t);
            }}
            label="−10" palette={palette} small
          />
          <TouchableOpacity
            style={[styles.playCircle, { backgroundColor: palette.ink }]}
            onPress={() => dispatch({ type: 'TOGGLE_PLAY' })}
            activeOpacity={0.8}
            disabled={!!audioUrl && !playerStatus.isLoaded}
          >
            <Text style={[styles.playIcon, { color: palette.paper }]}>
              {state.playing ? '❚❚' : '▶'}
            </Text>
          </TouchableOpacity>
          <TransportBtn
            onPress={() => {
              const t = Math.min(state.duration, state.t + 10);
              dispatch({ type: 'SET_T', t });
              if (audioReadyRef.current) playerRef.current.seekTo(t);
            }}
            label="+10" palette={palette} small
          />
          <TransportBtn onPress={() => dispatch({ type: 'NEXT_SECTION' })} label="⏭" palette={palette} />
        </View>

        {/* Style */}
        <View style={styles.controlCard}>
          <View style={styles.controlRow}>
            <Text style={[styles.controlLabel, { color: palette.ink }]}>Style</Text>
            <TouchableOpacity onPress={() => setStylePickerOpen(true)} activeOpacity={0.7} style={styles.styleRow}>
              {routineStyle ? (
                <View style={[styles.styleTag, { backgroundColor: palette.accent }]}>
                  <Text style={[styles.styleTagText, { color: palette.paper }]}>{routineStyle}</Text>
                </View>
              ) : (
                <Text style={[styles.controlSub, { color: '#8f887d' }]}>None</Text>
              )}
              <Text style={[styles.editLink, { color: palette.accent }]}>Edit</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Speed */}
        <View style={[styles.controlCard, { shadowColor: 'rgba(90,80,66,0.08)' }]}>
          <View style={styles.controlRow}>
            <Text style={[styles.controlLabel, { color: palette.ink }]}>Speed</Text>
            <Text style={[styles.controlValue, { color: palette.ink }]}>{state.speed.toFixed(2)}×</Text>
          </View>
          <View style={[styles.sliderTrack, { backgroundColor: 'rgba(43,39,34,0.14)' }]} {...speedResponder.panHandlers}>
            <View style={[styles.sliderFill, { width: `${((state.speed - 0.25) / 1.25) * 100}%`, backgroundColor: palette.accent }]} />
            <View style={[styles.sliderThumb, { left: `${((state.speed - 0.25) / 1.25) * 100}%`, backgroundColor: palette.accent }]} />
          </View>
          <View style={styles.sliderBtns}>
            <TouchableOpacity onPress={() => dispatch({ type: 'SET_SPEED', speed: Math.max(0.25, state.speed - 0.05) })}>
              <Text style={[styles.stepBtn, { color: palette.ink }]}>−</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => dispatch({ type: 'TOGGLE_PITCH_LOCK' })}>
              <Text style={[styles.controlSub, { color: state.pitchLock ? palette.accent : '#8f887d' }]}>
                Pitch lock · {state.pitchLock ? 'On' : 'Off'} — music stays in key
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => dispatch({ type: 'SET_SPEED', speed: Math.min(1.5, state.speed + 0.05) })}>
              <Text style={[styles.stepBtn, { color: palette.ink }]}>＋</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Start delay */}
        <View style={styles.controlCard}>
          <View style={styles.controlRow}>
            <Text style={[styles.controlLabel, { color: palette.ink }]}>Start delay</Text>
            <View style={styles.stepper}>
              <TouchableOpacity style={[styles.stepperBtn, { backgroundColor: '#eae5da' }]} onPress={() => dispatch({ type: 'SET_DELAY', delayMs: state.delayMs - 1000 })}>
                <Text style={[styles.stepBtnText, { color: palette.ink }]}>−</Text>
              </TouchableOpacity>
              <Text style={[styles.stepperValue, { color: palette.ink }]}>{state.delayMs / 1000}s</Text>
              <TouchableOpacity style={[styles.stepperBtn, { backgroundColor: '#eae5da' }]} onPress={() => dispatch({ type: 'SET_DELAY', delayMs: state.delayMs + 1000 })}>
                <Text style={[styles.stepBtnText, { color: palette.ink }]}>＋</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Open Timeline */}
        <TouchableOpacity
          style={[styles.timelineBtn, { borderColor: palette.accent }]}
          onPress={() => router.push({
            pathname: '/timeline',
            params: {
              routineId: routine?.id ?? '',
              name: routine?.name ?? '',
              style: routine?.style ?? '',
              audioUri: audioUrl ?? '',
              audioFilename: routine?.audio_file_name ?? '',
              audioDurationSec: String(routine?.audio_duration_sec ?? state.duration),
            },
          } as any)}
          activeOpacity={0.8}
        >
          <Text style={[styles.timelineBtnText, { color: palette.accent }]}>Open timeline editor →</Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal visible={stylePickerOpen} transparent animationType="fade" onRequestClose={() => setStylePickerOpen(false)}>
        <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setStylePickerOpen(false)}>
          <TouchableOpacity style={[styles.modalSheet, { backgroundColor: palette.paper }]} activeOpacity={1}>
            <Text style={[styles.modalTitle, { color: palette.ink }]}>Dance style</Text>
            <View style={styles.chipRow}>
              {STYLES.map((s) => {
                const active = routineStyle === s;
                return (
                  <TouchableOpacity
                    key={s}
                    style={[styles.chip, {
                      backgroundColor: active ? palette.accent : 'transparent',
                      borderColor: active ? palette.accent : 'rgba(43,39,34,0.25)',
                    }]}
                    onPress={() => { updateStyle(s); setStylePickerOpen(false); }}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.chipText, { color: active ? palette.paper : palette.ink }]}>{s}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            {routineStyle && (
              <TouchableOpacity onPress={() => { setRoutineStyle(null); supabase.from('routines').update({ style: null }).eq('id', routine?.id ?? ''); setStylePickerOpen(false); }} activeOpacity={0.7}>
                <Text style={[styles.clearStyle, { color: '#8f887d' }]}>Clear style</Text>
              </TouchableOpacity>
            )}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

function HatchView() {
  return (
    <View style={StyleSheet.absoluteFill}>
      {Array.from({ length: 20 }).map((_, i) => (
        <View key={i} style={[hatchStyles.line, { top: i * 18 - 20, transform: [{ rotate: '45deg' }] }]} />
      ))}
    </View>
  );
}

const hatchStyles = StyleSheet.create({
  line: { position: 'absolute', left: -40, right: -40, height: 8, backgroundColor: '#ddd7ca' },
});

function TransportBtn({ onPress, label, palette, small }: {
  onPress: () => void; label: string; palette: any; small?: boolean;
}) {
  return (
    <TouchableOpacity onPress={onPress} style={styles.transportBtn} activeOpacity={0.7}>
      <Text style={[styles.transportIcon, small && styles.transportSmall, { color: palette.ink }]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  videoArea: { height: 174, backgroundColor: '#e2dccf', overflow: 'hidden', position: 'relative' },
  videoTopRow: { position: 'absolute', top: 16, left: 16, right: 16, flexDirection: 'row', alignItems: 'center' },
  backBtn: { marginRight: 10 },
  backChev: { fontSize: 28 },
  videoTitle: { fontFamily: 'Newsreader_400Regular', fontSize: 17, flex: 1, textShadowColor: 'rgba(0,0,0,0.4)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 },
  sectionPill: { position: 'absolute', top: 16, right: 16, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20 },
  sectionPillText: { fontFamily: 'WorkSans_500Medium', fontSize: 11, letterSpacing: 0.5 },
  mirrorBtn: { position: 'absolute', bottom: 12, left: 16, width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  mirrorText: { fontSize: 16, color: '#fff' },
  scroll: { paddingBottom: 32 },
  waveContainer: { marginHorizontal: 22, marginTop: 20, height: 56, borderRadius: 8, overflow: 'hidden', borderWidth: 1 },
  wave: { flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 4, gap: 2, position: 'relative' },
  waveBar: { width: 3, borderRadius: 2, flex: 1 },
  playhead: { position: 'absolute', top: 0, bottom: 0, width: 2 },
  timeRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 22, marginTop: 8 },
  timeMono: { fontFamily: 'WorkSans_500Medium', fontSize: 12 },
  transport: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, gap: 8 },
  transportBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  transportIcon: { fontSize: 22 },
  transportSmall: { fontSize: 13, fontFamily: 'WorkSans_500Medium' },
  playCircle: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', marginHorizontal: 8 },
  playIcon: { fontSize: 18 },
  controlCard: { marginHorizontal: 22, marginBottom: 12, backgroundColor: '#faf8f4', borderRadius: 12, padding: 16, shadowColor: '#5a5042', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 6, elevation: 1 },
  controlRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  controlLabel: { fontFamily: 'WorkSans_500Medium', fontSize: 14, marginBottom: 2 },
  controlValue: { fontFamily: 'Newsreader_400Regular', fontSize: 18, letterSpacing: 0.04 * 18 },
  controlSub: { fontFamily: 'WorkSans_400Regular', fontSize: 12 },
  sliderTrack: { height: 4, borderRadius: 2, marginTop: 12, marginBottom: 8, position: 'relative' },
  sliderFill: { position: 'absolute', top: 0, left: 0, bottom: 0, borderRadius: 2 },
  sliderThumb: { position: 'absolute', top: -8, width: 20, height: 20, borderRadius: 10, marginLeft: -10 },
  sliderBtns: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  stepBtn: { fontSize: 20, width: 32, textAlign: 'center' },
  styleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  styleTag: { borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4 },
  styleTagText: { fontFamily: 'WorkSans_500Medium', fontSize: 12 },
  editLink: { fontFamily: 'WorkSans_500Medium', fontSize: 13 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(43,39,34,0.45)', justifyContent: 'flex-end' },
  modalSheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 40, gap: 16 },
  modalTitle: { fontFamily: 'Newsreader_400Regular', fontSize: 20, marginBottom: 4 },
  clearStyle: { fontFamily: 'WorkSans_400Regular', fontSize: 13, textAlign: 'center', paddingTop: 4 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1.5, borderRadius: 24, paddingHorizontal: 14, paddingVertical: 7 },
  chipText: { fontFamily: 'WorkSans_400Regular', fontSize: 13 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stepperBtn: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  stepBtnText: { fontSize: 18 },
  stepperValue: { fontFamily: 'WorkSans_600SemiBold', fontSize: 13, minWidth: 64, textAlign: 'center' },
  timelineBtn: { marginHorizontal: 22, marginTop: 8, borderWidth: 1.5, borderRadius: 24, paddingVertical: 14, alignItems: 'center' },
  timelineBtnText: { fontFamily: 'WorkSans_500Medium', fontSize: 14 },
});
