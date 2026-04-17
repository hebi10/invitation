import Constants from 'expo-constants';
import { StyleSheet, View } from 'react-native';

import { AppScreen } from '../../components/AppScreen';
import { AppText } from '../../components/AppText';
import { ChoiceChip } from '../../components/ChoiceChip';
import { SectionCard } from '../../components/SectionCard';
import { settingsNotes } from '../../constants/content';
import { usePreferences } from '../../contexts/PreferencesContext';

const UPDATE_GUIDE_ITEMS = [
  '청첩장 본문이나 샘플 페이지 수정은 웹 배포만으로 반영될 수 있습니다.',
  '구매, 운영, 설정 같은 앱 화면 변경은 최신 앱 버전 설치가 필요합니다.',
  '새 기능이 보이지 않거나 오류가 계속되면 앱을 완전히 종료한 뒤 최신 버전으로 다시 실행해 주세요.',
] as const;

function normalizeVersionLabel(value: unknown) {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }

  return null;
}

export default function SettingsScreen() {
  const {
    fontScalePreference,
    setFontScalePreference,
    setThemePreference,
    themePreference,
  } = usePreferences();

  const appVersion =
    normalizeVersionLabel(Constants.expoConfig?.version) ||
    normalizeVersionLabel(Constants.nativeAppVersion) ||
    '확인 불가';
  const buildVersion =
    normalizeVersionLabel(Constants.nativeBuildVersion) || '개발 빌드';

  return (
    <AppScreen
      title="설정"
      subtitle="라이트·다크 모드와 글자 크기를 현재 기기 기준으로 바로 반영합니다."
    >
      <SectionCard
        title="화면 설정"
        description="변경 즉시 모바일 앱 전체 화면에 반영됩니다."
      >
        <AppText variant="caption" style={styles.settingLabel}>
          테마
        </AppText>
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

        <AppText variant="caption" style={styles.settingLabel}>
          글자 크기
        </AppText>
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
        title="앱 업데이트 안내"
        description="새 기능이 반영되지 않거나 같은 오류가 계속되면 현재 앱 버전부터 확인해 주세요."
        badge={`v${appVersion}`}
        badgeTone="notice"
      >
        <View style={styles.versionRow}>
          <View style={styles.versionItem}>
            <AppText variant="caption" style={styles.settingLabel}>
              현재 버전
            </AppText>
            <AppText>{appVersion}</AppText>
          </View>
          <View style={styles.versionItem}>
            <AppText variant="caption" style={styles.settingLabel}>
              빌드 번호
            </AppText>
            <AppText>{buildVersion}</AppText>
          </View>
        </View>

        {UPDATE_GUIDE_ITEMS.map((note) => (
          <AppText key={note} variant="muted" style={styles.accountText}>
            · {note}
          </AppText>
        ))}
      </SectionCard>

      <SectionCard title="안내">
        {settingsNotes.map((note) => (
          <AppText key={note} variant="muted" style={styles.accountText}>
            · {note}
          </AppText>
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
  versionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  versionItem: {
    flex: 1,
    minWidth: 120,
    gap: 4,
  },
  accountText: {
    lineHeight: 20,
  },
});
