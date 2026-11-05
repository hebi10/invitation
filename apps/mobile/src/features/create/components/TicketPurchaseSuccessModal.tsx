import { StyleSheet, View } from 'react-native';

import { AppModalFrame } from '../../../components/AppModalFrame';
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
  onExtend: () => void;
  palette: ReturnType<typeof getPalette>;
  success: TicketPurchaseSuccessState | null;
};

export function TicketPurchaseSuccessModal({
  visible,
  onClose,
  onExtend,
  palette,
  success,
}: TicketPurchaseSuccessModalProps) {
  return (
    <AppModalFrame
    visible={visible}
    onClose={onClose}
    title="구매 완료됐습니다"
    description="선택한 청첩장에 티켓 적립이 정상적으로 완료되었습니다."
    placement="center"
    >
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

        <AppText variant="muted">티켓 구매만으로 이용 기간이 연장되지는 않습니다. 내 청첩장에서 티켓을 사용해 주세요.</AppText>
        <ActionButton onPress={onExtend} fullWidth>기간 연장하러 가기</ActionButton>
        <ActionButton onPress={onClose} variant="secondary" fullWidth>
          확인
        </ActionButton>
    </AppModalFrame>
  );
}

const styles = StyleSheet.create({
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
