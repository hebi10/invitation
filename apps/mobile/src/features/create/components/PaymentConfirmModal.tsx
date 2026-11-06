import { View, StyleSheet } from 'react-native';

import { AppModalFrame } from '../../../components/AppModalFrame';
import { ActionButton } from '../../../components/ActionButton';
import { AppText } from '../../../components/AppText';
import { ModalActionStack, ModalFeedback, ModalSummaryRow } from '../../../components/ModalPrimitives';
import type { getPalette } from '../../../constants/theme';
import { formatPrice } from '../../../lib/format';
import {
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
  return (
    <AppModalFrame
      visible={visible}
      onClose={onClose}
      title="Google Play 결제 확인"
      description={hasPendingPurchase
        ? '이전에 시작한 거래를 추가 결제 없이 완료합니다.'
        : '결제 내역을 확인한 뒤 구매해 주세요.'}
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
            {hasPendingPurchase ? '닫기' : '다시 확인하기'}
          </ActionButton>
        </ModalActionStack>
      )}
    >
      {hasPendingPurchase ? (
        <ModalFeedback palette={palette} tone="notice">
          미처리 결제가 있습니다. 새로 결제하지 말고 이전 거래를 먼저 이어서 처리해 주세요.
          복구 중에는 추가 결제를 요청하지 않습니다.
        </ModalFeedback>
      ) : null}
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
          label={hasPendingPurchase ? '기존 거래 금액' : '결제 예정 금액'}
          value={formatPrice(totalPrice)}
          palette={palette}
          total
        />
      </View>
      <AppText variant="caption" color={palette.textMuted}>
        결제가 확인되면 비공개 청첩장 초안이 생성됩니다. 신랑·신부 이름, 예식 정보와 사진은 이후 입력합니다.
        이용 기간은 실제 생성일부터 {INVITATION_INITIAL_DISPLAY_PERIOD_MONTHS}개월이며 제작 기간도 포함됩니다.
      </AppText>
      {hasPendingPurchase ? (
        <AppText variant="caption" color={palette.textMuted}>
          복구 대상: {recoverySummary}. 구매한 계정으로 이전 거래를 확인합니다.
        </AppText>
      ) : null}
      {notice ? <ModalFeedback palette={palette} tone="notice">{notice}</ModalFeedback> : null}
      {authError ? <ModalFeedback palette={palette} tone="error">{authError}</ModalFeedback> : null}
    </AppModalFrame>
  );
}

const styles = StyleSheet.create({
  summary: { gap: 10 },
});
