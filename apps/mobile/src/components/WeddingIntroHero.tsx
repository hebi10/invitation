import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { themePreviewImages } from '../constants/themePreviewImages';
import { useVisualPreferences } from '../contexts/PreferencesContext';
import { AppText } from './AppText';

export function WeddingIntroHero() {
  const { palette } = useVisualPreferences();

  return (
    <View style={[styles.hero, { backgroundColor: palette.surface, borderColor: palette.cardBorder }]}>
      <View style={styles.previews}>
        <Image
          source={themePreviewImages.simple}
          style={[styles.preview, { backgroundColor: palette.surfaceMuted }]}
          contentFit="cover"
          contentPosition="center"
          alt="신민제·김현지 기본형 청첩장 공개 샘플 이미지"
        />
        <Image
          source={themePreviewImages.romantic}
          style={[styles.preview, { backgroundColor: palette.surfaceMuted }]}
          contentFit="cover"
          contentPosition="bottom"
          alt="신민제·김현지 포토형 청첩장 공개 샘플 이미지"
        />
      </View>
      <View style={styles.copy}>
        <AppText variant="caption" color={palette.textMuted} style={styles.eyebrow}>
          신민제·김현지 공개 샘플
        </AppText>
        <AppText variant="display" style={styles.title}>
          우리의 이야기를 담은 청첩장
        </AppText>
        <AppText variant="muted">
          실제 공개 청첩장 화면으로 5가지 디자인을 비교해 보세요.
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    borderWidth: 1,
    borderRadius: 0,
    padding: 0,
    gap: 0,
  },
  copy: { gap: 8, padding: 16 },
  eyebrow: { fontWeight: '600', letterSpacing: 0.6 },
  title: { fontWeight: '700' },
  previews: { flexDirection: 'row', gap: 0 },
  preview: { flex: 1, minWidth: 0, aspectRatio: 3 / 4 },
});
