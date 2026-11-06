import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { ActionButton } from '../../../components/ActionButton';
import { AppScreen } from '../../../components/AppScreen';
import { AppText } from '../../../components/AppText';
import { SectionCard } from '../../../components/SectionCard';
import { useVisualPreferences } from '../../../contexts/PreferencesContext';
import { INVITATION_INITIAL_DISPLAY_PERIOD_MONTHS } from '../../../lib/invitationProductPolicy';

type CreationCompletedViewProps = {
  onStartEditing: () => void;
};

export function CreationCompletedView({ onStartEditing }: CreationCompletedViewProps) {
  const { palette } = useVisualPreferences();

  return (
    <AppScreen
      title="제작 시작"
      subtitle="결제 완료 → 비공개 초안 → 정보 입력"
    >
      <View
        style={[styles.successPanel, {
          backgroundColor: palette.surface,
          borderColor: palette.cardBorder,
        }]}
      >
        <Ionicons
          name="checkmark-circle-outline"
          size={48}
          color={palette.success}
          accessibilityLabel="결제 확인 완료"
        />
        <AppText variant="display" accessibilityRole="header" style={styles.successTitle}>
          결제가 완료되었습니다
        </AppText>
        <AppText variant="muted" style={styles.successDescription}>
          {INVITATION_INITIAL_DISPLAY_PERIOD_MONTHS}개월 이용 가능한 비공개 청첩장이 준비되었습니다.
        </AppText>
      </View>
      <SectionCard title="새 청첩장 초안" badge="비공개" badgeTone="neutral">
        <View style={styles.summaryRow}>
          <AppText variant="muted">사용 가능한 디자인</AppText>
          <AppText>웨딩 디자인 5종</AppText>
        </View>
        <View style={styles.summaryRow}>
          <AppText variant="muted">이용 기간</AppText>
          <AppText>생성일부터 {INVITATION_INITIAL_DISPLAY_PERIOD_MONTHS}개월</AppText>
        </View>
        <AppText variant="caption" color={palette.textMuted}>
          아직 하객에게 공개되지 않았습니다. 내용을 작성하고 미리본 뒤 공개 여부를 설정할 수 있습니다.
        </AppText>
      </SectionCard>
      <SectionCard title="이제 청첩장을 완성해 주세요">
        <View style={styles.stepsRow}>
          {['1 기본 정보', '2 예식 일정', '3 예식 장소'].map((step) => (
            <View
              key={step}
              style={[styles.step, { backgroundColor: palette.surfaceMuted }]}
            >
              <AppText variant="caption" color={palette.textMuted}>{step}</AppText>
            </View>
          ))}
        </View>
        <AppText variant="muted">
          인사말·사진·음악·공개 설정까지 전체 7단계로 내용을 입력합니다.
        </AppText>
        <ActionButton fullWidth onPress={onStartEditing}>
          마이페이지에서 편집 시작
        </ActionButton>
        <AppText variant="caption" color={palette.textMuted}>
          지금 입력하지 않아도 마이페이지에서 이어서 편집할 수 있습니다.
        </AppText>
      </SectionCard>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  successPanel: {
    borderWidth: 1,
    borderRadius: 0,
    alignItems: 'center',
    padding: 24,
    gap: 12,
  },
  successTitle: { textAlign: 'center', fontWeight: '700' },
  successDescription: { textAlign: 'center' },
  summaryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  stepsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  step: { paddingVertical: 8, paddingHorizontal: 10, borderRadius: 0 },
});
