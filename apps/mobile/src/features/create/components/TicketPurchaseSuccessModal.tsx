import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';

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
              backgroundColor: '#111210',
              opacity: 0.58,
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
          <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
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
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    paddingVertical: 24,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  card: {
    maxHeight: '88%',
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
    borderWidth: 1,
    borderRadius: 0,
    padding: 16,
    gap: 16,
  },
  content: {
    gap: 16,
  },
  scroll: {
    flexGrow: 0,
  },
  title: {
    fontWeight: '500',
  },
  description: {
    lineHeight: 21,
  },
  summaryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 16,
  },
  summaryLabel: {
    flexShrink: 1,
    lineHeight: 22,
  },
  summaryValue: {
    flexShrink: 1,
    minWidth: 0,
    textAlign: 'right',
    fontWeight: '700',
  },
  totalLabel: {
    flexShrink: 1,
    textAlign: 'right',
    fontWeight: '700',
  },
});
