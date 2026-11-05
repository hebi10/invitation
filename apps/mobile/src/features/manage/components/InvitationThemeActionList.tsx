import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { ActionButton } from '../../../components/ActionButton';
import { AppText } from '../../../components/AppText';
import { themePreviewImages } from '../../../constants/themePreviewImages';
import { useVisualPreferences } from '../../../contexts/PreferencesContext';
import { getInvitationThemeLabel } from '../../../lib/invitationThemes';
import type { MobileInvitationThemeKey } from '../../../types/mobileInvitation';

type InvitationThemeActionListProps = {
  themes: readonly MobileInvitationThemeKey[];
  currentTheme?: MobileInvitationThemeKey;
  action: 'preview' | 'share';
  busy?: boolean;
  onSelect: (theme: MobileInvitationThemeKey) => void;
};

export function InvitationThemeActionList({
  themes,
  currentTheme,
  action,
  busy = false,
  onSelect,
}: InvitationThemeActionListProps) {
  const { palette } = useVisualPreferences();
  return (
    <View style={styles.list}>
      <AppText variant="muted">
        아래 이미지는 디자인 샘플입니다. 실제 청첩장 내용은 미리보기 또는 공유 시 반영됩니다.
      </AppText>
      {themes.map((theme) => {
        const isCurrentTheme = currentTheme === theme;
        return (
        <View
          key={theme}
          style={[
            styles.item,
            {
              backgroundColor: isCurrentTheme ? palette.accentSoft : palette.surface,
              borderColor: isCurrentTheme ? palette.accent : palette.cardBorder,
            },
          ]}
        >
          <Image
            source={themePreviewImages[theme] ?? themePreviewImages.romantic}
            style={[styles.thumbnail, { backgroundColor: palette.surfaceMuted }]}
            contentFit="contain"
            contentPosition="top"
            alt={`${getInvitationThemeLabel(theme)} 디자인 샘플 이미지`}
          />
          <View style={styles.details}>
            <AppText variant="title" style={styles.name}>
              {getInvitationThemeLabel(theme)}
            </AppText>
            {isCurrentTheme ? (
              <AppText variant="caption" color={palette.accent}>현재 기본 디자인</AppText>
            ) : null}
            <ActionButton
              variant={isCurrentTheme ? 'primary' : 'secondary'}
              fullWidth
              disabled={busy}
              onPress={() => onSelect(theme)}
              accessibilityLabel={`${getInvitationThemeLabel(theme)} ${action === 'preview' ? '미리보기 열기' : '카카오톡 카드 공유'}`}
            >
              {action === 'preview' ? '미리보기' : '카카오톡 공유'}
            </ActionButton>
          </View>
        </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: 12 },
  item: {
    borderWidth: 1,
    borderRadius: 0,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  thumbnail: { width: 86, height: 116 },
  details: { flex: 1, minWidth: 0, justifyContent: 'center', gap: 8 },
  name: { fontWeight: '600' },
});
