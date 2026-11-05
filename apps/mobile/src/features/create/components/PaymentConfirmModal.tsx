import { getInvitationDisplayPeriodEnd, INVITATION_INITIAL_DISPLAY_PERIOD_MONTHS } from '../../../lib/invitationProductPolicy';
import { StyleSheet, View } from 'react-native';

import { AppModalFrame } from '../../../components/AppModalFrame';
import { getPalette } from '../../../constants/theme';
import { ActionButton } from '../../../components/ActionButton';
import { AppText } from '../../../components/AppText';
import { formatPrice } from '../../../lib/format';

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
    title="Google Play 결제"
    description="Google Play 결제가 완료되면 청첩장이 생성됩니다. 완료 화면에서 제작을 시작할 수 있습니다."
    placement="center"
    >
        <View style={styles.summaryRow}>
          <AppText style={styles.summaryLabel}>서비스</AppText>
          <AppText style={styles.summaryValue}>{serviceName}</AppText>
        </View>
        <View style={styles.summaryRow}>
          <AppText style={styles.summaryLabel}>디자인</AppText>
          <AppText style={styles.summaryValue}>{selectedThemeLabel}</AppText>
        </View>
        <View style={styles.summaryRow}>
          <AppText style={styles.summaryLabel}>청첩장 주소</AppText>
          <AppText style={styles.summaryValue}>{slugPreview}</AppText>
        </View>
        <View style={styles.summaryRow}>
          <AppText style={styles.summaryLabel}>결제 예정 금액</AppText>
          <AppText variant="display" style={styles.totalLabel}>
            {formatPrice(totalPrice)}
          </AppText>
        </View>

        <AppText variant="caption">
          기본 이용 기간은 결제 후 청첩장 생성일부터 {INVITATION_INITIAL_DISPLAY_PERIOD_MONTHS}개월이며, 제작 중인 기간도 포함됩니다.
          오늘 생성 시 예상 종료일: {expectedEnd.toLocaleDateString('ko-KR')}.
          이후 티켓 1장(1,000원)으로 1개월씩 연장할 수 있습니다.
        </AppText>
        {notice ? <AppText accessibilityRole="alert" color={palette.danger}>{notice}</AppText> : null}

        {authError ? (
          <AppText variant="caption" color={palette.danger} style={styles.errorText}>
            {authError}
          </AppText>
        ) : null}

        <View style={styles.actionColumn}>
          {hasPendingPurchase ? <><AppText>기존 결제 대상: {recoverySummary}. 현재 입력 대신 이 내용으로 처리하며 추가 결제는 없습니다.</AppText><ActionButton onPress={onRecover} loading={loading} fullWidth>이전 결제 이어서 처리</ActionButton></> : null}
          <ActionButton variant="secondary" onPress={onClose} fullWidth>
            다시 확인하기
          </ActionButton>
          <ActionButton onPress={onConfirm} loading={loading} disabled={hasPendingPurchase} fullWidth>
            Google Play 결제 후 페이지 생성
          </ActionButton>
        </View>
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
  errorText: {
    lineHeight: 19,
    fontWeight: '600',
  },
  actionColumn: {
    gap: 10,
  },
});
