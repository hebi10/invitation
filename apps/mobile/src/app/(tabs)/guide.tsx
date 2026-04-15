import { Alert, Linking, StyleSheet, Text, View } from 'react-native';
import * as WebBrowser from 'expo-web-browser';

import { ActionButton } from '../../components/ActionButton';
import { AppScreen } from '../../components/AppScreen';
import { BulletList } from '../../components/BulletList';
import { SectionCard } from '../../components/SectionCard';
import { useAppState } from '../../contexts/AppStateContext';
import {
  faqItems,
  guideSamplePages,
  guideSections,
  servicePlans,
} from '../../constants/content';

export default function GuideScreen() {
  const { palette, fontScale } = useAppState();

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
        // Fall back to the platform browser when the in-app browser is unavailable.
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
      subtitle="서비스 비교, 제작 순서, 운영 정책, 자주 묻는 질문을 한 번에 볼 수 있도록 정리했습니다."
    >
      <SectionCard
        title="서비스 등급 비교"
        description="결제 전에 STANDARD, DELUXE, PREMIUM 차이를 빠르게 확인해 보세요."
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
              <Text style={[styles.planName, { color: palette.text, fontSize: 16 * fontScale }]}>
                {plan.name}
              </Text>
              <Text style={[styles.planPrice, { color: palette.accent, fontSize: 15 * fontScale }]}>
                {plan.priceLabel}
              </Text>
            </View>
            <Text
              style={[
                styles.planDescription,
                { color: palette.textMuted, fontSize: 14 * fontScale },
              ]}
            >
              {plan.description}
            </Text>
            <BulletList items={plan.features} />
          </View>
        ))}
      </SectionCard>

      <SectionCard
        title="샘플 페이지"
        description="앱에서 서비스 등급별 웹 샘플 페이지를 바로 열어볼 수 있습니다."
      >
        {guideSamplePages.map((group) => (
          <View key={group.title} style={styles.sampleGroup}>
            <Text style={[styles.sampleGroupTitle, { color: palette.text, fontSize: 16 * fontScale }]}>
              {group.title}
            </Text>
            {group.items.map((item) => (
              <View
                key={item.url}
                style={[
                  styles.sampleCard,
                  { backgroundColor: palette.surfaceMuted, borderColor: palette.cardBorder },
                ]}
              >
                <View style={styles.sampleCopy}>
                  <Text style={[styles.sampleLabel, { color: palette.text, fontSize: 14 * fontScale }]}>
                    {item.label}
                  </Text>
                  <Text style={[styles.sampleUrl, { color: palette.textMuted, fontSize: 12 * fontScale }]}>
                    {item.url}
                  </Text>
                </View>
                <ActionButton
                  variant="secondary"
                  onPress={() => void handleOpenSample(item.url)}
                  style={styles.actionButton}
                >
                  웹으로 보기
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
            <Text style={[styles.faqQuestion, { color: palette.text, fontSize: 15 * fontScale }]}>
              {item.question}
            </Text>
            <Text style={[styles.faqAnswer, { color: palette.textMuted, fontSize: 14 * fontScale }]}>
              {item.answer}
            </Text>
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
