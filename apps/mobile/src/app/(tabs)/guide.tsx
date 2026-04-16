import * as WebBrowser from 'expo-web-browser';
import { Alert, Linking, StyleSheet, View } from 'react-native';

import {
  faqItems,
  guideSamplePages,
  guideSections,
  servicePlans,
} from '../../constants/content';
import { ActionButton } from '../../components/ActionButton';
import { AppScreen } from '../../components/AppScreen';
import { AppText } from '../../components/AppText';
import { BulletList } from '../../components/BulletList';
import { SectionCard } from '../../components/SectionCard';
import { usePreferences } from '../../contexts/PreferencesContext';

export default function GuideScreen() {
  const { palette } = usePreferences();

  const handleOpenSample = async (url: string) => {
    try {
      try {
        await WebBrowser.openBrowserAsync(url, {
          enableDefaultShareMenuItem: true,
          controlsColor: palette.accent,
          createTask: true,
        });
        return;
      } catch {
        // 인앱 브라우저를 사용할 수 없으면 기본 브라우저로 대체합니다.
      }

      const supported = await Linking.canOpenURL(url);
      if (!supported) {
        throw new Error('unsupported-url');
      }

      await Linking.openURL(url);
    } catch {
      Alert.alert('샘플 페이지를 열지 못했습니다.', '잠시 후 다시 시도해 주세요.');
    }
  };

  return (
    <AppScreen
      title="가이드"
      subtitle="서비스 비교, 시작 순서, 운영 팁과 자주 묻는 질문을 한 번에 확인할 수 있도록 정리했습니다."
    >
      <SectionCard
        title="서비스 상품 비교"
        description="생성 전에 STANDARD, DELUXE, PREMIUM 차이를 빠르게 확인해 보세요."
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

      <SectionCard
        title="샘플 페이지"
        description="서비스와 디자인별 샘플 페이지를 바로 열어서 미리 볼 수 있습니다."
      >
        {guideSamplePages.map((group) => (
          <View key={group.title} style={styles.sampleGroup}>
            <AppText style={styles.sampleGroupTitle}>{group.title}</AppText>
            {group.items.map((item) => (
              <View
                key={item.url}
                style={[
                  styles.sampleCard,
                  { backgroundColor: palette.surfaceMuted, borderColor: palette.cardBorder },
                ]}
              >
                <View style={styles.sampleCopy}>
                  <AppText style={styles.sampleLabel}>{item.label}</AppText>
                  <AppText variant="caption" style={styles.sampleUrl}>
                    {item.url}
                  </AppText>
                </View>
                <ActionButton
                  variant="secondary"
                  onPress={() => void handleOpenSample(item.url)}
                  style={styles.actionButton}
                >
                  미리보기
                </ActionButton>
              </View>
            ))}
          </View>
        ))}
      </SectionCard>

      {guideSections.map((section) => (
        <SectionCard key={section.title} title={section.title}>
          <BulletList items={section.items} />
        </SectionCard>
      ))}

      <SectionCard title="자주 묻는 질문">
        {faqItems.map((item) => (
          <View key={item.question} style={styles.faqItem}>
            <AppText style={styles.faqQuestion}>{item.question}</AppText>
            <AppText variant="muted" style={styles.faqAnswer}>
              {item.answer}
            </AppText>
          </View>
        ))}
      </SectionCard>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  planCard: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
    gap: 8,
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  planName: {
    fontWeight: '800',
  },
  planPrice: {
    fontWeight: '800',
  },
  planDescription: {
    lineHeight: 21,
  },
  sampleGroup: {
    gap: 10,
  },
  sampleGroupTitle: {
    fontWeight: '800',
  },
  sampleCard: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
    gap: 10,
  },
  sampleCopy: {
    gap: 6,
  },
  sampleLabel: {
    fontWeight: '700',
  },
  sampleUrl: {
    lineHeight: 18,
  },
  actionButton: {
    alignSelf: 'flex-start',
  },
  faqItem: {
    gap: 6,
  },
  faqQuestion: {
    fontWeight: '700',
  },
  faqAnswer: {
    lineHeight: 21,
  },
});
