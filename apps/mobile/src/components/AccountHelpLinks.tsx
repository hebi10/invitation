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
      const url = new URL(path, apiBaseUrl).toString();
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
      <ActionButton variant="secondary" disabled={opening} onPress={() => void openAccountPage('/signup')} accessibilityHint="브라우저에서 회원가입 페이지를 엽니다" fullWidth>회원가입</ActionButton>
      <ActionButton variant="secondary" disabled={opening} onPress={() => void openAccountPage('/forgot-password')} accessibilityHint="브라우저에서 비밀번호 재설정 페이지를 엽니다" fullWidth>비밀번호 재설정</ActionButton>
      <AppText variant="caption">브라우저에서 가입과 이메일 인증 또는 비밀번호 재설정을 마친 뒤 앱으로 돌아와 로그인해 주세요.</AppText>
    </View>
  );
}

const styles = StyleSheet.create({ container: { gap: 12 } });
