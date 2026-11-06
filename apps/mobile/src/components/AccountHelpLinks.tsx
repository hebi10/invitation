import { useState } from 'react';
import * as WebBrowser from 'expo-web-browser';
import { Alert, Linking, StyleSheet, View } from 'react-native';

import { usePreferences } from '../contexts/PreferencesContext';
import { ActionButton } from './ActionButton';
import { AppText } from './AppText';

export function AccountHelpLinks() {
  const { apiBaseUrl, palette } = usePreferences();
  const [opening, setOpening] = useState(false);

  const openAccountPage = async (path: '/signup' | '/forgot-password') => {
    if (opening) return;
    setOpening(true);
    try {
      const accountUrl = new URL(path, apiBaseUrl);
      accountUrl.searchParams.set('from', 'mobile');
      const url = accountUrl.toString();
      try {
        await WebBrowser.openBrowserAsync(url, { controlsColor: palette.accent, createTask: true });
      } catch {
        if (!await Linking.canOpenURL(url)) throw new Error('unsupported-url');
        await Linking.openURL(url);
      }
    } catch {
      Alert.alert('계정 페이지를 열지 못했습니다', '네트워크 연결을 확인하고 다시 시도해 주세요.');
    } finally {
      setOpening(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.actions}>
        <ActionButton
          variant="secondary"
          disabled={opening}
          onPress={() => void openAccountPage('/signup')}
          accessibilityHint="브라우저에서 회원가입 페이지를 엽니다"
          style={styles.action}
        >
          회원가입
        </ActionButton>
        <ActionButton
          variant="secondary"
          disabled={opening}
          onPress={() => void openAccountPage('/forgot-password')}
          accessibilityHint="브라우저에서 비밀번호 재설정 페이지를 엽니다"
          style={styles.action}
        >
          비밀번호 재설정
        </ActionButton>
      </View>
      <AppText variant="caption" color={palette.textMuted}>
        회원가입·비밀번호 재설정은 브라우저에서 진행합니다. 이메일 인증까지 마친 후 앱으로 돌아와 로그인해 주세요.
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 10 },
  actions: { flexDirection: 'row', gap: 8 },
  action: { flex: 1, minWidth: 0, paddingHorizontal: 8 },
});
