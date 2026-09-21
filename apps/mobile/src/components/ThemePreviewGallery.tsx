import { Image } from 'expo-image';
import * as WebBrowser from 'expo-web-browser';
import { Linking, Platform, ScrollView, StyleSheet, View } from 'react-native';

import simplePreview from '../../assets/theme-previews/simple.png';
import modernPreview from '../../assets/theme-previews/classic-r.png';
import photoPreview from '../../assets/theme-previews/romantic.png';
import classicPreview from '../../assets/theme-previews/gyeol.png';
import naturalPreview from '../../assets/theme-previews/emotional.png';

import { designThemes, findGuideSamplePageUrl } from '../constants/content';
import { useAppFeedback } from '../contexts/AppFeedbackContext';
import { useVisualPreferences } from '../contexts/PreferencesContext';
import type { MobileInvitationProductTier } from '../types/mobileInvitation';
import { ActionButton } from './ActionButton';
import { AppText } from './AppText';

// 실제 샘플 청첩장의 표지를 캡처한 번들 이미지입니다.
const previewImages: Record<string, number> = {
  simple: simplePreview,
  'classic-r': modernPreview,
  romantic: photoPreview,
  gyeol: classicPreview,
  emotional: naturalPreview,
};

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
      <AppText variant="muted">옆으로 넘겨 디자인을 비교해 보세요. 모든 웨딩 디자인을 함께 사용할 수 있습니다.</AppText>
      <ScrollView horizontal showsHorizontalScrollIndicator contentContainerStyle={styles.gallery}>
        {designThemes.map((theme) => {
          const url = findGuideSamplePageUrl(theme.key, tier);
          return (
            <View key={theme.key} style={styles.item}>
              <Image source={previewImages[theme.key]} style={[styles.image, { backgroundColor: palette.surfaceMuted }]}
                contentFit="cover" contentPosition="top" alt={`${theme.label} 실제 청첩장 표지 예시`} />
              <AppText accessibilityRole="header" style={styles.title}>{theme.label}</AppText>
              <AppText variant="muted" style={styles.description}>{theme.description}</AppText>
              <ActionButton variant="secondary" fullWidth disabled={!url}
                accessibilityLabel={`${theme.label} ${tier.toUpperCase()} 샘플 열기`}
                onPress={() => url ? void openPreview(url) : undefined}>
                미리보기
              </ActionButton>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: 16 },
  gallery: { gap: 16, paddingBottom: 12, alignItems: 'stretch' },
  item: { width: 176, gap: 12 },
  image: { width: '100%', aspectRatio: 372 / 660 },
  title: { fontWeight: '500' },
  description: { flexGrow: 1 },
});
