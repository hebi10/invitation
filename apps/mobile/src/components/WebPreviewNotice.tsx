import { StyleSheet, View } from 'react-native';

import { useVisualPreferences } from '../contexts/PreferencesContext';

import { AppText } from './AppText';

type WebPreviewNoticeProps = {
  title?: string;
  description?: string;
};

export function WebPreviewNotice({
  title = '웹 미리보기',
  description = '결제와 보안 저장소는 앱 빌드에서 최종 확인해 주세요.',
}: WebPreviewNoticeProps) {
  const { palette } = useVisualPreferences();

  return (
    <View
      style={[
        styles.notice,
        {
          backgroundColor: palette.noticeSoft,
          borderColor: palette.cardBorder,
        },
      ]}
    >
      <AppText variant="caption" color={palette.notice} style={styles.title}>
        {title}
      </AppText>
      <AppText variant="caption" color={palette.textMuted} style={styles.description}>
        {description}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  notice: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 2,
  },
  title: {
    fontWeight: '700',
  },
  description: {
    lineHeight: 18,
  },
});
