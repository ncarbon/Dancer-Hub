import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function RootLayout() {
  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: '#fff' },
          headerTintColor: '#9333ea',
          headerTitleStyle: { fontWeight: '700' },
        }}
      >
        <Stack.Screen name="index" options={{ title: 'Dancer Hub' }} />
        <Stack.Screen name="upload" options={{ title: 'Upload Track' }} />
        <Stack.Screen name="tracks/[id]" options={{ title: 'Track' }} />
      </Stack>
    </>
  );
}
