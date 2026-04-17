import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AppErrorBoundary } from '../components/AppErrorBoundary';
import { resolveAppColorScheme } from '../constants/theme';
import { AppStateProvider } from '../contexts/AppStateContext';
import { usePreferences } from '../contexts/PreferencesContext';
import { useAppDeepLinkHandler } from '../hooks/useAppDeepLinkHandler';

function AppNavigator() {
  const { themePreference } = usePreferences();
  const systemColorScheme = useColorScheme();
  const colorScheme = resolveAppColorScheme(systemColorScheme, themePreference);

  useAppDeepLinkHandler();

  return (
    <>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="+not-found" />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AppErrorBoundary>
        <AppStateProvider>
          <AppNavigator />
        </AppStateProvider>
      </AppErrorBoundary>
    </SafeAreaProvider>
  );
}
