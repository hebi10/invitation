import { StyleSheet, Text, View } from 'react-native';

import { settingsNotes } from '../../constants/content';
import { AppScreen } from '../../components/AppScreen';
import { ChoiceChip } from '../../components/ChoiceChip';
import { SectionCard } from '../../components/SectionCard';
import { useAppState } from '../../contexts/AppStateContext';

export default function SettingsScreen() {
  const {
    fontScalePreference,
    palette,
    fontScale,
    setFontScalePreference,
    setThemePreference,
    themePreference,
  } = useAppState();

  return (
    <AppScreen
      title="설정"
      subtitle="라이트/다크 모드와 글자 크기를 현재 기기 기준으로 바로 반영합니다."
    >
      <SectionCard
        title="화면 설정"
        description="변경 즉시 모바일 앱 전체 화면에 반영됩니다."
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
