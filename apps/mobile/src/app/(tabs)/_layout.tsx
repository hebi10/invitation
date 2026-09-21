import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { usePreferences } from '../../contexts/PreferencesContext';

export default function TabsLayout() {
  const { palette, fontScale } = usePreferences();
  const insets = useSafeAreaInsets();

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
          borderTopWidth: 0,
          elevation: 0,
          boxShadow: 'none',
          height: 76 + insets.bottom + 18 * (fontScale - 1),
          paddingBottom: Math.max(insets.bottom, 8),
          paddingTop: 8,
        },
        tabBarHideOnKeyboard: true,
        tabBarActiveTintColor: palette.accent,
        tabBarInactiveTintColor: palette.textMuted,
        tabBarLabelStyle: {
          fontSize: 12 * fontScale,
          lineHeight: 18 * fontScale,
          flexShrink: 0,
          fontWeight: '500',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: '홈',
          tabBarLabel: '홈',
          tabBarAccessibilityLabel: '홈 탭으로 이동',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'home' : 'home-outline'} color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="guide"
        options={{
          title: '가이드',
          tabBarLabel: '가이드',
          tabBarAccessibilityLabel: '가이드 탭으로 이동',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'book' : 'book-outline'} color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="create"
        options={{
          title: '구매',
          tabBarLabel: '구매',
          tabBarAccessibilityLabel: '구매 탭으로 이동',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'card' : 'card-outline'} color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="manage"
        options={{
          title: '운영',
          tabBarLabel: '운영',
          tabBarAccessibilityLabel: '운영 탭으로 이동',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? 'construct' : 'construct-outline'}
              color={color}
              size={size}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: '설정',
          tabBarLabel: '설정',
          tabBarAccessibilityLabel: '설정 탭으로 이동',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? 'settings' : 'settings-outline'}
              color={color}
              size={size}
            />
          ),
        }}
      />
    </Tabs>
  );
}
