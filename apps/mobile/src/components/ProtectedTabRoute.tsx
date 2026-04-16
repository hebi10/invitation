import { Redirect, usePathname } from 'expo-router';
import type { PropsWithChildren } from 'react';
import { ActivityIndicator, Platform, View } from 'react-native';

import { useAuth } from '../contexts/AuthContext';
import { usePreferences } from '../contexts/PreferencesContext';
import { AppText } from './AppText';

export function ProtectedTabRoute({ children }: PropsWithChildren) {
  const pathname = usePathname();
  const { isAuthenticated, isReady: isAuthReady } = useAuth();
  const { isReady: isPreferencesReady, palette } = usePreferences();
  const isExpoWebPreview = Platform.OS === 'web';
  const isBootstrapping = !(isAuthReady && isPreferencesReady);

  if (isBootstrapping) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          gap: 12,
          backgroundColor: palette.background,
          paddingHorizontal: 24,
        }}
      >
        <ActivityIndicator color={palette.accent} />
        <AppText variant="muted">자동 연동 상태를 확인하는 중입니다.</AppText>
      </View>
    );
  }

  if (isExpoWebPreview || !isAuthenticated) {
    return <Redirect href={{ pathname: '/login', params: { next: pathname } }} />;
  }

  return children;
}
