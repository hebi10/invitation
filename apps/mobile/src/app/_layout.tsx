import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { AppStateProvider, useAppState } from '../contexts/AppStateContext';

function AppNavigator() {
  const { palette } = useAppState();

  return (
    <>
      <StatusBar style={palette.background === '#141210' ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="+not-found" />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <AppStateProvider>
      <AppNavigator />
    </AppStateProvider>
  );
}
