import { StyleSheet, View } from 'react-native';

import { ActionButton } from '../../../components/ActionButton';
import { AppModalFrame } from '../../../components/AppModalFrame';
import { AppText } from '../../../components/AppText';
import { ModalActionStack, ModalSummaryRow } from '../../../components/ModalPrimitives';
import type { getPalette } from '../../../constants/theme';

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
      description="선택한 청첩장에 구매한 티켓이 적립되었습니다."
      placement="center"
      palette={palette}
      footer={(
        <ModalActionStack>
          <ActionButton onPress={onExtend} fullWidth>기간 연장하러 가기</ActionButton>
          <ActionButton onPress={onClose} variant="secondary" fullWidth>확인</ActionButton>
        </ModalActionStack>
      )}
    >
      <View style={styles.summary}>
        <ModalSummaryRow label="적립 대상" value={success?.targetDisplayName ?? '-'} palette={palette} />
        <ModalSummaryRow label="구매한 티켓" value={`${success?.ticketCount ?? 0}장`} palette={palette} />
        <ModalSummaryRow
          label="현재 보유 티켓"
          value={`${success?.nextTicketCount ?? 0}장`}
          palette={palette}
          total
        />
      </View>
      <AppText variant="caption" color={palette.textMuted}>
        티켓 구매만으로 이용 기간이 연장되지는 않습니다.
        내 청첩장에서 티켓을 사용해 주세요.
      </AppText>
    </AppModalFrame>
  );
}

const styles = StyleSheet.create({
  summary: { gap: 14 },
});
