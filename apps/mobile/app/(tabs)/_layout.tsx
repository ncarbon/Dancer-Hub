import { Tabs } from 'expo-router';
import { Text, StyleSheet } from 'react-native';
import { useTheme } from '@/lib/theme';

function TabIcon({ label, focused }: { label: string; focused: boolean }) {
  const { palette } = useTheme();
  const icons: Record<string, string> = {
    Library: '♪',
    Practice: '▶',
    Prep: '✓',
  };
  return (
    <Text style={[styles.icon, { color: focused ? palette.accent : '#8f887d' }]}>
      {icons[label] ?? label[0]}
    </Text>
  );
}

export default function TabsLayout() {
  const { palette } = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: palette.paper,
          borderTopColor: 'rgba(43,39,34,0.10)',
          borderTopWidth: 1,
        },
        tabBarActiveTintColor: palette.accent,
        tabBarInactiveTintColor: '#8f887d',
        tabBarLabelStyle: {
          fontFamily: 'WorkSans_500Medium',
          fontSize: 11,
          letterSpacing: 0.5,
        },
      }}
    >
      <Tabs.Screen
        name="library"
        options={{
          title: 'Library',
          tabBarIcon: ({ focused }) => <TabIcon label="Library" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="player"
        options={{
          title: 'Practice',
          tabBarIcon: ({ focused }) => <TabIcon label="Practice" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="prep"
        options={{
          title: 'Prep',
          tabBarIcon: ({ focused }) => <TabIcon label="Prep" focused={focused} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  icon: { fontSize: 18 },
});
