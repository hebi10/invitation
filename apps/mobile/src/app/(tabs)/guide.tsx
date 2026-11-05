import { Linking, StyleSheet, View } from 'react-native';

import { AccountHelpLinks } from '../../components/AccountHelpLinks';
import { ActionButton } from '../../components/ActionButton';
import { AppScreen } from '../../components/AppScreen';
import { AppText } from '../../components/AppText';
import { BulletList } from '../../components/BulletList';
import { Disclosure } from '../../components/Disclosure';
import { SectionCard } from '../../components/SectionCard';
import { guideSections, servicePlans } from '../../constants/content';
import { APP_SPACING } from '../../constants/uiTokens';
import { useAppFeedback } from '../../contexts/AppFeedbackContext';
import { usePreferences } from '../../contexts/PreferencesContext';
import { INVITATION_INITIAL_DISPLAY_PERIOD_MONTHS } from '../../lib/invitationProductPolicy';

export default function GuideScreen() {
  const { apiBaseUrl, palette } = usePreferences();
  const { showToast } = useAppFeedback();
  const plan = servicePlans[0];

  const openHelpLink = (path: string) => {
    void Linking.openURL(new URL(path, apiBaseUrl).toString()).catch(() => {
      showToast('안내 페이지를 열지 못했습니다. 연결 상태를 확인하고 다시 시도해 주세요.', { tone: 'error' });
    });
  };

  return (
    <AppScreen title="이용 안내" subtitle="진행할 작업을 선택해 필요한 안내를 확인하세요.">
      <SectionCard
        title="프리미엄 청첩장"
        description="청첩장 제작과 이용 기간에 관한 기본 정보입니다."
        badge="5종 디자인 포함"
        badgeTone="neutral"
      >
        <View style={[styles.planSummary, { backgroundColor: palette.surfaceMuted }]}>
          <AppText variant="display" style={styles.planPrice}>{plan.priceLabel}</AppText>
          <AppText variant="caption" color={palette.textMuted}>
            생성일부터 기본 {INVITATION_INITIAL_DISPLAY_PERIOD_MONTHS}개월 이용
          </AppText>
        </View>
        <AppText variant="muted">{plan.description}</AppText>
        <AppText variant="caption" color={palette.textMuted}>
          만들기 화면에서 실제 웨딩 디자인을 확인할 수 있습니다.
        </AppText>
      </SectionCard>

      <View style={styles.list}>
        {guideSections.map((section, index) => (
          <Disclosure key={section.title} title={section.title} description={section.description}>
            <BulletList items={section.items} />
            {index === 0 ? <AccountHelpLinks /> : null}
          </Disclosure>
        ))}
      </View>

      <SectionCard
        title="문의·개인정보"
        description="결제 문의, 개인정보 처리방침과 데이터 삭제 요청을 확인할 수 있습니다."
      >
        <ActionButton
          variant="secondary"
          onPress={() => {
            void Linking.openURL('mailto:sevim0104@naver.com').catch(() => {
              showToast('메일 앱을 열지 못했습니다. sevim0104@naver.com으로 문의해 주세요.', { tone: 'error' });
            });
          }}
          fullWidth
        >
          고객 문의
        </ActionButton>
        <AppText variant="caption" color={palette.textMuted} selectable>
          sevim0104@naver.com
        </AppText>
        <ActionButton variant="secondary" onPress={() => openHelpLink('/privacy/mobile-invitation/')} fullWidth>
          개인정보 처리방침
        </ActionButton>
        <ActionButton
          variant="secondary"
          onPress={() => openHelpLink('/privacy/mobile-invitation/delete-request/')}
          fullWidth
        >
          계정 및 데이터 삭제 요청
        </ActionButton>
      </SectionCard>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  list: { gap: APP_SPACING.sm },
  planSummary: { padding: APP_SPACING.md, gap: APP_SPACING.xs },
  planPrice: { fontWeight: '600' },
});
