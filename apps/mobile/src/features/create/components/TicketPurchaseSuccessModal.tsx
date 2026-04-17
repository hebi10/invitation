import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { getPalette } from '../../../constants/theme';
import { ActionButton } from '../../../components/ActionButton';
import { AppText } from '../../../components/AppText';

type TicketPurchaseSuccessState = {
  ticketCount: number;
  targetDisplayName: string;
  nextTicketCount: number;
};

type TicketPurchaseSuccessModalProps = {
  visible: boolean;
  onClose: () => void;
  palette: ReturnType<typeof getPalette>;
  success: TicketPurchaseSuccessState | null;
};

export function TicketPurchaseSuccessModal({
  visible,
  onClose,
  palette,
  success,
}: TicketPurchaseSuccessModalProps) {
  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="티켓 구매 완료 팝업 닫기"
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
          <View style={styles.content}>
            <AppText variant="title" style={styles.title}>
              구매 완료됐습니다
            </AppText>
            <AppText variant="muted" style={styles.description}>
              선택한 청첩장에 티켓 적립이 정상적으로 완료되었습니다.
            </AppText>

            <View style={styles.summaryRow}>
              <AppText style={styles.summaryLabel}>적립 대상</AppText>
              <AppText style={styles.summaryValue}>
                {success?.targetDisplayName ?? '-'}
              </AppText>
            </View>
            <View style={styles.summaryRow}>
              <AppText style={styles.summaryLabel}>구매한 티켓</AppText>
              <AppText style={styles.summaryValue}>{success?.ticketCount ?? 0}장</AppText>
            </View>
            <View style={styles.summaryRow}>
              <AppText style={styles.summaryLabel}>현재 보유 티켓</AppText>
              <AppText variant="display" color={palette.success} style={styles.totalLabel}>
                {success?.nextTicketCount ?? 0}장
              </AppText>
            </View>

            <ActionButton onPress={onClose} fullWidth>
              확인
            </ActionButton>
          </View>
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
    borderWidth: 1,
    borderRadius: 28,
    padding: 20,
    gap: 14,
  },
  content: {
    gap: 14,
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
});
