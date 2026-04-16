import { useRouter } from 'expo-router';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { settingsNotes } from '../../constants/content';
import { ActionButton } from '../../components/ActionButton';
import { AppScreen } from '../../components/AppScreen';
import { ChoiceChip } from '../../components/ChoiceChip';
import { SectionCard } from '../../components/SectionCard';
import { useAppState } from '../../contexts/AppStateContext';

export default function SettingsScreen() {
  const router = useRouter();
  const {
    fontScalePreference,
    logout,
    pageSummary,
    palette,
    fontScale,
    setFontScalePreference,
    setThemePreference,
    themePreference,
  } = useAppState();

  const handleLogout = async () => {
    await logout();
    router.replace('/');
  };

  const handleConfirmLogout = () => {
    Alert.alert(
      '페이지 연동 초기화',
      '현재 연동 세션을 초기화할까요? 다시 사용하려면 청첩장 슬러그와 비밀번호로 다시 로그인해야 합니다.',
      [
        {
          text: '취소',
          style: 'cancel',
        },
        {
          text: '초기화',
          style: 'destructive',
          onPress: () => {
            void handleLogout();
          },
        },
      ],
      { cancelable: true }
    );
  };

  return (
    <AppScreen
      title="설정"
      subtitle="라이트·다크 모드, 글자 크기, 현재 연동 상태를 관리합니다."
    >
      <SectionCard
        title="화면 설정"
        description="변경 즉시 모바일 화면 전체에 반영됩니다."
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
        title="청첩장 연동 상태"
        description="현재 연결된 페이지와 서비스 등급을 확인합니다."
        badge={pageSummary ? '연동됨' : '연동 대기 중'}
      >
        <Text style={[styles.accountText, { color: palette.text, fontSize: 14 * fontScale }]}>
          연결된 페이지: {pageSummary?.slug ?? '없음'}
        </Text>
        <Text
          style={[styles.accountText, { color: palette.textMuted, fontSize: 13 * fontScale }]}
        >
          서비스: {pageSummary ? pageSummary.productTier.toUpperCase() : '-'}
        </Text>
        <ActionButton variant="danger" onPress={handleConfirmLogout} fullWidth>
          페이지 연동 초기화
        </ActionButton>
      </SectionCard>

      <SectionCard title="안내">
        {settingsNotes.map((note) => (
          <Text
            key={note}
            style={[styles.accountText, { color: palette.textMuted, fontSize: 14 * fontScale }]}
          >
            · {note}
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
  accountText: {
    lineHeight: 20,
  },
});
