import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import portraitImage from '../../assets/editorial/wedding-portrait.webp';
import bouquetImage from '../../assets/editorial/wedding-bouquet.webp';
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
      <View style={styles.copy}>
        <AppText variant="caption" color={palette.textMuted} style={styles.eyebrow}>
          MODERN WEDDING EDITORIAL
        </AppText>
        <AppText variant="display" style={styles.title}>
          우리의 이야기를 담은{'\n'}모바일 청첩장
        </AppText>
        <AppText variant="muted">
          소중한 결혼식의 순간을 사진과 이야기로 전하는 초대장을 준비하세요.
        </AppText>
      </View>
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
      <View style={[styles.plan, { backgroundColor: palette.surfaceMuted }]}>
        <AppText style={styles.planTitle}>
          프리미엄 {INVITATION_PREMIUM_PRICE_LABEL}
        </AppText>
        <AppText variant="caption" color={palette.textMuted}>
          기본 {INVITATION_INITIAL_DISPLAY_PERIOD_MONTHS}개월 · 웨딩 디자인 5종 모두 포함
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    borderWidth: 1,
    borderRadius: 0,
    padding: 20,
    gap: 16,
  },
  copy: { gap: 10 },
  eyebrow: { fontWeight: '600', letterSpacing: 0.6 },
  title: { fontWeight: '600' },
  previews: { flexDirection: 'row', gap: 10 },
  preview: { flex: 1, minWidth: 0, aspectRatio: 4 / 5 },
  plan: { paddingHorizontal: 14, paddingVertical: 12, gap: 4 },
  planTitle: { fontWeight: '600' },
});
