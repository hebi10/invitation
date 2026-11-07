import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import portraitImage from '../../assets/editorial/wedding-portrait.webp';
import bouquetImage from '../../assets/editorial/wedding-bouquet.webp';
import { useVisualPreferences } from '../contexts/PreferencesContext';
import { AppText } from './AppText';

export function WeddingIntroHero() {
  const { palette } = useVisualPreferences();

  return (
    <View style={[styles.hero, { backgroundColor: palette.surface, borderColor: palette.cardBorder }]}>
      <View style={styles.previews}>
        <Image
          source={portraitImage}
          style={[styles.preview, { backgroundColor: palette.surfaceMuted }]}
          contentFit="cover"
          contentPosition="top"
          alt="웨딩 화보 속 신랑과 신부 사진"
        />
        <Image
          source={bouquetImage}
          style={[styles.preview, { backgroundColor: palette.surfaceMuted }]}
          contentFit="cover"
          contentPosition="top"
          alt="아이보리 꽃다발을 든 신부 사진"
        />
      </View>
      <View style={styles.copy}>
        <AppText variant="caption" color={palette.textMuted} style={styles.eyebrow}>
          MODERN WEDDING EDITORIAL
        </AppText>
        <AppText variant="display" style={styles.title}>
          우리의 이야기를 담은 청첩장
        </AppText>
        <AppText variant="muted">
          사진과 이야기로 소중한 날을 전해 보세요.
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
  preview: { flex: 1, minWidth: 0, aspectRatio: 1 },
});
