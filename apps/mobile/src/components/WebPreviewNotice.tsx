import { StyleSheet, View } from 'react-native';

import { useVisualPreferences } from '../contexts/PreferencesContext';

import { AppText } from './AppText';

type WebPreviewNoticeProps = {
  title?: string;
  description?: string;
};

export function WebPreviewNotice({
  title = '웹 미리보기',
  description = '화면과 제작 초안을 확인할 수 있습니다. 결제와 청첩장 운영은 앱에서 이용해 주세요.',
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
      <AppText variant="caption" color={palette.notice} style={styles.description}>
        {description}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  notice: {
    borderWidth: 1,
    borderRadius: 0,
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
