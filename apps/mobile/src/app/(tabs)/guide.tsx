import { Linking, StyleSheet, View } from 'react-native';

import { guideSections, servicePlans } from '../../constants/content';
import { ActionButton } from '../../components/ActionButton';
import { AccountHelpLinks } from '../../components/AccountHelpLinks';
import { AppScreen } from '../../components/AppScreen';
import { AppText } from '../../components/AppText';
import { BulletList } from '../../components/BulletList';
import { Disclosure } from '../../components/Disclosure';
import { usePreferences } from '../../contexts/PreferencesContext';
import { useAppFeedback } from '../../contexts/AppFeedbackContext';

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
      <View style={styles.list}>
        {guideSections.map((section, index) => (
          <Disclosure key={section.title} title={section.title} description={section.description}>
            <BulletList items={section.items} />
            {index === 0 ? (
              <>
                <View style={[styles.planSummary, { borderColor: palette.cardBorder }]}>
                  <View style={styles.planHeader}>
                    <AppText style={styles.planName}>프리미엄 청첩장</AppText>
                    <AppText style={styles.planPrice}>{plan.priceLabel} · 기본 4개월</AppText>
                  </View>
                  <AppText variant="muted">{plan.description}</AppText>
                  <AppText variant="caption">모든 웨딩 디자인이 포함됩니다. 만들기의 디자인 확인 단계에서 샘플을 볼 수 있습니다.</AppText>
                </View>
                <AccountHelpLinks />
              </>
            ) : null}
            {index === guideSections.length - 1 ? (
              <>
                <ActionButton variant="secondary" onPress={() => {
                  void Linking.openURL('mailto:sevim0104@naver.com').catch(() => {
                    showToast('메일 앱을 열지 못했습니다. sevim0104@naver.com으로 문의해 주세요.', { tone: 'error' });
                  });
                }} fullWidth>
                  고객 문의
                </ActionButton>
                <AppText variant="caption">sevim0104@naver.com</AppText>
                <ActionButton variant="secondary" onPress={() => openHelpLink('/privacy/mobile-invitation/')} fullWidth>
                  개인정보 처리방침
                </ActionButton>
                <ActionButton variant="secondary" onPress={() => openHelpLink('/privacy/mobile-invitation/delete-request/')} fullWidth>
                  계정 및 데이터 삭제 요청
                </ActionButton>
              </>
            ) : null}
          </Disclosure>
        ))}
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  list: { gap: 12 },
  planSummary: { borderTopWidth: 1, paddingTop: 16, gap: 8 },
  planHeader: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 8 },
  planName: { fontWeight: '600' },
  planPrice: { fontWeight: '600' },
});
