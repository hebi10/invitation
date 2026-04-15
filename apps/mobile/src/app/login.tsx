import { Redirect, type Href, useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { useState } from 'react';

import { AppScreen } from '../components/AppScreen';
import { AppText } from '../components/AppText';
import { LoginCard } from '../components/LoginCard';
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
  const { isAuthenticated, isBootstrapping, login, clearAuthError, palette } = useAppState();
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
        subtitle="저장된 자동 연동 세션을 확인하고 있습니다."
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <ActivityIndicator color={palette.accent} />
          <AppText variant="muted">자동 연동 상태를 확인하는 중입니다.</AppText>
        </View>
      </AppScreen>
    );
  }

  if (isAuthenticated) {
    return <Redirect href={nextPath} />;
  }

  return (
    <AppScreen
      title="페이지 연동"
      subtitle="페이지 URL 또는 슬러그와 비밀번호로 로그인하면 운영 탭과 설정 탭을 사용할 수 있습니다."
    >
      <LoginCard
        pageIdentifier={pageIdentifier}
        password={password}
        onChangePageIdentifier={setPageIdentifier}
        onChangePassword={setPassword}
        onSubmit={handleLogin}
      />
    </AppScreen>
  );
}
