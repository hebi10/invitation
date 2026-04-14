import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { ActionButton } from '../../components/ActionButton';
import { AppScreen } from '../../components/AppScreen';
import { ChoiceChip } from '../../components/ChoiceChip';
import { SectionCard } from '../../components/SectionCard';
import { TextField } from '../../components/TextField';
import { useAppState } from '../../contexts/AppStateContext';
import { settingsNotes } from '../../constants/content';

export default function SettingsScreen() {
  const {
    apiBaseUrl,
    authError,
    clearAuthError,
    fontScalePreference,
    isAuthenticated,
    logout,
    pageSummary,
    palette,
    fontScale,
    setApiBaseUrl,
    setFontScalePreference,
    setThemePreference,
    themePreference,
  } = useAppState();
  const [apiBaseUrlInput, setApiBaseUrlInput] = useState(apiBaseUrl);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    setApiBaseUrlInput(apiBaseUrl);
  }, [apiBaseUrl]);

  const handleSaveApiBaseUrl = async () => {
    clearAuthError();
    await setApiBaseUrl(apiBaseUrlInput);
    setNotice('API 주소를 저장했습니다. 주소가 바뀐 경우 기존 로그인 세션은 초기화됩니다.');
  };

  return (
    <AppScreen
      title="설정"
      subtitle="라이트/다크 모드, 글자 크기, API 주소, 자동 로그인 상태를 관리합니다."
    >
      <SectionCard
        title="화면 설정"
        description="변경 즉시 모바일 탭 화면에 반영됩니다."
      >
        <Text style={[styles.settingLabel, { color: palette.text, fontSize: 14 * fontScale }]}>
          테마
        </Text>
        <View style={styles.chipRow}>
          <ChoiceChip
            label="시스템"
            selected={themePreference === 'system'}
            onPress={() => void setThemePreference('system')}
          />
          <ChoiceChip
            label="라이트"
            selected={themePreference === 'light'}
            onPress={() => void setThemePreference('light')}
          />
          <ChoiceChip
            label="다크"
            selected={themePreference === 'dark'}
            onPress={() => void setThemePreference('dark')}
          />
        </View>

        <Text style={[styles.settingLabel, { color: palette.text, fontSize: 14 * fontScale }]}>
          글자 크기
        </Text>
        <View style={styles.chipRow}>
          <ChoiceChip
            label="기본"
            selected={fontScalePreference === 'normal'}
            onPress={() => void setFontScalePreference('normal')}
          />
          <ChoiceChip
            label="크게"
            selected={fontScalePreference === 'large'}
            onPress={() => void setFontScalePreference('large')}
          />
        </View>
      </SectionCard>

      <SectionCard
        title="서버 주소"
        description="기본은 운영 주소이며, 필요하면 로컬/개발 서버 주소로 바꿔서 테스트할 수 있습니다."
      >
        <TextField
          label="API Base URL"
          value={apiBaseUrlInput}
          onChangeText={setApiBaseUrlInput}
          placeholder="예: https://msgnote.kr"
          autoCapitalize="none"
        />
        {notice ? (
          <Text style={[styles.noticeText, { color: palette.accent, fontSize: 13 * fontScale }]}>
            {notice}
          </Text>
        ) : null}
        {authError ? (
          <Text style={[styles.noticeText, { color: palette.danger, fontSize: 13 * fontScale }]}>
            {authError}
          </Text>
        ) : null}
        <ActionButton onPress={() => void handleSaveApiBaseUrl()} fullWidth>
          API 주소 저장
        </ActionButton>
      </SectionCard>

      <SectionCard
        title="계정과 자동 로그인"
        description="현재 연결된 페이지와 자동 로그인 상태를 확인합니다."
        badge={isAuthenticated ? '로그인됨' : '로그아웃'}
      >
        <Text style={[styles.accountText, { color: palette.text, fontSize: 14 * fontScale }]}>
          연결된 페이지: {pageSummary?.slug ?? '없음'}
        </Text>
        <Text style={[styles.accountText, { color: palette.textMuted, fontSize: 13 * fontScale }]}>
          서비스: {pageSummary ? pageSummary.productTier.toUpperCase() : '-'}
        </Text>
        <ActionButton variant="danger" onPress={() => void logout()} fullWidth>
          자동 로그인 초기화
        </ActionButton>
      </SectionCard>

      <SectionCard title="안내">
        {settingsNotes.map((note) => (
          <Text key={note} style={[styles.accountText, { color: palette.textMuted, fontSize: 14 * fontScale }]}>
            • {note}
          </Text>
        ))}
      </SectionCard>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  settingLabel: {
    fontWeight: '700',
  },
  noticeText: {
    lineHeight: 20,
  },
  accountText: {
    lineHeight: 20,
  },
});
