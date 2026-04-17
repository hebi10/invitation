import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { getPalette } from '../../../constants/theme';
import { ActionButton } from '../../../components/ActionButton';
import { AppText } from '../../../components/AppText';
import { BulletList } from '../../../components/BulletList';
import { ChoiceChip } from '../../../components/ChoiceChip';
import { formatPrice } from '../../../lib/format';

type TicketTargetOption = {
  slug: string;
  displayName: string;
};

type TicketOnlyPurchaseModalProps = {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
  loading: boolean;
  authError: string | null;
  notice: string;
  palette: ReturnType<typeof getPalette>;
  ticketCount: number;
  discountedBundleCount: number;
  remainderTicketCount: number;
  ticketPrice: number;
  ticketUsageItems: readonly string[];
  targetOptions: TicketTargetOption[];
  selectedTargetSlug: string | null;
  selectedTargetLabel: string;
  currentStoredTicketCount: number;
  onSelectTarget: (slug: string) => void;
};

export function TicketOnlyPurchaseModal({
  visible,
  onClose,
  onConfirm,
  loading,
  authError,
  notice,
  palette,
  ticketCount,
  discountedBundleCount,
  remainderTicketCount,
  ticketPrice,
  ticketUsageItems,
  targetOptions,
  selectedTargetSlug,
  selectedTargetLabel,
  currentStoredTicketCount,
  onSelectTarget,
}: TicketOnlyPurchaseModalProps) {
  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="티켓 전용 결제 확인 팝업 닫기"
          style={[
            styles.backdrop,
            {
              backgroundColor: palette.background,
              opacity: 0.78,
            },
          ]}
          onPress={onClose}
        />
        <View
          style={[
            styles.card,
            {
              backgroundColor: palette.surface,
              borderColor: palette.cardBorder,
            },
          ]}
        >
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <AppText variant="title" style={styles.title}>
              티켓 전용 결제 확인
            </AppText>
            <AppText variant="muted" style={styles.description}>
              이 창은 추가 티켓만 먼저 결제하려는 경우를 위한 확인 단계입니다. 실제
              결제는 아직 연결하지 않았고, 현재는 금액과 사용 범위만 확인할 수 있습니다.
            </AppText>

            <View style={styles.summaryRow}>
              <AppText style={styles.summaryLabel}>티켓 수량</AppText>
              <AppText style={styles.summaryValue}>{ticketCount}장</AppText>
            </View>
            <View style={styles.summaryRow}>
              <AppText style={styles.summaryLabel}>3장 할인 묶음</AppText>
              <AppText style={styles.summaryValue}>{discountedBundleCount}개</AppText>
            </View>
            <View style={styles.summaryRow}>
              <AppText style={styles.summaryLabel}>낱장 계산</AppText>
              <AppText style={styles.summaryValue}>{remainderTicketCount}장</AppText>
            </View>
            <View style={styles.summaryRow}>
              <AppText style={styles.summaryLabel}>티켓 결제 예정 금액</AppText>
              <AppText variant="display" style={styles.totalLabel}>
                {formatPrice(ticketPrice)}
              </AppText>
            </View>
            <View style={styles.summaryRow}>
              <AppText style={styles.summaryLabel}>적립 대상</AppText>
              <AppText style={styles.summaryValue}>{selectedTargetLabel}</AppText>
            </View>
            <View style={styles.summaryRow}>
              <AppText style={styles.summaryLabel}>현재 보유 티켓</AppText>
              <AppText style={styles.summaryValue}>{currentStoredTicketCount}장</AppText>
            </View>

            {targetOptions.length > 1 ? (
              <View style={styles.actionColumn}>
                <AppText variant="caption" style={styles.summaryLabel}>
                  티켓 적립 대상 선택
                </AppText>
                <View style={styles.chipRow}>
                  {targetOptions.map((item) => (
                    <ChoiceChip
                      key={`ticket-target-${item.slug}`}
                      label={item.displayName}
                      selected={selectedTargetSlug === item.slug}
                      onPress={() => onSelectTarget(item.slug)}
                    />
                  ))}
                </View>
                <AppText variant="muted" style={styles.helperText}>
                  선택한 청첩장에 티켓이 적립되고, 운영 탭에서도 같은 수량을 바로 확인할
                  수 있습니다.
                </AppText>
              </View>
            ) : null}

            <BulletList items={ticketUsageItems} />

            {notice ? (
              <View
                style={[
                  styles.noticeBox,
                  {
                    backgroundColor: palette.noticeSoft,
                    borderColor: palette.notice,
                  },
                ]}
              >
                <AppText variant="caption" color={palette.notice} style={styles.noticeText}>
                  {notice}
                </AppText>
              </View>
            ) : null}

            {authError ? (
              <View
                style={[
                  styles.noticeBox,
                  {
                    backgroundColor: palette.dangerSoft,
                    borderColor: palette.danger,
                  },
                ]}
              >
                <AppText variant="caption" color={palette.danger} style={styles.noticeText}>
                  {authError}
                </AppText>
              </View>
            ) : null}

            <View style={styles.actionColumn}>
              <ActionButton variant="secondary" onPress={onClose} fullWidth>
                다시 확인하기
              </ActionButton>
              <ActionButton onPress={onConfirm} loading={loading} fullWidth>
                티켓 전용 결제 확인
              </ActionButton>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  card: {
    maxHeight: '88%',
    borderWidth: 1,
    borderRadius: 28,
    padding: 20,
    gap: 14,
  },
  scroll: {
    flexGrow: 0,
  },
  scrollContent: {
    gap: 14,
    paddingBottom: 2,
  },
  title: {
    fontWeight: '800',
  },
  description: {
    lineHeight: 21,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 16,
  },
  summaryLabel: {
    lineHeight: 20,
  },
  summaryValue: {
    flexShrink: 1,
    textAlign: 'right',
    fontWeight: '700',
  },
  totalLabel: {
    fontWeight: '800',
  },
  actionColumn: {
    gap: 10,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  helperText: {
    lineHeight: 21,
  },
  noticeBox: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 6,
  },
  noticeText: {
    lineHeight: 19,
    fontWeight: '600',
  },
});
