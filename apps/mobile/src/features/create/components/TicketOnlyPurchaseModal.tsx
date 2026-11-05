import { StyleSheet, View } from 'react-native';

import { ActionButton } from '../../../components/ActionButton';
import { AppModalFrame } from '../../../components/AppModalFrame';
import { AppText } from '../../../components/AppText';
import { BulletList } from '../../../components/BulletList';
import { ChoiceChip } from '../../../components/ChoiceChip';
import { ModalActionStack, ModalFeedback, ModalSummaryRow } from '../../../components/ModalPrimitives';
import type { getPalette } from '../../../constants/theme';
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
  pendingTarget: string;
  onRecover: () => void;
  palette: ReturnType<typeof getPalette>;
  ticketCount: number;
  ticketUnitPrice: number;
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
  pendingTarget,
  onRecover,
  palette,
  ticketCount,
  ticketUnitPrice,
  ticketPrice,
  ticketUsageItems,
  targetOptions,
  selectedTargetSlug,
  selectedTargetLabel,
  currentStoredTicketCount,
  onSelectTarget,
}: TicketOnlyPurchaseModalProps) {
  return (
    <AppModalFrame
      visible={visible}
      onClose={onClose}
      title="티켓 Google Play 결제"
      description="구매 수량과 적립할 청첩장을 확인해 주세요."
      placement="center"
      palette={palette}
      closeDisabled={loading}
      contentDisabled={loading}
      footer={(
        <ModalActionStack>
          {pendingTarget ? (
            <ActionButton onPress={onRecover} loading={loading} fullWidth>
              티켓 결제 이어서 처리
            </ActionButton>
          ) : null}
          <ActionButton variant="secondary" onPress={onClose} disabled={loading} fullWidth>
            다시 확인하기
          </ActionButton>
          <ActionButton
            onPress={onConfirm}
            loading={loading}
            disabled={Boolean(pendingTarget)}
            fullWidth
          >
            Google Play로 티켓 구매
          </ActionButton>
        </ModalActionStack>
      )}
    >
      <View style={styles.summary}>
        <ModalSummaryRow label="티켓 수량" value={`${ticketCount}장`} palette={palette} />
        <ModalSummaryRow label="장당 금액" value={formatPrice(ticketUnitPrice)} palette={palette} />
        <ModalSummaryRow label="적립 대상" value={selectedTargetLabel} palette={palette} />
        <ModalSummaryRow label="현재 보유 티켓" value={`${currentStoredTicketCount}장`} palette={palette} />
        <ModalSummaryRow
          label="티켓 결제 예정 금액"
          value={formatPrice(ticketPrice)}
          palette={palette}
          total
        />
      </View>
      {targetOptions.length > 1 ? (
        <View style={styles.targetSection}>
          <AppText variant="caption" color={palette.textMuted}>
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
          <AppText variant="caption" color={palette.textMuted}>
            선택한 청첩장에 티켓이 적립되며, 내 청첩장에서도 보유 수량을 확인할 수 있습니다.
          </AppText>
        </View>
      ) : null}
      <BulletList items={ticketUsageItems} />
      {pendingTarget ? (
        <ModalFeedback palette={palette} tone="notice">
          기존 결제 대상: {pendingTarget}. 추가 결제 없이 기존 구매 티켓을 적립합니다.
        </ModalFeedback>
      ) : null}
      {notice ? <ModalFeedback palette={palette} tone="notice">{notice}</ModalFeedback> : null}
      {authError ? <ModalFeedback palette={palette} tone="error">{authError}</ModalFeedback> : null}
    </AppModalFrame>
  );
}

const styles = StyleSheet.create({
  summary: { gap: 14 },
  targetSection: { gap: 12 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
