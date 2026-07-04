import { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
} from "react-native";
import { useRouter, Href } from "expo-router";
import { useTheme } from "@/lib/theme";
import { supabase } from "@/lib/supabase";
import type { Routine, Section, Cue } from "@dancer-hub/shared";

type RoutineRow = Routine & { sections: Section[]; cues: Cue[] };

function fmtDur(s: number) {
  return `${Math.floor(s / 60)}:${(Math.round(s) % 60).toString().padStart(2, "0")}`;
}

export default function LibraryScreen() {
  const { palette } = useTheme();
  const router = useRouter();
  const [routines, setRoutines] = useState<RoutineRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const { data } = await supabase
          .from("routines")
          .select("*, sections(*), cues(*)")
          .order("created_at", { ascending: false });
        console.log(data);
        setRoutines((data as RoutineRow[]) ?? []);
        setLoading(false);
      } catch (error) {
        console.error(error);
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: palette.paper }]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.overline, { color: palette.accent }]}>
            YOUR STUDIO
          </Text>
          <Text style={[styles.title, { color: palette.ink }]}>Routines</Text>
        </View>

        {loading ? (
          <ActivityIndicator color={palette.accent} style={{ marginTop: 40 }} />
        ) : routines.length === 0 ? (
          <Text style={[styles.empty, { color: "#a79f92" }]}>
            No routines yet.
          </Text>
        ) : (
          routines.map((r, i) => (
            <TouchableOpacity
              key={r.id}
              style={[
                styles.row,
                i < routines.length - 1 && {
                  borderBottomColor: "rgba(43,39,34,0.09)",
                  borderBottomWidth: 1,
                },
              ]}
              onPress={() => router.push({ pathname: '/(tabs)/player', params: { id: r.id } } as any)}
              activeOpacity={0.7}
            >
              <View style={styles.thumb}>
                <HatchView />
              </View>

              <View style={styles.rowInfo}>
                <Text style={[styles.routineName, { color: palette.ink }]}>
                  {r.name}
                </Text>
                <Text style={[styles.routineMeta, { color: "#8f887d" }]}>
                  {r.style ?? "No style"} · {fmtDur(r.duration_sec)}
                </Text>
                {r.cues.length > 0 ? (
                  <Text style={[styles.routineCues, { color: palette.accent }]}>
                    {r.cues.length} cues · {r.sections.length} sections
                  </Text>
                ) : (
                  <Text style={[styles.routineDraft, { color: "#a79f92" }]}>
                    Draft — no cues yet
                  </Text>
                )}
              </View>

              <Text style={[styles.chevron, { color: "#b8b1a4" }]}>›</Text>
            </TouchableOpacity>
          ))
        )}

        {/* New routine button */}
        <TouchableOpacity
          style={[styles.newBtn, { borderColor: palette.ink }]}
          onPress={() => router.push("/import" as Href)}
          activeOpacity={0.7}
        >
          <Text style={[styles.newBtnText, { color: palette.ink }]}>
            ＋ New routine
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function HatchView() {
  return (
    <View style={styles.hatch}>
      {Array.from({ length: 8 }).map((_, i) => (
        <View
          key={i}
          style={[
            styles.hatchLine,
            { top: i * 10 - 20, left: -10, transform: [{ rotate: "45deg" }] },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { paddingBottom: 40 },
  header: { paddingHorizontal: 22, paddingTop: 20, paddingBottom: 16 },
  overline: {
    fontFamily: "WorkSans_500Medium",
    fontSize: 11,
    letterSpacing: 1.4,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  title: {
    fontFamily: "Newsreader_400Regular",
    fontSize: 30,
  },
  empty: {
    fontFamily: "Newsreader_400Regular_Italic",
    fontSize: 16,
    textAlign: "center",
    marginTop: 40,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 22,
    paddingVertical: 14,
    minHeight: 44,
  },
  thumb: {
    width: 56,
    height: 56,
    borderRadius: 8,
    backgroundColor: "#e2dccf",
    overflow: "hidden",
    marginRight: 14,
  },
  hatch: { flex: 1, overflow: "hidden", position: "relative" },
  hatchLine: {
    position: "absolute",
    width: 100,
    height: 1,
    backgroundColor: "#ddd7ca",
  },
  rowInfo: { flex: 1 },
  routineName: {
    fontFamily: "Newsreader_400Regular",
    fontSize: 17,
    marginBottom: 2,
  },
  routineMeta: {
    fontFamily: "WorkSans_400Regular",
    fontSize: 12,
    marginBottom: 2,
  },
  routineCues: {
    fontFamily: "WorkSans_400Regular",
    fontSize: 12,
  },
  routineDraft: {
    fontFamily: "Newsreader_400Regular_Italic",
    fontSize: 12,
  },
  chevron: {
    fontSize: 22,
    marginLeft: 8,
  },
  newBtn: {
    marginHorizontal: 22,
    marginTop: 24,
    borderWidth: 1.5,
    borderRadius: 24,
    paddingVertical: 14,
    alignItems: "center",
  },
  newBtnText: {
    fontFamily: "WorkSans_500Medium",
    fontSize: 14,
  },
});
