import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, SafeAreaView,
} from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useTheme } from '@/lib/theme';
import { useStore } from '@/lib/rehearseStore';

export default function PrepScreen() {
  const { palette } = useTheme();
  const { state, dispatch } = useStore();

  const total = state.tasks.length;
  const done = state.tasks.filter(t => t.done).length;
  const pct = total > 0 ? done / total : 0;

  const summaryLabel =
    pct === 1 ? 'Stage-ready!' :
    pct >= 0.7 ? 'Almost stage-ready' :
    pct >= 0.4 ? 'Getting there' :
    'Just getting started';

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: palette.paper }]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.overline, { color: palette.accent }]}>PERFORMANCE DAY</Text>
          <Text style={[styles.title, { color: palette.ink }]}>Spring Showcase</Text>
          <View style={styles.metaRow}>
            <View style={[styles.metaChip, { borderColor: 'rgba(43,39,34,0.14)' }]}>
              <Text style={[styles.metaChipText, { color: palette.ink }]}>Call 6:30 PM</Text>
            </View>
            <Text style={[styles.metaIn, { color: '#8f887d' }]}>in 2 days</Text>
          </View>
        </View>

        {/* Progress ring */}
        <View style={styles.ringRow}>
          <ProgressRing pct={pct} accent={palette.accent} ink={palette.ink} done={done} total={total} />
          <View style={styles.ringSummary}>
            <Text style={[styles.summaryLabel, { color: palette.ink }]}>{summaryLabel}</Text>
            <Text style={[styles.summaryMeta, { color: '#8f887d' }]}>
              {done} of {total} tasks complete
            </Text>
          </View>
        </View>

        {/* Checklist */}
        <View style={styles.checklist}>
          {state.tasks.map((task, i) => (
            <TouchableOpacity
              key={task.id}
              style={[
                styles.taskRow,
                i < state.tasks.length - 1 && { borderBottomColor: 'rgba(43,39,34,0.09)', borderBottomWidth: 1 },
              ]}
              onPress={() => dispatch({ type: 'TOGGLE_TASK', id: task.id })}
              activeOpacity={0.7}
            >
              <View style={[
                styles.checkbox,
                {
                  backgroundColor: task.done ? palette.accent : 'transparent',
                  borderColor: task.done ? palette.accent : 'rgba(43,39,34,0.25)',
                },
              ]}>
                {task.done && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <View style={styles.taskContent}>
                <Text style={[
                  styles.taskLabel,
                  { color: task.done ? '#8f887d' : palette.ink },
                  task.done && styles.taskDone,
                ]}>
                  {task.label}
                </Text>
                {task.progress && !task.done && (
                  <View style={styles.miniProgressRow}>
                    <View style={[styles.miniTrack, { backgroundColor: 'rgba(43,39,34,0.10)' }]}>
                      <View
                        style={[
                          styles.miniFill,
                          {
                            width: `${(task.progress.current / task.progress.total) * 100}%`,
                            backgroundColor: palette.accent,
                          },
                        ]}
                      />
                    </View>
                    <Text style={[styles.miniLabel, { color: '#8f887d' }]}>
                      {task.progress.current}/{task.progress.total}
                    </Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function ProgressRing({
  pct, accent, ink, done, total,
}: { pct: number; accent: string; ink: string; done: number; total: number }) {
  const SIZE = 88;
  const STROKE = 7;
  const R = (SIZE - STROKE) / 2;
  const CIRCUM = 2 * Math.PI * R;
  const dash = pct * CIRCUM;

  return (
    <View style={styles.ring}>
      <Svg width={SIZE} height={SIZE}>
        {/* Track */}
        <Circle
          cx={SIZE / 2} cy={SIZE / 2} r={R}
          stroke="rgba(43,39,34,0.12)"
          strokeWidth={STROKE}
          fill="none"
        />
        {/* Progress */}
        <Circle
          cx={SIZE / 2} cy={SIZE / 2} r={R}
          stroke={accent}
          strokeWidth={STROKE}
          fill="none"
          strokeDasharray={`${dash} ${CIRCUM - dash}`}
          strokeDashoffset={CIRCUM / 4}
          strokeLinecap="round"
        />
      </Svg>
      <View style={[styles.ringCenter, { width: SIZE, height: SIZE }]}>
        <Text style={[styles.ringCount, { color: ink }]}>{done}/{total}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { paddingBottom: 40 },
  header: { paddingHorizontal: 22, paddingTop: 20, paddingBottom: 16 },
  overline: {
    fontFamily: 'WorkSans_500Medium',
    fontSize: 11,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  title: {
    fontFamily: 'Newsreader_400Regular',
    fontSize: 30,
    marginBottom: 12,
  },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  metaChip: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  metaChipText: {
    fontFamily: 'WorkSans_400Regular',
    fontSize: 13,
  },
  metaIn: {
    fontFamily: 'Newsreader_400Regular_Italic',
    fontSize: 13,
  },
  ringRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 22,
    marginBottom: 24,
    gap: 20,
  },
  ring: { position: 'relative' },
  ringCenter: {
    position: 'absolute',
    top: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringCount: {
    fontFamily: 'Newsreader_400Regular',
    fontSize: 19,
  },
  ringSummary: { flex: 1 },
  summaryLabel: {
    fontFamily: 'Newsreader_400Regular',
    fontSize: 18,
    marginBottom: 4,
  },
  summaryMeta: {
    fontFamily: 'WorkSans_400Regular',
    fontSize: 13,
  },
  checklist: {
    marginHorizontal: 22,
    backgroundColor: '#faf8f4',
    borderRadius: 12,
    shadowColor: '#5a5042',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 1,
    overflow: 'hidden',
  },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 14,
    minHeight: 44,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    marginTop: 1,
  },
  checkmark: { color: '#fff', fontSize: 12, fontWeight: '700' },
  taskContent: { flex: 1 },
  taskLabel: {
    fontFamily: 'WorkSans_400Regular',
    fontSize: 14,
    lineHeight: 20,
  },
  taskDone: { textDecorationLine: 'line-through' },
  miniProgressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  miniTrack: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  miniFill: {
    height: '100%',
    borderRadius: 2,
  },
  miniLabel: {
    fontFamily: 'WorkSans_500Medium',
    fontSize: 11,
  },
});
