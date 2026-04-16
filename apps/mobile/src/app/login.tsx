import { Redirect, type Href, useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, Platform, StyleSheet, View } from 'react-native';
import { useState } from 'react';

import { ActionButton } from '../components/ActionButton';
import { AppScreen } from '../components/AppScreen';
import { AppText } from '../components/AppText';
import { LoginCard } from '../components/LoginCard';
import { WebPreviewNotice } from '../components/WebPreviewNotice';
import { useAppState } from '../contexts/AppStateContext';

function resolveNextPath(value: string | string[] | undefined): Href {
  const next = Array.isArray(value) ? value[0] : value;
  if (typeof next !== 'string' || !next.trim().startsWith('/')) {
    return '/manage';
  }

  return next.trim() as Href;
}

export default function LoginScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ next?: string | string[] }>();
  const nextPath = resolveNextPath(params.next);
  const { isAuthenticated, isBootstrapping, login, clearAuthError, palette } =
    useAppState();
  const isExpoWebPreview = Platform.OS === 'web';
  const [pageIdentifier, setPageIdentifier] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async () => {
    clearAuthError();
    const authenticated = await login(pageIdentifier, password);
    if (!authenticated) {
      return;
    }

    setPassword('');
    router.replace(nextPath);
  };

  if (isBootstrapping) {
    return (
      <AppScreen
        title="페이지 연동"
        subtitle="저장된 자동 로그인 상태와 운영 권한을 확인하고 있습니다."
      >
        <View style={styles.loadingRow}>
          <ActivityIndicator color={palette.accent} />
          <AppText variant="muted">자동 로그인 상태를 확인하는 중입니다.</AppText>
        </View>
      </AppScreen>
    );
  }

  if (isExpoWebPreview) {
    return (
      <AppScreen
        title="웹 미리보기"
        subtitle="Expo 웹 빌드에서는 실제 로그인과 운영 편집 기능이 제한됩니다."
        contentContainerStyle={styles.screenContent}
      >
        <WebPreviewNotice />
        <ActionButton
          variant="secondary"
          onPress={() => router.replace('/')}
          fullWidth
          style={styles.bottomAction}
        >
          메인 화면으로 이동
        </ActionButton>
      </AppScreen>
    );
  }

  if (isAuthenticated) {
    return <Redirect href={nextPath} />;
  }

  return (
    <AppScreen
      title="페이지 연동"
      subtitle="페이지 URL 또는 슬러그와 비밀번호로 로그인하면 운영과 설정 화면을 바로 사용할 수 있습니다."
      contentContainerStyle={styles.screenContent}
    >
      <LoginCard
        pageIdentifier={pageIdentifier}
        password={password}
        onChangePageIdentifier={setPageIdentifier}
        onChangePassword={setPassword}
        onSubmit={handleLogin}
      />
      <ActionButton
        variant="secondary"
        onPress={() => router.replace('/')}
        fullWidth
        style={styles.bottomAction}
      >
        메인 화면으로 이동
      </ActionButton>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  screenContent: {
    flexGrow: 1,
  },
  bottomAction: {
    marginTop: 'auto',
  },
});
