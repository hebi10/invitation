import { Redirect, usePathname } from 'expo-router';
import { ActivityIndicator, Platform, View } from 'react-native';
import type { PropsWithChildren } from 'react';

import { useAppState } from '../contexts/AppStateContext';
import { AppText } from './AppText';

export function ProtectedTabRoute({ children }: PropsWithChildren) {
  const pathname = usePathname();
  const { isAuthenticated, isBootstrapping, palette } = useAppState();
  const isExpoWebPreview = Platform.OS === 'web';

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
