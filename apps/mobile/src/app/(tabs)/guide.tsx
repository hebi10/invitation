import { useState } from 'react';
import { Linking, StyleSheet, View } from 'react-native';

import {
  faqItems,
  guideSections,
  servicePlans,
} from '../../constants/content';
import { ActionButton } from '../../components/ActionButton';
import { AccountHelpLinks } from '../../components/AccountHelpLinks';
import { ThemePreviewGallery } from '../../components/ThemePreviewGallery';
import { AppScreen } from '../../components/AppScreen';
import { AppText } from '../../components/AppText';
import { BulletList } from '../../components/BulletList';
import { SectionCard } from '../../components/SectionCard';
import { usePreferences } from '../../contexts/PreferencesContext';
import { useAppFeedback } from '../../contexts/AppFeedbackContext';

export default function GuideScreen() {
  const { palette } = usePreferences();
  const { showToast } = useAppFeedback();
  const [showPolicies, setShowPolicies] = useState(false);

  return (
    <AppScreen
      title="가이드"
      subtitle="처음 만드는 순서부터 디자인과 이용 안내까지 확인해 보세요."
    >
      <SectionCard title={guideSections[0].title}>
        <BulletList items={guideSections[0].items} />
        <AccountHelpLinks />
      </SectionCard>
      <SectionCard title="웨딩 디자인" description="실제 청첩장의 대표 화면입니다. 미리보기에서 전체 구성을 확인해 보세요.">
        <ThemePreviewGallery />
      </SectionCard>
      <SectionCard
        title="프리미엄 청첩장"
        description="모든 웨딩 디자인과 기능을 하나의 상품으로 이용합니다."
      >
        {servicePlans.map((plan) => (
          <View
            key={plan.name}
            style={[
              styles.planCard,
              { backgroundColor: palette.surfaceMuted, borderColor: palette.cardBorder },
            ]}
          >
            <View style={styles.planHeader}>
              <AppText style={styles.planName}>{plan.name}</AppText>
              <AppText color={palette.accent} style={styles.planPrice}>
                {plan.priceLabel}
              </AppText>
            </View>
            <AppText variant="muted" style={styles.planDescription}>
              {plan.description}
            </AppText>
            <BulletList items={plan.features} />
          </View>
        ))}
      </SectionCard>

      <SectionCard title="자주 묻는 질문">
        {faqItems.map((item) => (
          <View key={item.question} style={styles.faqItem}>
            <AppText style={styles.faqQuestion}>{item.question}</AppText>
            <AppText variant="muted" style={styles.faqAnswer}>
              {item.answer}
            </AppText>
          </View>
        ))}
        <ActionButton variant="secondary" onPress={() => {
          void Linking.openURL('mailto:sevim0104@naver.com').catch(() => {
            showToast('메일 앱을 열지 못했습니다. sevim0104@naver.com으로 문의해 주세요.', { tone: 'error' });
          });
        }}>
          고객 문의
        </ActionButton>
      </SectionCard>
      <SectionCard title="이용 및 티켓 안내">
        <ActionButton variant="secondary" onPress={() => setShowPolicies(!showPolicies)} accessibilityState={{ expanded: showPolicies }}>
          {showPolicies ? '이용 안내 접기' : '이용 안내 펼치기'}
        </ActionButton>
        {showPolicies ? guideSections.slice(1).map((section) => (
          <View key={section.title} style={styles.faqItem}>
            <AppText accessibilityRole="header">{section.title}</AppText>
            <BulletList items={section.items} />
          </View>
        )) : null}
      </SectionCard>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  planCard: {
    borderRadius: 0,
    padding: 16,
    gap: 8,
  },
  planHeader: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  planName: {
    fontWeight: '500',
  },
  planPrice: {
    fontWeight: '700',
  },
  planDescription: {
    lineHeight: 21,
  },
  faqItem: {
    gap: 6,
    paddingVertical: 8,
  },
  faqQuestion: {
    fontWeight: '700',
  },
  faqAnswer: {
    lineHeight: 21,
  },
});
