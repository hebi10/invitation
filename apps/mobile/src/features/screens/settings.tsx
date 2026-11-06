import Constants from 'expo-constants';
import { Linking, StyleSheet, View } from 'react-native';

import { ActionButton } from '../../components/ActionButton';
import { AppScreen } from '../../components/AppScreen';
import { AppText } from '../../components/AppText';
import { BulletList } from '../../components/BulletList';
import { ChoiceChip } from '../../components/ChoiceChip';
import { Disclosure } from '../../components/Disclosure';
import { SectionCard } from '../../components/SectionCard';
import { guideSections, settingsNotes } from '../../constants/content';
import {
  INVITATION_INITIAL_DISPLAY_PERIOD_MONTHS,
  INVITATION_PREMIUM_PRICE_LABEL,
} from '../../lib/invitationProductPolicy';
import { APP_SPACING } from '../../constants/uiTokens';
import { useAppFeedback } from '../../contexts/AppFeedbackContext';
import { usePreferences } from '../../contexts/PreferencesContext';

const UPDATE_GUIDE_ITEMS = [
  '청첩장 본문이나 샘플 페이지 수정은 웹 배포만으로 반영될 수 있습니다.',
  '구매, 운영, 설정 같은 앱 화면 변경은 최신 앱 버전 설치가 필요합니다.',
  '새 기능이 보이지 않거나 오류가 계속되면 앱을 완전히 종료한 뒤 최신 버전으로 다시 실행해 주세요.',
] as const;

function normalizeVersionLabel(value: unknown) {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }

  return null;
}

export default function SettingsScreen() {
  const { showToast } = useAppFeedback();
  const {
    apiBaseUrl,
    palette,
    fontScalePreference,
    setFontScalePreference,
    setThemePreference,
    themePreference,
  } = usePreferences();

  const openHelpLink = (path: string) => {
    const href = path.startsWith('mailto:') ? path : new URL(path, apiBaseUrl).toString();
    void Linking.openURL(href).catch(() => {
      showToast('안내 페이지를 열지 못했습니다. 연결 상태를 확인하고 다시 시도해 주세요.', { tone: 'error' });
    });
  };

  const appVersion =
    normalizeVersionLabel(Constants.expoConfig?.version) ||
    normalizeVersionLabel(Constants.nativeAppVersion) ||
    '확인 불가';
  const buildVersion =
    normalizeVersionLabel(Constants.nativeBuildVersion) || '개발 빌드';

  const themeLabel = themePreference === 'system'
    ? '시스템 설정에 맞춰 적용'
    : themePreference === 'light' ? '라이트 모드 사용 중' : '다크 모드 사용 중';
  const fontScaleLabel = fontScalePreference === 'normal'
    ? '기본 글자 크기 사용 중' : '큰 글자 크기 사용 중';

  return (
    <AppScreen
      title="설정"
      subtitle="이 기기의 화면 설정과 앱 정보를 확인하세요."
    >
      <SectionCard
        title="화면 설정"
        description="선택한 테마와 글자 크기를 즉시 적용합니다."
      >
        <View style={[styles.settingGroup, styles.settingSurface, { backgroundColor: palette.surfaceMuted, borderColor: palette.cardBorder }]}>
          <AppText variant="caption" accessibilityRole="header" style={styles.settingLabel}>
            화면 테마
          </AppText>
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
          <AppText variant="caption" color={palette.textMuted} accessibilityLiveRegion="polite">
            {themeLabel}
          </AppText>
          <AppText variant="caption" color={palette.textMuted}>
            시스템은 휴대전화의 밝기 설정을 따라갑니다.
          </AppText>
        </View>

        <View style={[styles.settingGroup, styles.settingSurface, { backgroundColor: palette.surfaceMuted, borderColor: palette.cardBorder }]}>
          <AppText variant="caption" accessibilityRole="header" style={styles.settingLabel}>
            글자 크기
          </AppText>
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
          <AppText variant="caption" color={palette.textMuted} accessibilityLiveRegion="polite">
            {fontScaleLabel}
          </AppText>
          <AppText variant="caption" color={palette.textMuted}>
            큰 글씨를 선택하면 주요 화면과 입력창의 글자가 확대됩니다.
          </AppText>
        </View>
      </SectionCard>

      <SectionCard
        title="이용 안내"
        description="처음 만들기부터 기간 연장까지 궁금한 항목을 선택해 확인하세요."
      >
        <View style={[styles.productSummary, { backgroundColor: palette.surfaceMuted, borderColor: palette.cardBorder }]}>
          <AppText variant="caption" color={palette.textMuted}>프리미엄 청첩장 · 단일 상품</AppText>
          <View style={styles.priceRow}>
            <AppText variant="cardTitle">{INVITATION_PREMIUM_PRICE_LABEL}</AppText>
            <AppText variant="caption" color={palette.textMuted}>
              생성일부터 {INVITATION_INITIAL_DISPLAY_PERIOD_MONTHS}개월
            </AppText>
          </View>
          <AppText variant="caption" color={palette.textMuted}>
            웨딩 디자인 5종 · 결제 후 비공개 초안 생성 · 연장도 5,000원에 6개월
          </AppText>
        </View>
        {guideSections.map((section) => (
          <Disclosure key={section.title} title={section.title} description={section.description}>
            <BulletList items={section.items} />
          </Disclosure>
        ))}
      </SectionCard>

      <SectionCard title="앱 정보" description="현재 설치된 앱의 버전과 업데이트 안내입니다.">
        <View style={[styles.versionInfo, { backgroundColor: palette.surfaceMuted }]}>
          <View style={styles.versionRow}>
            <AppText variant="caption" color={palette.textMuted}>현재 버전</AppText>
            <AppText style={styles.versionValue}>{appVersion}</AppText>
          </View>
          <View style={styles.versionRow}>
            <AppText variant="caption" color={palette.textMuted}>빌드 번호</AppText>
            <AppText style={styles.versionValue}>{buildVersion}</AppText>
          </View>
        </View>
        <Disclosure
          title="업데이트 안내"
          description="새 기능이 보이지 않거나 오류가 계속될 때"
        >
          <BulletList items={UPDATE_GUIDE_ITEMS} />
        </Disclosure>
      </SectionCard>

      <SectionCard title="기기 이용 안내">
        <BulletList items={settingsNotes} />
      </SectionCard>

      <SectionCard title="문의·개인정보" description="문의 및 개인정보 처리에 관한 안내입니다.">
        <ActionButton variant="secondary" onPress={() => openHelpLink('mailto:sevim0104@naver.com')} fullWidth>
          고객 문의
        </ActionButton>
        <ActionButton variant="secondary" onPress={() => openHelpLink('/privacy/mobile-invitation/')} fullWidth>
          개인정보 처리방침
        </ActionButton>
        <ActionButton variant="secondary" onPress={() => openHelpLink('/privacy/mobile-invitation/delete-request/')} fullWidth>
          계정 및 데이터 삭제 요청
        </ActionButton>
      </SectionCard>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  settingGroup: { gap: APP_SPACING.sm },
  settingSurface: { borderWidth: 1, borderRadius: 0, padding: APP_SPACING.md },
  productSummary: { borderWidth: 1, borderRadius: 0, padding: APP_SPACING.md, gap: APP_SPACING.sm },
  priceRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'baseline', justifyContent: 'space-between', gap: APP_SPACING.xs },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: APP_SPACING.xs,
  },
  settingLabel: {
    fontWeight: '600',
  },
  versionInfo: {
    padding: APP_SPACING.md,
    gap: APP_SPACING.sm,
  },
  versionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: APP_SPACING.xs,
  },
  versionValue: {
    fontWeight: '600',
    flexShrink: 1,
  },
});
