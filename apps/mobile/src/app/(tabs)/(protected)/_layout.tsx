import { Redirect, Slot, usePathname } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';

import { AppText } from '../../../components/AppText';
import { useAppState } from '../../../contexts/AppStateContext';

export default function ProtectedTabsLayout() {
  const pathname = usePathname();
  const { isAuthenticated, isBootstrapping, palette } = useAppState();

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

  if (!isAuthenticated) {
    return <Redirect href={{ pathname: '/login', params: { next: pathname } }} />;
  }

  return <Slot />;
}
