import { Image } from 'expo-image';
import * as WebBrowser from 'expo-web-browser';
import { Linking, Platform, ScrollView, StyleSheet, View } from 'react-native';

import { designThemes, findGuideSamplePageUrl } from '../constants/content';
import { themePreviewImages } from '../constants/themePreviewImages';
import { useAppFeedback } from '../contexts/AppFeedbackContext';
import { useVisualPreferences } from '../contexts/PreferencesContext';
import type { MobileInvitationProductTier } from '../types/mobileInvitation';
import { ActionButton } from './ActionButton';
import { AppText } from './AppText';

export function ThemePreviewGallery({ tier = 'premium' }: { tier?: MobileInvitationProductTier }) {
  const { palette } = useVisualPreferences();
  const { showToast } = useAppFeedback();

  const openPreview = async (url: string) => {
    try {
      if (Platform.OS === 'web') {
        await Linking.openURL(url);
      } else {
        await WebBrowser.openBrowserAsync(url, { controlsColor: palette.accent });
      }
    } catch {
      showToast('샘플을 열지 못했습니다. 연결 상태를 확인하고 다시 시도해 주세요.', { tone: 'error' });
    }
  };

  return (
    <View style={styles.wrapper}>
      <AppText variant="muted">
        모든 디자인이 프리미엄 상품에 포함됩니다. 옆으로 넘겨 비교해 보세요.
      </AppText>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        accessibilityLabel="청첩장 디자인 미리보기"
        contentContainerStyle={styles.gallery}
      >
        {designThemes.map((theme) => {
          const url = findGuideSamplePageUrl(theme.key, tier);
          const preview = themePreviewImages[theme.key];
          return (
            <View
              key={theme.key}
              style={[styles.item, { borderColor: palette.cardBorder, backgroundColor: palette.surface }]}
            >
              {preview ? (
                <Image
                  source={preview}
                  style={[styles.image, { backgroundColor: palette.surfaceMuted }]}
                  contentFit="cover"
                  contentPosition="top"
                  alt={`${theme.label} 실제 청첩장 표지 미리보기`}
                />
              ) : (
                <View style={[styles.image, styles.textPreview, { backgroundColor: palette.surfaceMuted }]}>
                  <AppText variant="title">{theme.label}</AppText>
                </View>
              )}
              <View style={styles.copy}>
                <AppText accessibilityRole="header" style={styles.title}>{theme.label}</AppText>
                <AppText variant="muted" style={styles.description}>{theme.description}</AppText>
                <ActionButton
                  variant="secondary"
                  fullWidth
                  disabled={!url}
                  accessibilityLabel={`${theme.label} 프리미엄 샘플 열기`}
                  onPress={() => url ? void openPreview(url) : undefined}
                >
                  샘플 보기
                </ActionButton>
              </View>
            </View>
          );
        })}
      </ScrollView>
      <AppText variant="caption" color={palette.textMuted}>
        디자인을 누르면 실제 샘플 청첩장을 확인할 수 있습니다.
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: 12 },
  gallery: { gap: 12, paddingBottom: 4, alignItems: 'stretch' },
  item: { width: 190, borderWidth: 1, gap: 0 },
  image: { width: '100%', aspectRatio: 390 / 720 },
  textPreview: { justifyContent: 'center', alignItems: 'center', padding: 16 },
  copy: { padding: 12, gap: 9, flex: 1 },
  title: { fontWeight: '600' },
  description: { flexGrow: 1 },
});
