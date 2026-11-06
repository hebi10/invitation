import { View, StyleSheet } from 'react-native';

import { AppModalFrame } from '../../../components/AppModalFrame';
import { ActionButton } from '../../../components/ActionButton';
import { AppText } from '../../../components/AppText';
import { ModalActionStack, ModalFeedback, ModalSummaryRow } from '../../../components/ModalPrimitives';
import type { getPalette } from '../../../constants/theme';
import { formatPrice } from '../../../lib/format';
import {
  getInvitationDisplayPeriodEnd,
  INVITATION_INITIAL_DISPLAY_PERIOD_MONTHS,
} from '../../../lib/invitationProductPolicy';

type PaymentConfirmModalProps = {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
  loading: boolean;
  authError: string | null;
  notice: string;
  hasPendingPurchase: boolean;
  recoverySummary: string;
  onRecover: () => void;
  palette: ReturnType<typeof getPalette>;
  serviceName: string;
  selectedThemeLabel: string;
  slugPreview: string;
  totalPrice: number;
};

export function PaymentConfirmModal({
  visible,
  onClose,
  onConfirm,
  loading,
  authError,
  notice,
  hasPendingPurchase,
  recoverySummary,
  onRecover,
  palette,
  serviceName,
  selectedThemeLabel,
  slugPreview,
  totalPrice,
}: PaymentConfirmModalProps) {
  const expectedEnd = getInvitationDisplayPeriodEnd(new Date());

  return (
    <AppModalFrame
      visible={visible}
      onClose={onClose}
      title="Google Play 결제 확인"
      description="결제 완료 후 청첩장이 생성됩니다."
      placement="center"
      palette={palette}
      closeDisabled={loading}
      footer={(
        <ModalActionStack>
          {hasPendingPurchase ? (
            <ActionButton onPress={onRecover} loading={loading} fullWidth>
              이전 결제 이어서 처리
            </ActionButton>
          ) : null}
          {!hasPendingPurchase ? (
            <ActionButton onPress={onConfirm} loading={loading} fullWidth>
              5,000원 결제하기
            </ActionButton>
          ) : null}
          <ActionButton variant="secondary" onPress={onClose} disabled={loading} fullWidth>
            다시 확인하기
          </ActionButton>
        </ModalActionStack>
      )}
    >
      <View style={styles.summary}>
        <ModalSummaryRow label="상품" value={serviceName} palette={palette} />
        <ModalSummaryRow label="구성" value={selectedThemeLabel} palette={palette} />
        <ModalSummaryRow
          label="이용 기간"
          value={`생성일부터 ${INVITATION_INITIAL_DISPLAY_PERIOD_MONTHS}개월`}
          palette={palette}
        />
        <ModalSummaryRow label="청첩장 주소" value={slugPreview} palette={palette} />
        <ModalSummaryRow
          label="결제 예정 금액"
          value={formatPrice(totalPrice)}
          palette={palette}
          total
        />
      </View>
      <AppText variant="caption" color={palette.textMuted}>
        결제 완료 시 비공개 초안이 생성되며 예식 정보와 사진은 이후 입력합니다.
        이용 기간은 생성일부터 {INVITATION_INITIAL_DISPLAY_PERIOD_MONTHS}개월이고, 예상 종료일은 {expectedEnd.toLocaleDateString('ko-KR')}입니다.
      </AppText>
      {hasPendingPurchase ? (
        <ModalFeedback palette={palette} tone="notice">
          기존 결제 대상: {recoverySummary}. 현재 입력 대신 이전 결제 내용으로 처리하며
          추가 결제는 없습니다.
        </ModalFeedback>
      ) : null}
      {notice ? <ModalFeedback palette={palette} tone="notice">{notice}</ModalFeedback> : null}
      {authError ? <ModalFeedback palette={palette} tone="error">{authError}</ModalFeedback> : null}
    </AppModalFrame>
  );
}

const styles = StyleSheet.create({
  summary: { gap: 10 },
});
