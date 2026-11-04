import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { themePreviewImages } from '../constants/themePreviewImages';
import { useVisualPreferences } from '../contexts/PreferencesContext';
import {
  INVITATION_INITIAL_DISPLAY_PERIOD_MONTHS,
  INVITATION_PREMIUM_PRICE_LABEL,
} from '../lib/invitationProductPolicy';
import { AppText } from './AppText';

export function WeddingIntroHero() {
  const { palette } = useVisualPreferences();

  return (
    <View style={[styles.hero, { backgroundColor: palette.surface, borderColor: palette.cardBorder }]}>
      <AppText variant="caption" color={palette.accent} style={styles.eyebrow}>
        MODERN WEDDING EDITORIAL
      </AppText>
      <AppText variant="display" style={styles.title}>
        우리의 이야기를 담은{'\n'}모바일 청첩장
      </AppText>
      <AppText variant="muted">
        결혼식을 위한 특별한 초대장, 취향에 맞는 디자인부터 살펴보세요.
      </AppText>
      <View style={[styles.price, { backgroundColor: palette.accentSoft }]}>
        <AppText color={palette.accent} style={styles.priceLabel}>
          프리미엄 {INVITATION_PREMIUM_PRICE_LABEL} · {INVITATION_INITIAL_DISPLAY_PERIOD_MONTHS}개월
        </AppText>
        <AppText variant="caption" color={palette.accent}>5가지 디자인 모두 포함</AppText>
      </View>
      <View style={styles.previews}>
        <Image
          source={themePreviewImages.romantic}
          style={[styles.preview, { backgroundColor: palette.surfaceMuted }]}
          contentFit="cover"
          contentPosition="top"
          alt="로맨틱 청첩장 디자인 미리보기"
        />
        <Image
          source={themePreviewImages.emotional}
          style={[styles.preview, { backgroundColor: palette.surfaceMuted }]}
          contentFit="cover"
          contentPosition="top"
          alt="감성 청첩장 디자인 미리보기"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { borderWidth: 1, padding: 20, gap: 14 },
  eyebrow: { fontWeight: '600', letterSpacing: 1.4 },
  title: { fontWeight: '600' },
  price: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 10, gap: 3 },
  priceLabel: { fontWeight: '600' },
  previews: { flexDirection: 'row', gap: 10 },
  preview: { flex: 1, minWidth: 0, aspectRatio: 4 / 5 },
});
