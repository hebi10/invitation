import { Tabs } from 'expo-router';

import { useAppState } from '../../contexts/AppStateContext';

export default function TabsLayout() {
  const { palette, fontScale } = useAppState();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        headerStyle: {
          backgroundColor: palette.background,
        },
        headerShadowVisible: false,
        headerTintColor: palette.text,
        sceneStyle: {
          backgroundColor: palette.background,
        },
        tabBarStyle: {
          backgroundColor: palette.surface,
          borderTopColor: palette.cardBorder,
          height: 68,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarActiveTintColor: palette.accent,
        tabBarInactiveTintColor: palette.textMuted,
        tabBarLabelStyle: {
          fontSize: 12 * fontScale,
          fontWeight: '700',
        },
        tabBarIconStyle: {
          display: 'none',
        },
      }}
    >
      <Tabs.Screen name="index" options={{ title: '홈', tabBarLabel: '홈' }} />
      <Tabs.Screen name="guide" options={{ title: '가이드', tabBarLabel: '가이드' }} />
      <Tabs.Screen name="create" options={{ title: '구매', tabBarLabel: '구매' }} />
      <Tabs.Screen name="manage" options={{ title: '관리', tabBarLabel: '관리' }} />
      <Tabs.Screen name="settings" options={{ title: '설정', tabBarLabel: '설정' }} />
    </Tabs>
  );
}
